const net = require('net');
const { 
    REALITY_CONFIG, 
    handleRealityHandshake, 
    handleRealityFlow, 
    validateRealityConfig 
} = require('./reality');

// Reality TCP Server for handling direct TCP connections
class RealityTCPServer {
    constructor(uuid, port = 17306) {
        this.uuid = uuid.replace(/-/g, "");
        this.port = port;
        this.server = null;
        
        // Validate Reality configuration
        validateRealityConfig(REALITY_CONFIG);
        console.log('Reality TCP Server initialized');
        console.log('UUID:', this.uuid);
        console.log('Port:', this.port);
        console.log('SNI:', REALITY_CONFIG.serverName);
    }

    start() {
        this.server = net.createServer((socket) => {
            console.log('New TCP connection established');
            this.handleConnection(socket);
        });

        this.server.listen(this.port, () => {
            console.log(`Reality TCP Server listening on port ${this.port}`);
        });

        this.server.on('error', (err) => {
            console.error('TCP Server error:', err);
        });
    }

    handleConnection(socket) {
        let isHandshakeComplete = false;
        
        socket.once('data', (data) => {
            try {
                // Parse VLESS header
                const version = data[0];
                if (version !== 0) {
                    console.log('Invalid VLESS version:', version);
                    socket.end();
                    return;
                }

                // Extract and validate UUID
                const clientUuid = data.slice(1, 17);
                const serverUuid = Buffer.from(this.uuid, 'hex');
                
                if (!clientUuid.equals(serverUuid)) {
                    console.log('UUID mismatch');
                    socket.end();
                    return;
                }

                // Parse additional length
                const additionalLength = data[17];
                let offset = 18 + additionalLength;

                // Parse command (should be 1 for TCP)
                const command = data[offset];
                offset += 1;

                // Parse port
                const port = data.readUInt16BE(offset);
                offset += 2;

                // Parse address type
                const addressType = data[offset];
                offset += 1;

                let address;
                if (addressType === 1) { // IPv4
                    address = Array.from(data.slice(offset, offset + 4)).join('.');
                    offset += 4;
                } else if (addressType === 2) { // Domain
                    const domainLength = data[offset];
                    offset += 1;
                    address = data.slice(offset, offset + domainLength).toString();
                    offset += domainLength;
                } else if (addressType === 3) { // IPv6
                    const ipv6Bytes = data.slice(offset, offset + 16);
                    address = [];
                    for (let i = 0; i < 16; i += 2) {
                        address.push(ipv6Bytes.readUInt16BE(i).toString(16));
                    }
                    address = address.join(':');
                    offset += 16;
                } else {
                    console.log('Unsupported address type:', addressType);
                    socket.end();
                    return;
                }

                console.log(`VLESS connection to ${address}:${port}`);

                // Send success response
                const response = Buffer.from([version, 0]);
                socket.write(response);

                // Handle Reality connection
                this.handleRealityConnection(socket, address, port, data.slice(offset));

            } catch (error) {
                console.error('Error parsing VLESS header:', error);
                socket.end();
            }
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });

        socket.on('close', () => {
            console.log('TCP connection closed');
        });
    }

    handleRealityConnection(clientSocket, targetAddress, targetPort, remainingData) {
        console.log(`Setting up Reality connection to ${targetAddress}:${targetPort}`);
        
        // Create connection to Reality destination
        const destSocket = net.createConnection(443, REALITY_CONFIG.dest.split(':')[0]);
        
        destSocket.on('connect', () => {
            console.log('Connected to Reality destination');
            
            // Set up bidirectional data flow
            this.setupDataFlow(clientSocket, destSocket, remainingData);
        });

        destSocket.on('error', (err) => {
            console.error('Reality destination connection error:', err);
            clientSocket.end();
        });

        destSocket.on('close', () => {
            console.log('Reality destination connection closed');
            clientSocket.end();
        });
    }

    setupDataFlow(clientSocket, destSocket, initialData) {
        console.log('Setting up Reality data flow');
        
        // Send any remaining data from the initial VLESS handshake
        if (initialData && initialData.length > 0) {
            destSocket.write(initialData);
        }

        // Set up bidirectional data flow
        clientSocket.on('data', (data) => {
            destSocket.write(data);
        });

        destSocket.on('data', (data) => {
            clientSocket.write(data);
        });

        clientSocket.on('close', () => {
            destSocket.end();
        });

        destSocket.on('close', () => {
            clientSocket.end();
        });

        clientSocket.on('error', (err) => {
            console.error('Client socket error:', err);
            destSocket.end();
        });

        destSocket.on('error', (err) => {
            console.error('Destination socket error:', err);
            clientSocket.end();
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('Reality TCP Server stopped');
        }
    }
}

module.exports = RealityTCPServer;
