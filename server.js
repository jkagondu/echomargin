const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DERIV_APP_ID = process.env.DERIV_APP_ID || '1089';

// Simple in-memory session store (SessionID -> SessionData)
// In production, use Redis or a database session store
const sessions = new Map();

// Helper to parse cookies from headers
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// 1. POST /api/auth/login
// Receives the OAuth parameters returned from Deriv and creates a secure session
app.post('/api/auth/login', (req, res) => {
  const { accounts } = req.body; // Array of { accountId, token, currency }
  
  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid accounts array' });
  }

  // Create a unique session ID
  const sessionId = crypto.randomUUID();
  
  // Store session with the active account initialized as the first account
  sessions.set(sessionId, {
    accounts,
    activeAccountId: accounts[0].accountId,
    createdAt: Date.now()
  });

  // Set secure HttpOnly cookie containing the session ID
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  console.log(`[AUTH] Session created for account ${accounts[0].accountId}`);
  return res.json({
    success: true,
    activeAccount: {
      accountId: accounts[0].accountId,
      currency: accounts[0].currency
    },
    accounts: accounts.map(acc => ({ accountId: acc.accountId, currency: acc.currency }))
  });
});

// 2. GET /api/auth/session
// Checks current session and returns active account details (without exposing tokens)
app.get('/api/auth/session', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['session_id'];

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ authenticated: false, error: 'Unauthorized session' });
  }

  const session = sessions.get(sessionId);
  const activeAcc = session.accounts.find(a => a.accountId === session.activeAccountId);

  return res.json({
    authenticated: true,
    activeAccount: {
      accountId: activeAcc.accountId,
      currency: activeAcc.currency
    },
    accounts: session.accounts.map(acc => ({ accountId: acc.accountId, currency: acc.currency }))
  });
});

// 3. POST /api/auth/select-account
// Switch the active account in the session
app.post('/api/auth/select-account', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['session_id'];
  const { accountId } = req.body;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = sessions.get(sessionId);
  const exists = session.accounts.some(a => a.accountId === accountId);

  if (!exists) {
    return res.status(400).json({ error: 'Account not found in session' });
  }

  session.activeAccountId = accountId;
  sessions.set(sessionId, session);

  console.log(`[AUTH] Switched active account to ${accountId}`);
  const activeAcc = session.accounts.find(a => a.accountId === accountId);
  return res.json({
    success: true,
    activeAccount: {
      accountId: activeAcc.accountId,
      currency: activeAcc.currency
    }
  });
});

// 4. POST /api/auth/logout
// Clear the session
app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['session_id'];

  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.clearCookie('session_id');
  return res.json({ success: true });
});

// Database layer for copy links
const db = require('./database');

// 5. POST /api/copy-links
// Saves a copy link configuration to the database
app.post('/api/copy-links', async (req, res) => {
  const { masterId, copyRatio, maxAllocation, copierAccountId } = req.body;

  if (!masterId) {
    return res.status(400).json({ error: 'Master ID is required' });
  }

  const id = crypto.randomBytes(8).toString('hex'); // Generate unique ID
  
  const newLink = {
    id,
    masterId,
    copyRatio: parseFloat(copyRatio) || 1.0,
    maxAllocation: parseFloat(maxAllocation) || 200,
    copierAccountId: copierAccountId || 'unknown',
    createdAt: Date.now()
  };

  const success = await db.writeCopyLink(newLink);
  if (!success) {
    return res.status(500).json({ error: 'Failed to write to database' });
  }

  console.log(`[DB] Saved new copy link: ${id} for Master ID: ${masterId}`);
  return res.json({
    success: true,
    link: newLink,
    sharingUrl: `${FRONTEND_URL}/?copyId=${id}`
  });
});

// 6. GET /api/copy-links/:id
// Retrieves a copy link configuration by its ID
app.get('/api/copy-links/:id', async (req, res) => {
  const { id } = req.params;
  const found = await db.findCopyLink(id);

  if (!found) {
    return res.status(404).json({ error: 'Copy link configuration not found' });
  }

  return res.json({ success: true, link: found });
});

// 7. GET /api/copy-links
// Retrieves all copy links
app.get('/api/copy-links', async (req, res) => {
  const links = await db.readCopyLinks();
  return res.json({ success: true, links });
});

