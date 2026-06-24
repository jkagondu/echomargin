const WebSocket = require('ws');

// Test with Deriv's own App ID (1089)
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
    console.log('Connected with 1089! Sending ping...');
    ws.send(JSON.stringify({ ping: 1 }));
});

ws.on('message', (data) => {
    console.log('Response with 1089:', data.toString());
    ws.close();
});

ws.on('error', (err) => {
    console.log('Error with 1089:', err.message);
});
