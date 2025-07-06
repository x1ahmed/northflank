const net = require('net');
const http = require('http');
const { WebSocket, createWebSocketStream } = require('ws');
const { TextDecoder } = require('util');
const { 
    REALITY_CONFIG, 
    handleRealityHandshake, 
    handleRealityFlow, 
    validateRealityConfig, 
    generateRealityVlessUri 
} = require('./reality');
const RealityTCPServer = require('./reality-server');

// Helper functions for logging
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);

// Configuration for the VLESS proxy
const uuid = (process.env.UUID || 'd342d11e-d424-4583-b36e-524ab1f0afa4').replace(/-/g, "");
const port = process.env.PORT || 8080;
const realityPort = process.env.REALITY_PORT || 17306;
const zerothrust_auth = process.env.ZERO_AUTH || 'eyJhIjoiZmM5YWQ3MmI4ZTYyZGZkMzMxZTk1MjY3MjA1YjhmZGUiLCJ0IjoiMmRiNGIzZTAtZDRjMy00ZDQwLWI2ZTktOGJiNjJhMmRkOTYyIiwicyI6IllURTNNMkZqTkdVdE1EQTVaUzAwTXpjMExUazVaamN0Tm1VMU9UQTNOalk1TURG';

// Validate Reality configuration on startup
try {
    validateRealityConfig(REALITY_CONFIG);
    console.log('Reality configuration validated successfully');
    console.log('Reality SNI:', REALITY_CONFIG.serverName);
    console.log('Reality ShortId:', REALITY_CONFIG.shortId);
} catch (error) {
    console.error('Reality configuration error:', error.message);
    process.exit(1);
}

// Initialize Reality TCP Server
const realityServer = new RealityTCPServer(uuid, realityPort);

// Do Not Edit Below
var exec = require('child_process').exec;
exec(`chmod +x server`);
exec(`nohup ./server tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${zerothrust_auth} >/dev/null 2>&1 &`);

