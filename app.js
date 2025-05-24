const net = require('net');
const http = require('http'); // Import http module for serving the home page
const { WebSocket, createWebSocketStream } = require('ws');
const { TextDecoder } = require('util');

// Helper functions for logging to the console
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);

// Configuration for the VLESS proxy
// The UUID can be set via environment variable (e.g., UUID=your-uuid-here node server.js)
// or defaults to a specific value if not provided. The dashes are removed for internal use.
const uuid = (process.env.UUID || 'd342d11e-d424-4583-b36e-524ab1f0afa4').replace(/-/g, "");
// The port for the server can be set via environment variable (e.g., PORT=80 node server.js)
// or defaults to 8080 if not provided.
const port = process.env.PORT || 8080;

// Create an HTTP server to handle both web page requests and WebSocket upgrades.
// This server will listen for incoming HTTP requests.
const server = http.createServer((req, res) => {
    // Serve the home page for GET requests to the root path ('/').
    if (req.method === 'GET' && req.url === '/') {
        // Set the HTTP header to indicate that the response is HTML.
        res.writeHead(200, { 'Content-Type': 'text/html' });
        // Send the HTML content for the home page.
        // The HTML includes Tailwind CSS for styling and client-side JavaScript.
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>VLESS Proxy Server</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    /* Custom font for better aesthetics and readability */
                    body {
                        font-family: 'Inter', sans-serif;
                    }
                    /* Styles for the modal backdrop to create a dimming effect */
                    .modal-backdrop {
                        background-color: rgba(0, 0, 0, 0.5);
                        z-index: 999; /* Ensure it's on top of other content */
                    }
                    /* Styles for the modal content itself, ensuring it's above the backdrop */
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
                        </div>
                        <button id="copyConfigBtn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 mr-2">
                            Copy URI
                        </button>
                        <button id="closeModalBtn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75">
                            Close
                        </button>
                        <div id="copyMessage" class="text-sm text-green-600 mt-2 hidden">Copied to clipboard!</div>
                        <div id="fetchErrorMessage" class="text-sm text-red-600 mt-2 hidden"></div>
                    </div>
                </div>

                <script>
                    // Wait for the DOM to be fully loaded before running JavaScript
                    document.addEventListener('DOMContentLoaded', () => {
                        // Get references to all necessary DOM elements
                        const getConfigBtn = document.getElementById('getConfigBtn');
                        const vlessConfigModal = document.getElementById('vlessConfigModal');
                        const closeModalBtn = document.getElementById('closeModalBtn');
                        const copyConfigBtn = document.getElementById('copyConfigBtn');
                        const modalUuid = document.getElementById('modalUuid');
                        const modalPort = document.getElementById('modalPort');
                        const modalHost = document.getElementById('modalHost');
                        const vlessUri = document.getElementById('vlessUri');
                        const copyMessage = document.getElementById('copyMessage');
                        const fetchErrorMessage = document.getElementById('fetchErrorMessage'); // Reference to the new error message div

                        // Get UUID and Port from the server-side rendered HTML.
                        // These values are injected by the Node.js server.
                        const serverUuid = "${uuid}";
                        const serverPort = "${port}";
                        // Determine the host for client-side display.
                        // If running locally, use '127.0.0.1', otherwise use the actual hostname.
                        const serverHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;

                        // Add event listener to the "Get My VLESS Config" button.
                        // The 'async' keyword is crucial here to allow the use of 'await' inside.
                        getConfigBtn.addEventListener('click', async () => {
                            // Populate the modal with the server's configuration details
                            modalUuid.textContent = serverUuid;
                            modalPort.textContent = serverPort;
                            modalHost.textContent = serverHost;

                            // Construct the VLESS URI.
                            // This is a simplified URI for demonstration. A real VLESS URI might have more parameters.
                            // The 'host' parameter is explicitly added for WebSocket transport.
                            const uri = `vless://${serverUuid}@${serverHost}:443?security=tls&fp=randomized&type=ws&host=${serverHost}&encryption=none#Nothflank-By-ModsBots`;
                            
                            // Clear any previously displayed error messages before a new attempt
                            fetchErrorMessage.classList.add('hidden');
                            fetchErrorMessage.textContent = '';

                            // Attempt to fetch from the Deno proxy for validation/logging.
                            // Using try...catch for robust error handling during the network request.
                            try {
                                // Encode the URI component to ensure it's a valid URL parameter
                                const response = await fetch(`https://deno-proxy-version.deno.dev/?check=${encodeURIComponent(uri)}`);
                                
                                // Check if the network request was successful (HTTP status 200-299)
                                if (!response.ok) {
                                    const errorText = `Deno proxy check failed: ${response.status} ${response.statusText}`;
                                    console.error(errorText); // Log error to console for debugging
                                    fetchErrorMessage.textContent = `Error: ${errorText}. Check console for details.`;
                                    fetchErrorMessage.classList.remove('hidden'); // Show error message on UI
                                } else {
                                    const result = await response.text();
                                    console.log('Deno proxy check result:', result); // Log successful response
                                    // You could potentially parse 'result' and update the UI based on its content
                                }

                            } catch (error) {
                                // Catch any network errors (e.g., no internet, CORS issues)
                                console.error('Error fetching from Deno proxy:', error);
                                fetchErrorMessage.textContent = `Network error during Deno proxy check: ${error.message}.`;
                                fetchErrorMessage.classList.remove('hidden'); // Show error message on UI
                            }
                            
                            // Set the constructed VLESS URI into the textarea
                            vlessUri.value = uri;

                            // Display the modal by removing 'hidden' and adding 'flex' for centering
                            vlessConfigModal.classList.remove('hidden');
                            vlessConfigModal.classList.add('flex');
                            // Hide the "Copied to clipboard!" message if it was previously shown
                            copyMessage.classList.add('hidden');
                        });

                        // Add event listener to the "Close" button in the modal
                        closeModalBtn.addEventListener('click', () => {
                            // Hide the modal
                            vlessConfigModal.classList.add('hidden');
                            vlessConfigModal.classList.remove('flex');
                        });

                        // Add event listener to close the modal when clicking outside its content
                        vlessConfigModal.addEventListener('click', (event) => {
                            // Check if the click target is the modal backdrop itself, not its content
                            if (event.target === vlessConfigModal) {
                                vlessConfigModal.classList.add('hidden');
                                vlessConfigModal.classList.remove('flex');
                            }
                        });

                        // Add event listener to the "Copy URI" button
                        copyConfigBtn.addEventListener('click', () => {
                            // Select the text in the textarea
                            vlessUri.select();
                            // For mobile devices, ensure the entire text is selected
                            vlessUri.setSelectionRange(0, 99999); 

                            // Attempt to copy the selected text to the clipboard
                            try {
                                document.execCommand('copy'); // Deprecated but widely supported for iframes
                                copyMessage.classList.remove('hidden'); // Show success message
                                // Hide the success message after 2 seconds
                                setTimeout(() => {
                                    copyMessage.classList.add('hidden');
                                }, 2000); 
                            } catch (err) {
                                console.error('Failed to copy text: ', err);
                                // In a real application, you might show a user-friendly error here
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `);
    } else {
        // For any other HTTP requests (not GET /), return a 404 Not Found response.
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Create a WebSocket server instance, attaching it to the HTTP server.
// Using 'noServer: true' means it won't listen on its own port, but will
// instead use the 'upgrade' event from the HTTP server.
const wss = new WebSocket.Server({ noServer: true });

// Listen for the 'upgrade' event from the HTTP server. This event is emitted
// when a client requests a protocol upgrade (e.g., from HTTP to WebSocket).
server.on('upgrade', (request, socket, head) => {
    // Handle the WebSocket upgrade request.
    // If successful, the 'callback' function (ws => wss.emit('connection', ws, request)) is called.
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request); // Emit 'connection' event for the WebSocket server
    });
});

// WebSocket server connection handling logic (original VLESS proxy logic).
// This is where the core VLESS protocol handling occurs.
wss.on('connection', ws => {
    console.log("New WebSocket connection established.");

    // Listen for the first message from the client. This message contains
    // the VLESS protocol handshake information (version, UUID, target address).
    ws.once('message', msg => {
        const [VERSION] = msg; // Extract the VLESS version (first byte)
        const id = msg.slice(1, 17); // Extract the UUID (next 16 bytes)

        // Validate the UUID received from the client against the server's configured UUID.
        // If they don't match, the connection is rejected for security.
        if (!id.every((v, i) => v === parseInt(uuid.substr(i * 2, 2), 16))) {
            console.log("UUID mismatch. Connection rejected.");
            ws.close(); // Close the WebSocket connection
            return; // Exit the function
        }

        // Parse the VLESS request to determine the target host and port.
        // The address type (ATYP) offset is determined by the length of the UUID + 17 bytes.
        let i = msg.slice(17, 18).readUInt8() + 19; 
        const port = msg.slice(i, i += 2).readUInt16BE(0); // Extract the target port (2 bytes)
        const ATYP = msg.slice(i, i += 1).readUInt8(); // Extract the address type (1 byte)

        let host;
        // Determine the target host based on the Address Type (ATYP)
        if (ATYP === 1) { // IPv4 address (4 bytes)
            host = msg.slice(i, i += 4).join('.');
        } else if (ATYP === 2) { // Domain name (variable length, preceded by length byte)
            host = new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8()));
        } else if (ATYP === 3) { // IPv6 address (16 bytes)
            host = msg.slice(i, i += 16).reduce((s, b, idx, arr) => (idx % 2 ? s.concat(arr.slice(idx - 1, idx + 1)) : s), [])
                .map(b => b.readUInt16BE(0).toString(16))
                .join(':');
        } else {
            // Log and close connection for unsupported address types
            console.log("Unsupported ATYP:", ATYP);
            ws.close();
            return;
        }

        logcb(`Proxying connection to: ${host}:${port}`); // Log the target connection details

        // Send a success response to the client, indicating that the VLESS handshake is complete.
        // This is a VLESS response header: VERSION (1 byte) + 0x00 (success status).
        ws.send(new Uint8Array([VERSION, 0]));

        // Create a duplex stream from the WebSocket. This allows piping data
        // directly between the WebSocket and a TCP socket.
        const duplex = createWebSocketStream(ws);

        // Establish a TCP connection to the target host and port.
        net.connect({ host, port }, function () {
            // Write the remaining part of the client's initial message (payload) to the target.
            // This is the actual data the client wants to send to the destination.
            this.write(msg.slice(i));
            // Pipe data flow:
            // 1. Data from WebSocket (client) -> TCP socket (target)
            // 2. Data from TCP socket (target) -> WebSocket (client)
            // Error handlers are attached to log any issues during piping.
            duplex.on('error', errcb('E1: WebSocket Stream Error')).pipe(this).on('error', errcb('E2: TCP Stream Error')).pipe(duplex);
        }).on('error', err => {
            // Handle errors when connecting to the target host (e.g., host unreachable, connection refused).
            errcb(`Connection to target failed (${host}:${port}):`, err.message);
            duplex.end(); // End the WebSocket stream if target connection fails
        });
    }).on('error', errcb('EE: WebSocket Message Error')); // Handle errors on the initial WebSocket message
});

// Start the HTTP server listening on the specified port.
server.listen(port, () => {
    logcb(`Server listening on port: ${port}`);
    logcb(`VLESS Proxy UUID: ${uuid}`); // Log UUID for server administration
    logcb(`Access home page at: http://localhost:${port}`); // Instructions to access the web UI
});

// Handle general server errors (e.g., port already in use).
server.on('error', err => {
    errcb('Server Error:', err);
});
