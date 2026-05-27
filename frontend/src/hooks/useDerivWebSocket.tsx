"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface DerivWebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  authorized: boolean;
  balance: number | null;
  activeAccount: { accountId: string; currency: string } | null;
  accountsList: { accountId: string; currency: string }[];
  activeTick: any;
  sendRequest: (payload: any) => Promise<any>;
  subscribeTicks: (symbol: string, callback: (tick: any) => void) => Promise<string>;
  unsubscribeTicks: (symbol: string) => Promise<void>;
  subscribeContract: (contractId: string, callback: (contract: any) => void) => void;
  unsubscribeContract: (contractId: string) => void;
  switchAccount: (accountId: string) => Promise<void>;
  logout: () => Promise<void>;
  wsLogs: { id: string; type: 'send' | 'recv'; content: string; timestamp: number }[];
}

const DerivWebSocketContext = createContext<DerivWebSocketContextType | null>(null);

export function DerivWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [activeAccount, setActiveAccount] = useState<{ accountId: string; currency: string } | null>(null);
  const [accountsList, setAccountsList] = useState<{ accountId: string; currency: string }[]>([]);
  const [activeTick, setActiveTick] = useState<any>(null);
  const [wsLogs, setWsLogs] = useState<{ id: string; type: 'send' | 'recv'; content: string; timestamp: number }[]>([]);

  const addLog = useCallback((type: 'send' | 'recv', content: string) => {
    setWsLogs(prev => {
      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        content,
        timestamp: Date.now()
      };
      const updated = [newLog, ...prev];
      if (updated.length > 50) updated.pop();
      return updated;
    });
  }, []);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelay = useRef<number>(1000); // Start with 1s reconnect delay
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Track pending promises for req_id matching
  const reqIdCounter = useRef<number>(0);
  const pendingRequests = useRef<Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timeout: NodeJS.Timeout }>>(new Map());

  // Track active tick callbacks and sub IDs
  const tickCallbacks = useRef<Map<string, Set<(tick: any) => void>>>(new Map());
  const symbolToSubId = useRef<Map<string, string>>(new Map()); // symbol -> subscription_id
  // Track contract subscription callbacks
  const contractCallbacks = useRef<Map<string, (contract: any) => void>>(new Map());

  // 1. Fetch current session details from Express backend
  const fetchSession = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/auth/session`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setActiveAccount(data.activeAccount);
          setAccountsList(data.accounts);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('[WS CONTEXT] Error fetching session:', err);
      return false;
    }
  };

  // 2. Connect to the Backend WebSocket Proxy
  const connect = useCallback(async () => {
    // Clear existing intervals/timeouts
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (pingInterval.current) clearInterval(pingInterval.current);
    
    const hasSession = await fetchSession();
    if (!hasSession) {
      console.log('[WS CONTEXT] No active session found. Skipping connection.');
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    // Replace http/https with ws/wss
    const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws';
    
    console.log(`[WS CONTEXT] Connecting to proxy at ${wsUrl}`);
    
    try {
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('[WS CONTEXT] WebSocket Connection established with proxy.');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectDelay.current = 1000; // Reset reconnect delay on success
        
        // Start ping/pong heartbeat every 30s
        pingInterval.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ ping: 1 }));
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const rawData = event.data.toString();
          addLog('recv', rawData);
          const response = JSON.parse(rawData);

          // Handle heartbeat pings
          if (response.msg_type === 'ping') {
            return;
          }

          // Handle authorization response
          if (response.msg_type === 'authorize') {
            if (response.error) {
              console.error('[WS CONTEXT] Authorization error:', response.error.message);
              setConnectionError(response.error.message);
              setAuthorized(false);
            } else {
              console.log('[WS CONTEXT] Authorized. User info:', response.authorize);
              setAuthorized(true);
              setBalance(parseFloat(response.authorize.balance));
              setActiveAccount({
                accountId: response.authorize.loginid,
                currency: response.authorize.currency,
              });
            }
          }

          // Handle balance update stream
          if (response.msg_type === 'balance') {
            if (!response.error && response.balance) {
              setBalance(parseFloat(response.balance.balance));
            }
          }

          // Handle tick streams
          if (response.msg_type === 'tick') {
            const tick = response.tick;
            if (tick) {
              const symbol = tick.symbol;
              setActiveTick(tick);
              const callbacks = tickCallbacks.current.get(symbol);
              if (callbacks) {
                callbacks.forEach(cb => cb(tick));
              }
            }
          }

          // Handle contract streams
          if (response.msg_type === 'proposal_open_contract') {
            const contract = response.proposal_open_contract;
            if (contract) {
              const contractId = String(contract.contract_id);
              const cb = contractCallbacks.current.get(contractId);
              if (cb) cb(contract);
            }
          }

          // Resolve pending request promises using req_id
          if (response.req_id) {
            const pending = pendingRequests.current.get(response.req_id);
            if (pending) {
              const { resolve, reject, timeout } = pending;
              clearTimeout(timeout);
              pendingRequests.current.delete(response.req_id);
              if (response.error) {
                reject(response.error);
              } else {
                resolve(response);
              }
            }
          }

        } catch (err) {
          console.error('[WS CONTEXT] Error handling message:', err);
        }
      };

      socket.onclose = (event) => {
        console.log(`[WS CONTEXT] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        setAuthorized(false);
        setIsConnecting(false);

        // Don't auto-reconnect if it was normal closure or closed by logout
        if (event.code !== 1000 && event.code !== 1005) {
          triggerReconnect();
        }
      };

      socket.onerror = (err) => {
        console.error('[WS CONTEXT] WebSocket error:', err);
        setConnectionError('WebSocket server connection error');
        socket.close();
      };

    } catch (err: any) {
      console.error('[WS CONTEXT] Setup error:', err);
      setConnectionError(err.message || 'Setup error');
      triggerReconnect();
    }
  }, []);

  // Trigger reconnect with exponential backoff (capped at 30s)
  const triggerReconnect = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    
    console.log(`[WS CONTEXT] Attempting reconnect in ${reconnectDelay.current}ms...`);
    reconnectTimeout.current = setTimeout(() => {
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      connect();
    }, reconnectDelay.current);
  };

  // 3. Send arbitrary JSON request and wait for the response (matched by req_id)
  const sendRequest = (payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket connection is not open'));
      }

      reqIdCounter.current++;
      const req_id = reqIdCounter.current;
      const requestWithId = { ...payload, req_id };
      
      const rawPayload = JSON.stringify(requestWithId);
      addLog('send', rawPayload);

      // Set timeout for request (10 seconds)
      const timeout = setTimeout(() => {
        pendingRequests.current.delete(req_id);
        reject(new Error(`Request timeout for message type: ${payload.msg_type || 'unknown'}`));
      }, 10000);

      pendingRequests.current.set(req_id, { resolve, reject, timeout });
      ws.current.send(rawPayload);
    });
  };

  // 4. Subscribe to tick streams for a given symbol
  const subscribeTicks = async (symbol: string, callback: (tick: any) => void): Promise<string> => {
    // Add callback to the symbol registry
    let callbacks = tickCallbacks.current.get(symbol);
    if (!callbacks) {
      callbacks = new Set();
      tickCallbacks.current.set(symbol, callbacks);
    }
    callbacks.add(callback);

    // If we already have a subscription for this symbol, return it
    if (symbolToSubId.current.has(symbol)) {
      return symbolToSubId.current.get(symbol)!;
    }

    try {
      console.log(`[WS CONTEXT] Requesting subscription for ${symbol}`);
      const response = await sendRequest({
        ticks: symbol,
        subscribe: 1
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const subId = response.subscription?.id;
      if (subId) {
        symbolToSubId.current.set(symbol, subId);
        return subId;
      }
      throw new Error('Subscription ID not returned from Deriv');
    } catch (err) {
      // Clean up local registry if API request failed
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        tickCallbacks.current.delete(symbol);
      }
      throw err;
    }
  };

  // 5. Unsubscribe from ticks for a given symbol
  const unsubscribeTicks = async (symbol: string) => {
    const subId = symbolToSubId.current.get(symbol);
    if (!subId) return;

    console.log(`[WS CONTEXT] Unsubscribing from ${symbol} (Sub ID: ${subId})`);
    
    try {
      const response = await sendRequest({
        forget: subId
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      symbolToSubId.current.delete(symbol);
      tickCallbacks.current.delete(symbol);
      if (activeTick?.symbol === symbol) {
        setActiveTick(null);
      }
    } catch (err) {
      console.error(`[WS CONTEXT] Failed to unsubscribe from ${symbol}:`, err);
      // Even if API fails, clear locally to prevent leaks
      symbolToSubId.current.delete(symbol);
      tickCallbacks.current.delete(symbol);
    }
  };

  // 6. Switch the active account
  const switchAccount = async (accountId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/auth/select-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to switch account');
      }

      console.log(`[WS CONTEXT] Account switched to ${accountId}. Reconnecting WS...`);
      // Close current socket, which triggers reconnect using new active account tokens
      if (ws.current) {
        ws.current.close(1000, 'Switching account');
      }
      // Instantly reconnect rather than waiting for auto-reconnect
      setTimeout(() => connect(), 200);

    } catch (err) {
      console.error('[WS CONTEXT] Error switching account:', err);
      throw err;
    }
  };

  // 7. Log out and clear session
  const logout = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('[WS CONTEXT] Error calling logout endpoint:', err);
    } finally {
      // Clear local states
      setIsConnected(false);
      setAuthorized(false);
      setBalance(null);
      setActiveAccount(null);
      setAccountsList([]);
      setActiveTick(null);
      
      // Close WebSocket explicitly
      if (ws.current) {
        ws.current.close(1000, 'User logout');
      }
    }
  };

  const subscribeContract = (contractId: string, callback: (contract: any) => void) => {
    contractCallbacks.current.set(contractId, callback);
  };

  const unsubscribeContract = (contractId: string) => {
    contractCallbacks.current.delete(contractId);
  };

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close(1000, 'App component unmounted');
      }
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
    };
  }, [connect]);

  return (
    <DerivWebSocketContext.Provider
      value={{
        isConnected,
        isConnecting,
        connectionError,
        authorized,
        balance,
        activeAccount,
        accountsList,
        activeTick,
        sendRequest,
        subscribeTicks,
        unsubscribeTicks,
        subscribeContract,
        unsubscribeContract,
        switchAccount,
        logout,
        wsLogs,
      }}
    >
      {children}
    </DerivWebSocketContext.Provider>
  );
}

export function useDerivWebSocket() {
  const context = useContext(DerivWebSocketContext);
  if (!context) {
    throw new Error('useDerivWebSocket must be used within a DerivWebSocketProvider');
  }
  return context;
}
