# VLESS Reality Proxy

This project provides a VLESS proxy server with Reality protocol support.

## Features

- VLESS proxy support
- Reality protocol for enhanced security
- Simple web interface for configuration
- Configuration display and easy copy
- Support for customizing settings

## Configuration

The Reality configuration is based on the following VLESS URI format:

```
vless://8442ff27-8e79-4f27-b4d2-c3e6447789ea@164.92.176.134:17306?security=reality&sni=partners.playstation.net&allowInsecure=1&fp=chrome&pbk=eqTREGmvRVdLzIlSjxFrqJ9oxBpNTfMqnMdMDMHCEBs&sid=8236&type=tcp&flow=xtls-rprx-vision&encryption=none#PS-reality
```

You can customize the following settings in the `reality.js` file:

- UUID
- Server port
- SNI (Server Name Indication)
- Public key
- Fingerprint
- Short ID
- Flow type

## Usage

### Running the Reality Server

```bash
npm run reality
```

This will start the Reality proxy server on the configured port and the web interface on port 8080.

### Accessing the Web Interface

Open your browser and navigate to `http://localhost:8080` or your server's IP address on port 8080.

### Getting the VLESS Reality Configuration

1. Click on the "Get Reality Config" button on the web interface
2. Copy the generated VLESS URI
3. Use the URI in your VLESS client application

## Original WebSocket Proxy

The original WebSocket proxy is still available and can be run with:

```bash
npm start
```

## Note

This is a basic implementation. For a full VLESS Reality implementation, you might need to use specialized libraries or tools that can handle the Reality protocol.