// Integrate WebSocket Server
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws') {
    const cookies = parseCookies(request.headers.cookie);
    const sessionId = cookies['session_id'];

    if (!sessionId || !sessions.has(sessionId)) {
      console.log('[WS BRIDGE] Upgrade rejected: Invalid session');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, sessionId);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs, req, sessionId) => {
  console.log(`[WS BRIDGE] Client connected with session: ${sessionId}`);
  
  const session = sessions.get(sessionId);
  if (!session) {
    clientWs.close(4001, 'Session not found');
    return;
  }

  const activeAcc = session.accounts.find(a => a.accountId === session.activeAccountId);
  if (!activeAcc || !activeAcc.token) {
    clientWs.close(4002, 'No authorized token for active account');
    return;
  }

  // Connect to Deriv's official WebSocket API
  const derivWsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
  console.log(`[WS BRIDGE] Connecting to Deriv WS at ${derivWsUrl}`);
  
  const derivWs = new WebSocket(derivWsUrl);
  let isAuthorized = false;
  let messageQueue = [];

  derivWs.on('open', () => {
    console.log(`[WS BRIDGE] Connected to Deriv WS. Sending authorization token for ${activeAcc.accountId}`);
    // Automatically authorize using the token stored in session
    derivWs.send(JSON.stringify({ authorize: activeAcc.token }));
  });

  derivWs.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      
      // Intercept the authorize response to flag connection as authenticated
      if (response.msg_type === 'authorize') {
        if (response.error) {
          console.error('[WS BRIDGE] Authorization failed:', response.error.message);
          clientWs.send(JSON.stringify({
            msg_type: 'authorize',
            error: { message: 'Failed to authorize with Deriv: ' + response.error.message }
          }));
          clientWs.close(4003, 'Deriv auth failed');
          return;
        } else {
          console.log('[WS BRIDGE] Authorization successful!');
          isAuthorized = true;
          
          // Forward original Deriv response (with balance, login_info, etc.)
          clientWs.send(data.toString());

          // Flush any messages sent by client while authorizing
          while (messageQueue.length > 0) {
            const msg = messageQueue.shift();
            derivWs.send(msg);
          }
          return;
        }
      }

      // Forward all other Deriv responses to the client
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data.toString());
      }
    } catch (err) {
      console.error('[WS BRIDGE] Error parsing Deriv message:', err);
    }
  });

  derivWs.on('close', (code, reason) => {
    console.log(`[WS BRIDGE] Deriv connection closed. Code: ${code}, Reason: ${reason}`);
    clientWs.close(code || 1000, reason || 'Deriv closed connection');
  });

  derivWs.on('error', (error) => {
    console.error('[WS BRIDGE] Deriv WebSocket error:', error);
    clientWs.send(JSON.stringify({ error: 'Deriv WebSocket server connection error' }));
    clientWs.close(1011, 'Deriv connection error');
  });

  // Client messages
  clientWs.on('message', (message) => {
    if (derivWs.readyState !== WebSocket.OPEN) {
      console.log('[WS BRIDGE] Deriv WS not ready. Queueing client message.');
      messageQueue.push(message.toString());
      return;
    }

    try {
      const parsed = JSON.parse(message.toString());
      // Prevent client from manually calling authorize, since we handle it server-side
      if (parsed.authorize) {
        console.log('[WS BRIDGE] Client tried to authorize manually. Ignored.');
        return;
      }
      
      derivWs.send(message.toString());
    } catch (err) {
      console.error('[WS BRIDGE] Invalid JSON from client:', err);
    }
  });

  clientWs.on('close', (code, reason) => {
    console.log(`[WS BRIDGE] Client connection closed. Code: ${code}`);
    if (derivWs.readyState === WebSocket.OPEN || derivWs.readyState === WebSocket.CONNECTING) {
      derivWs.close();
    }
  });

  clientWs.on('error', (err) => {
    console.error('[WS BRIDGE] Client WebSocket error:', err);
    if (derivWs.readyState === WebSocket.OPEN || derivWs.readyState === WebSocket.CONNECTING) {
      derivWs.close();
    }
  });
});

// Start express server
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`EchoMargin Backend is running at http://localhost:${PORT}`);
  console.log(`WebSocket path: ws://localhost:${PORT}/ws`);
  console.log(`===============================================`);
});
