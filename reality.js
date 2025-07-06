const crypto = require('crypto');
const net = require('net');
const tls = require('tls');

// Reality Configuration based on your provided config
const REALITY_CONFIG = {
    dest: 'partners.playstation.net:443',
    serverName: 'partners.playstation.net',
    privateKey: 'eqTREGmvRVdLzIlSjxFrqJ9oxBpNTfMqnMdMDMHCEBs',
    shortId: '8236',
    fingerprint: 'chrome'
};

// Generate Reality public key from private key
function generateRealityKeys() {
    // In a real implementation, you would generate proper X25519 keys
    // For now, we'll use the provided key
    return {
        privateKey: REALITY_CONFIG.privateKey,
        publicKey: REALITY_CONFIG.privateKey // This should be the actual public key
    };
}

// Create Reality TLS wrapper
function createRealityTLS(socket, isServer = true) {
    const options = {
        isServer: isServer,
        servername: REALITY_CONFIG.serverName,
        rejectUnauthorized: false,
        // Add Reality specific options
        ALPNProtocols: ['h2', 'http/1.1'],
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384',
        honorCipherOrder: true,
        secureProtocol: 'TLSv1_2_method'
    };

    return tls.connect(options, socket);
}

// Reality handshake handler
function handleRealityHandshake(clientSocket, targetHost, targetPort, callback) {
    console.log(`Reality handshake for ${targetHost}:${targetPort}`);
    
    // Create connection to the actual destination (Reality dest)
    const destSocket = net.createConnection(443, REALITY_CONFIG.dest.split(':')[0], () => {
        console.log(`Connected to Reality destination: ${REALITY_CONFIG.dest}`);
        
        // Create TLS connection to destination
        const tlsSocket = tls.connect({
            socket: destSocket,
            servername: REALITY_CONFIG.serverName,
            rejectUnauthorized: false
        }, () => {
            console.log('TLS connection to destination established');
            callback(null, tlsSocket);
        });
        
        tlsSocket.on('error', (err) => {
            console.error('TLS connection error:', err);
            callback(err);
        });
    });
    
    destSocket.on('error', (err) => {
        console.error('Destination connection error:', err);
        callback(err);
    });
}

// Reality flow handler for xtls-rprx-vision
function handleRealityFlow(clientSocket, targetSocket) {
    console.log('Handling Reality flow: xtls-rprx-vision');
    
    // Implement XTLS-RPRX-Vision flow
    // This is a simplified implementation
    let isFirstPacket = true;
    
    clientSocket.on('data', (data) => {
        if (isFirstPacket) {
            // Handle first packet with Vision flow
            console.log('Processing first packet with Vision flow');
            isFirstPacket = false;
        }
        targetSocket.write(data);
    });
    
    targetSocket.on('data', (data) => {
        clientSocket.write(data);
    });
    
    clientSocket.on('close', () => {
        targetSocket.end();
    });
    
    targetSocket.on('close', () => {
        clientSocket.end();
    });
    
    clientSocket.on('error', (err) => {
        console.error('Client socket error:', err);
        targetSocket.end();
    });
    
    targetSocket.on('error', (err) => {
        console.error('Target socket error:', err);
        clientSocket.end();
    });
}

// Validate Reality parameters
function validateRealityConfig(config) {
    const required = ['dest', 'serverName', 'privateKey', 'shortId'];
    for (const field of required) {
        if (!config[field]) {
            throw new Error(`Missing required Reality config field: ${field}`);
        }
    }
    
    // Validate shortId format (should be hex)
    if (!/^[0-9a-fA-F]+$/.test(config.shortId)) {
        throw new Error('Invalid shortId format. Should be hexadecimal.');
    }
    
    return true;
}

// Generate Reality VLESS URI
function generateRealityVlessUri(uuid, host, port = 443) {
    const params = new URLSearchParams({
        security: 'reality',
        sni: REALITY_CONFIG.serverName,
        allowInsecure: '1',
        fp: REALITY_CONFIG.fingerprint,
        pbk: REALITY_CONFIG.privateKey,
        sid: REALITY_CONFIG.shortId,
        type: 'tcp',
        flow: 'xtls-rprx-vision',
        encryption: 'none'
    });
    
    return `vless://${uuid}@${host}:${port}?${params.toString()}#Reality-Proxy`;
}

module.exports = {
    REALITY_CONFIG,
    generateRealityKeys,
    createRealityTLS,
    handleRealityHandshake,
    handleRealityFlow,
    validateRealityConfig,
    generateRealityVlessUri
};