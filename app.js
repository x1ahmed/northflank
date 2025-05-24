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

// Derive the public host from environment variable or assume localhost if not set
// In a production environment, set PUBLIC_HOST to your domain/IP
const publicHost = process.env.PUBLIC_HOST || 'localhost'; 

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
                    /* Styles for the modal backdrop */
                    .modal-backdrop {
                        background-color: rgba(0, 0, 0, 0.5);
                        z-index: 999; /* Ensure it's on top */
                    }
                    /* Styles for the modal content */
                    .modal-content {
                        z-index: 1000; /* Ensure it's on top of the backdrop */
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
                        <h2 class="text-xl font-semibold text-gray-700 mb-3">Server Status: Online</h2>
                        <div class="text-left text-gray-700">
                            <p class="text-sm text-gray-500 mt-4">
                                Click the button below to get your VLESS configuration details.
                            </p>
                        </div>
                    </div>
                    <button id="getConfigBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75">
                        Get My VLESS Config
                    </button>
                    <p class="text-md text-gray-700 mt-6">
                        For more information on VLESS clients and setup, please refer to the documentation.
                    </p>
                </div>

                <div id="vlessConfigModal" class="fixed inset-0 hidden items-center justify-center modal-backdrop">
                    <div class="bg-white p-8 rounded-lg shadow-xl max-w-xl w-full modal-content relative"> 
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Your VLESS Configuration</h2>
                        <div class="bg-gray-100 p-4 rounded-md mb-4 text-left">
                            <p class="mb-2"><strong>UUID:</strong> <span id="modalUuid" class="break-all font-mono text-sm"></span></p>
                            <p class="mb-2"><strong>Port:</strong> <span id="modalPort" class="font-mono text-sm"></span></p>
                            <p class="mb-2"><strong>Host:</strong> <span id="modalHost" class="font-mono text-sm"></span></p>
                            <textarea id="vlessUri" class="w-full h-32 p-2 mt-4 border rounded-md resize-none bg-gray-50 text-gray-700 font-mono text-sm" readonly></textarea> 
                            <div id="loadingMessage" class="text-sm text-blue-600 mt-2 hidden">Generating URI...</div>
                        </div>
                        <button id="copyConfigBtn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 mr-2">
                            Copy URI
                        </button>
                        <button id="closeModalBtn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75">
                            Close
                        </button>
                        <div id="copyMessage" class="text-sm text-green-600 mt-2 hidden">Copied to clipboard!</div>
                        <div id="errorMessage" class="text-sm text-red-600 mt-2 hidden">Failed to get VLESS URI.</div>
                    </div>
                </div>

                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const getConfigBtn = document.getElementById('getConfigBtn');
                        const vlessConfigModal = document.getElementById('vlessConfigModal');
                        const closeModalBtn = document.getElementById('closeModalBtn');
                        const copyConfigBtn = document.getElementById('copyConfigBtn');
                        const modalUuid = document.getElementById('modalUuid');
                        const modalPort = document.getElementById('modalPort');
                        const modalHost = document.getElementById('modalHost');
                        const vlessUri = document.getElementById('vlessUri');
                        const copyMessage = document.getElementById('copyMessage');
                        const loadingMessage = document.getElementById('loadingMessage');
                        const errorMessage = document.getElementById('errorMessage');

                        // Get UUID and Port from the server-side rendered HTML
                        const serverUuid = "${uuid}";
                        // VLESS typically runs on 443 with TLS over WebSocket
                        // If your server listens on a different port for VLESS/WS, adjust this.
                        const serverPort = "443"; 
                        // Use the public host passed from the server-side
                        const serverHost = "${publicHost}"; 

                        getConfigBtn.addEventListener('click', async () => { // Make the event listener async
                            // Reset messages
                            copyMessage.classList.add('hidden');
                            errorMessage.classList.add('hidden');
                            loadingMessage.classList.remove('hidden'); // Show loading message

                            // Populate modal with config details
                            modalUuid.textContent = serverUuid;
                            modalPort.textContent = serverPort;
                            modalHost.textContent = serverHost;
                            vlessUri.value = 'Loading VLESS URI...'; // Set placeholder text

                            // Construct a basic VLESS URI to send to the Deno service
                            // Ensure all query parameters are URL-encoded
                            const baseUri = `vless://${serverUuid}@${serverHost}:${serverPort}?security=tls&fp=randomized&type=ws&host=${encodeURIComponent(serverHost)}&encryption=none#NFBy-ModsBots`;
                            
                            let finalUri = baseUri; // Default to baseUri if fetch fails
                            try {
                                // Fetch the "checked" URI from the Deno service
                                // Assume the Deno service returns the final URI as plain text
                                const response = await fetch(`https://deno-proxy-version.deno.dev/?check=${encodeURIComponent(baseUri)}`);
                                
                                if (response.ok) {
                                    finalUri = await response.text(); // Get the response as plain text
                                    finalUri = finalUri.trim(); // Trim any whitespace
                                } else {
                                    console.error('Failed to fetch URI from Deno service:', response.status, response.statusText);
                                    errorMessage.classList.remove('hidden'); // Show error message
                                }
                            } catch (error) {
                                console.error('Error during Deno service fetch:', error);
                                errorMessage.classList.remove('hidden'); // Show error message
                            } finally {
                                loadingMessage.classList.add('hidden'); // Hide loading message
                                vlessUri.value = finalUri; // Set the URI based on the fetch result or fallback
                            }

                            vlessConfigModal.classList.remove('hidden');
                            vlessConfigModal.classList.add('flex'); // Use flex to center the modal
                        });

                        closeModalBtn.addEventListener('click', () => {
                            vlessConfigModal.classList.add('hidden');
                            vlessConfigModal.classList.remove('flex');
                        });

                        // Close modal when clicking outside of it
                        vlessConfigModal.addEventListener('click', (event) => {
                            if (event.target === vlessConfigModal) {
                                vlessConfigModal.classList.add('hidden');
                                vlessConfigModal.classList.remove('flex');
                            }
                        });

                        copyConfigBtn.addEventListener('click', () => {
                            vlessUri.select();
                            vlessUri.setSelectionRange(0, 99999); // For mobile devices

                            try {
                                document.execCommand('copy');
                                copyMessage.classList.remove('hidden');
                                setTimeout(() => {
                                    copyMessage.classList.add('hidden');
                                }, 2000); // Hide message after 2 seconds
                            } catch (err) {
                                console.error('Failed to copy text: ', err);
                                // Optionally, show an error message
                                errorMessage.textContent = 'Failed to copy!';
                                errorMessage.classList.remove('hidden');
                            }
                        });
                    });
                </script>
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
    logcb('VLESS Proxy UUID:', uuid); // Still logged to console for server admin
    logcb('Access home page at: http://localhost:' + port);
    logcb('Public Host (for VLESS URI):', publicHost);
});

// Handle server errors
server.on('error', err => {
    errcb('Server Error:', err);
});
