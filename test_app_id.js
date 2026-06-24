const WebSocket = require('ws');

// Test the alphanumeric App ID on the WebSocket
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=33nlevTU3BgvBLPY6vMVb');

ws.on('open', () => {
    console.log('Connected to Deriv! Sending ping...');
    ws.send(JSON.stringify({ ping: 1 }));
});

ws.on('message', (data) => {
    console.log('Response from Deriv:', data.toString());
    ws.close();
});

ws.on('error', (err) => {
    console.log('Error connecting to Deriv:', err.message);
});