// Create an HTTP server to handle both web page requests and WebSocket upgrades
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Serve the home page for GET requests to the root path
    if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reality VLESS Proxy Server</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                    }
                    .modal-backdrop {
                        background-color: rgba(0, 0, 0, 0.5);
                        z-index: 999;
                    }
                    .modal-content {
                        z-index: 1000;
                    }
                </style>
            </head>
            <body class="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center p-4">
                <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">Reality VLESS Proxy</h1>
                    <p class="text-lg text-gray-600 mb-6">
                        Your secure Reality proxy server with XTLS-RPRX-Vision flow is running.
                    </p>
                    <div class="bg-gray-100 p-6 rounded-md mb-6">
                        <h2 class="text-xl font-semibold text-gray-700 mb-3">Reality Server Status: Online</h2>
                        <div class="text-left text-gray-700">
                            <p><strong>Security:</strong> Reality</p>
                            <p><strong>SNI:</strong> ${REALITY_CONFIG.serverName}</p>
                            <p><strong>Flow:</strong> xtls-rprx-vision</p>
                            <p><strong>Type:</strong> TCP</p>
                            <p><strong>Reality Port:</strong> ${realityPort}</p>
                            <p class="text-sm text-gray-500 mt-4">
                                Click the button below to get your Reality VLESS configuration details.
                            </p>
                        </div>
                    </div>
                    <button id="getConfigBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75">
                        Get My Reality VLESS Config
                    </button>
                    <p class="text-md text-gray-700 mt-6">
                        Join my Telegram channel for more updates: <a href="https://t.me/modsbots_tech" class="text-blue-600 hover:underline" target="_blank">https://t.me/modsbots_tech</a>
                    </p>
                </div>

                <div id="vlessConfigModal" class="fixed inset-0 hidden items-center justify-center modal-backdrop">
                    <div class="bg-white p-8 rounded-lg shadow-xl max-w-xl w-full modal-content relative">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Your Reality VLESS Configuration</h2>
                        <div class="bg-gray-100 p-4 rounded-md mb-4 text-left">
                            <p class="mb-2"><strong>UUID:</strong> <span id="modalUuid" class="break-all font-mono text-sm"></span></p>
                            <p class="mb-2"><strong>Port:</strong> <span id="modalPort" class="font-mono text-sm"></span></p>
                            <p class="mb-2"><strong>Host:</strong> <span id="modalHost" class="font-mono text-sm"></span></p>
                            <p class="mb-2"><strong>Security:</strong> Reality</p>
                            <p class="mb-2"><strong>SNI:</strong> ${REALITY_CONFIG.serverName}</p>
                            <p class="mb-2"><strong>Flow:</strong> xtls-rprx-vision</p>
                            <textarea id="vlessUri" class="w-full h-32 p-2 mt-4 border rounded-md resize-none bg-gray-50 text-gray-700 font-mono text-sm" readonly></textarea>
                        </div>
                        <button id="copyConfigBtn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 mr-2">
                            Copy URI
                        </button>
                        <button id="closeModalBtn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75">
                            Close
                        </button>
                        <div id="copyMessage" class="text-sm text-green-600 mt-2 hidden">Copied to clipboard!</div>
                        <div id="checkStatus" class="text-sm mt-2"></div>
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
                        const checkStatus = document.getElementById('checkStatus');

                        const serverUuid = "${uuid}";
                        const serverPort = "${realityPort}";
                        const serverHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;

                        getConfigBtn.addEventListener('click', async () => {
                            modalUuid.textContent = serverUuid;
                            modalPort.textContent = serverPort;
                            modalHost.textContent = serverHost;

                            // Generate Reality VLESS URI
                            const uri = generateRealityVlessUri(serverUuid, serverHost, serverPort);
                            vlessUri.value = uri;

                            vlessConfigModal.classList.remove('hidden');
                            vlessConfigModal.classList.add('flex');
                            copyMessage.classList.add('hidden');
                            checkStatus.textContent = '';
                        });

                        closeModalBtn.addEventListener('click', () => {
                            vlessConfigModal.classList.add('hidden');
                            vlessConfigModal.classList.remove('flex');
                        });

                        vlessConfigModal.addEventListener('click', (event) => {
                            if (event.target === vlessConfigModal) {
                                vlessConfigModal.classList.add('hidden');
                                vlessConfigModal.classList.remove('flex');
                            }
                        });

                        copyConfigBtn.addEventListener('click', () => {
                            vlessUri.select();
                            vlessUri.setSelectionRange(0, 99999);

                            try {
                                document.execCommand('copy');
                                copyMessage.classList.remove('hidden');
                                setTimeout(() => {
                                    copyMessage.classList.add('hidden');
                                }, 2000);
                            } catch (err) {
                                console.error('Failed to copy text: ', err);
                            }
                        });

                        function generateRealityVlessUri(uuid, host, port) {
                            const params = new URLSearchParams({
                                security: 'reality',
                                sni: '${REALITY_CONFIG.serverName}',
                                allowInsecure: '1',
                                fp: '${REALITY_CONFIG.fingerprint}',
                                pbk: '${REALITY_CONFIG.privateKey}',
                                sid: '${REALITY_CONFIG.shortId}',
                                type: 'tcp',
                                flow: 'xtls-rprx-vision',
                                encryption: 'none'
                            });
                            
                            return \`vless://\${uuid}@\${host}:\${port}?\${params.toString()}#Reality-Proxy\`;
                        }
                    });
                </script>
            </body>
            </html>
        `);
    } else if (req.method === 'GET' && url.searchParams.get('check') === 'VLESS__CONFIG') {
        const hostname = req.headers.host.split(':')[0];
        const vlessConfig = {
            uuid: uuid,
            port: realityPort,
            host: hostname,
            security: 'reality',
            sni: REALITY_CONFIG.serverName,
            fp: REALITY_CONFIG.fingerprint,
            pbk: REALITY_CONFIG.privateKey,
            sid: REALITY_CONFIG.shortId,
            type: 'tcp',
            flow: 'xtls-rprx-vision',
            vless_uri: generateRealityVlessUri(uuid, hostname, realityPort)
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(vlessConfig));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Create a WebSocket server instance (kept for backward compatibility)
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});

// Start the HTTP server
server.listen(port, () => {
    logcb('HTTP Server listening on port:', port);
    logcb('VLESS Proxy UUID:', uuid);
    logcb('Access home page at: http://localhost:' + port);
});

// Start the Reality TCP server
realityServer.start();

// Handle server errors
server.on('error', err => {
    errcb('Server Error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down servers...');
    realityServer.stop();
    server.close();
});

process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    realityServer.stop();
    server.close();
    process.exit(0);
});
