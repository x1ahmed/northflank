# Reality VLESS Proxy Server

A Node.js implementation of VLESS proxy with Reality protocol support.

## Features

- **Reality Protocol**: Advanced traffic obfuscation using Reality technology
- **XTLS-RPRX-Vision Flow**: High-performance flow control for better speed
- **TCP Transport**: Direct TCP connections for optimal performance
- **Web Interface**: Easy-to-use web interface for configuration
- **Automatic Configuration**: Generates proper VLESS URI automatically

## Configuration

The server is configured with the following Reality settings:

- **Destination**: `partners.playstation.net:443`
- **SNI**: `partners.playstation.net`
- **Fingerprint**: `chrome`
- **Flow**: `xtls-rprx-vision`
- **Transport**: `tcp`

## Environment Variables

- `UUID`: VLESS UUID (default: auto-generated)
- `PORT`: HTTP web interface port (default: 8080)
- `REALITY_PORT`: Reality TCP server port (default: 17306)
- `ZERO_AUTH`: Cloudflare tunnel authentication token

## Usage

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Access the web interface**:
   Open your browser and go to `http://localhost:8080`

4. **Get your VLESS configuration**:
   - Click on "Get My Reality VLESS Config"
   - Copy the generated VLESS URI
   - Import it into your VLESS client

## Generated VLESS URI Format

```
vless://[UUID]@[HOST]:[PORT]?security=reality&sni=partners.playstation.net&allowInsecure=1&fp=chrome&pbk=[PRIVATE_KEY]&sid=[SHORT_ID]&type=tcp&flow=xtls-rprx-vision&encryption=none#Reality-Proxy
```

## Server Ports

- **HTTP Interface**: 8080 (configurable via PORT env var)
- **Reality TCP Server**: 17306 (configurable via REALITY_PORT env var)

## Client Configuration

Use the generated VLESS URI in your client, or manually configure:

- **Address**: Your server IP/domain
- **Port**: 17306 (or your configured Reality port)
- **UUID**: Your generated UUID
- **Security**: reality
- **SNI**: partners.playstation.net
- **Flow**: xtls-rprx-vision
- **Transport**: tcp
- **Encryption**: none

## Files

- `app.js`: Main HTTP server and web interface
- `reality.js`: Reality protocol implementation
- `reality-server.js`: TCP server for Reality connections
- `package.json`: Node.js dependencies

## Security Notes

- This implementation uses Reality protocol for traffic obfuscation
- All connections are encrypted using XTLS
- The server mimics legitimate HTTPS traffic to PlayStation partners

## Troubleshooting

1. **Check ports**: Ensure ports 8080 and 17306 are available
2. **Firewall**: Allow incoming connections on the Reality port
3. **Dependencies**: Run `npm install` to install required packages
4. **Logs**: Check console output for error messages

## Support

For issues and updates, visit: https://t.me/modsbots_tech
