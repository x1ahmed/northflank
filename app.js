const net = require('net');
const http = require('http'); // Import http module for serving the home page
const { WebSocket, createWebSocketStream } = require('ws');
const { TextDecoder } = require('util');

// Helper functions for logging
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);

// Configuration for the VLESS proxy
// The UUID can be set via environment variable or defaults to a specific value
const uuid = (process.env.UUID || 'd342d11e-d424-4583-b36e-524ab1f0afa4').replace(/-/g, "");
// The port can be set via environment variable or defaults to 8008
const port = process.env.PORT || 8080;

// Create an HTTP server to handle both web page requests and WebSocket upgrades
const server = http.createServer((req, res) => {
    // Serve the home page for GET requests to the root path
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        // HTML content for the home page, styled with Tailwind CSS
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>VLESS Proxy Server</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    /* Custom font for better aesthetics */
                    body {
                        font-family: 'Inter', sans-serif;
                    }
                </style>
            </head>
            <body class="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center p-4">
                <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">VLESS Proxy</h1>
                    <p class="text-lg text-gray-600 mb-6">
                        Your secure and efficient proxy server is running.
                    </p>
                    <div class="bg-gray-100 p-6 rounded-md mb-6">
                        <h2 class="text-xl font-semibold text-gray-700 mb-3">Configuration Details:</h2>
                        <div class="text-left text-gray-700">
                            <p class="mb-2"><strong>UUID:</strong> <code class="bg-gray-200 px-2 py-1 rounded text-sm break-all">${uuid}</code></p>
                            <p class="mb-2"><strong>Port:</strong> <code class="bg-gray-200 px-2 py-1 rounded text-sm">${port}</code></p>
                            <p class="text-sm text-gray-500 mt-4">
                                Use these details to configure your VLESS client.
                            </p>
                        </div>
                    </div>
                    <p class="text-md text-gray-700">
                        For more information on VLESS clients and setup, please refer to the documentation.
                    </p>
                </div>
            </body>
            </html>
        `);
    } else {
        // For any other HTTP requests, return a 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Create a WebSocket server instance, attaching it to the HTTP server
const wss = new WebSocket.Server({ noServer: true });

// Listen for the 'upgrade' event from the HTTP server to handle WebSocket connections
server.on('upgrade', (request, socket, head) => {
    // Handle WebSocket upgrade requests. The VLESS protocol validation happens
    // within the ws.once('message') handler, so we don't need a specific
    // 'sec-websocket-protocol' check here.
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});

// WebSocket server connection handling logic (original VLESS proxy logic)
wss.on('connection', ws => {
    console.log("on connection");
    ws.once('message', msg => {
        const [VERSION] = msg; // Get the VLESS version
        const id = msg.slice(1, 17); // Extract the UUID from the message

        // Validate the UUID received from the client against the server's UUID
        if (!id.every((v, i) => v === parseInt(uuid.substr(i * 2, 2), 16))) {
            console.log("UUID mismatch. Connection rejected.");
            ws.close(); // Close the connection if UUID doesn't match
            return;
        }

        let i = msg.slice(17, 18).readUInt8() + 19; // Get the address type (ATYP) offset
        const port = msg.slice(i, i += 2).readUInt16BE(0); // Extract the target port
        const ATYP = msg.slice(i, i += 1).readUInt8(); // Extract the address type

        let host;
        // Parse the target host based on ATYP
        if (ATYP === 1) { // IPv4
            host = msg.slice(i, i += 4).join('.');
        } else if (ATYP === 2) { // Domain name
            host = new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8()));
        } else if (ATYP === 3) { // IPv6
            host = msg.slice(i, i += 16).reduce((s, b, idx, arr) => (idx % 2 ? s.concat(arr.slice(idx - 1, idx + 1)) : s), [])
                .map(b => b.readUInt16BE(0).toString(16))
                .join(':');
        } else {
            console.log("Unsupported ATYP:", ATYP);
            ws.close();
            return;
        }

        logcb('conn:', host, port); // Log the connection details

        // Send a success response to the client
        ws.send(new Uint8Array([VERSION, 0]));

        // Create a duplex stream from the WebSocket for piping data
        const duplex = createWebSocketStream(ws);

        // Connect to the target host and port
        net.connect({ host, port }, function () {
            // Write the remaining part of the client's initial message to the target
            this.write(msg.slice(i));
            // Pipe data between the WebSocket and the target connection
            duplex.on('error', errcb('E1:')).pipe(this).on('error', errcb('E2:')).pipe(duplex);
        }).on('error', errcb('Conn-Err:', { host, port })); // Handle connection errors to the target
    }).on('error', errcb('EE:')); // Handle errors on the WebSocket message
});

// Start the HTTP server listening on the specified port
server.listen(port, () => {
    logcb('Server listening on port:', port);
    logcb('VLESS Proxy UUID:', uuid);
    logcb('Access home page at: http://localhost:' + port);
});

// Handle server errors
server.on('error', err => {
    errcb('Server Error:', err);
});
