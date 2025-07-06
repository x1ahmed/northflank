#!/bin/bash

# Generate a UUID for the client
UUID=$(cat /proc/sys/kernel/random/uuid)

# Generate Reality key pair
echo "Generating Reality key pair..."
KEYPAIR=$(/usr/local/bin/xray x25519)
PRIVATE_KEY=$(echo "$KEYPAIR" | grep "Private key:" | cut -d' ' -f3)
PUBLIC_KEY=$(echo "$KEYPAIR" | grep "Public key:" | cut -d' ' -f3)

# Replace the placeholder UUID and private key in the config file
sed -i "s/AUTO_GENERATE_UUID/$UUID/g" /etc/xray/config.json
sed -i "s/AUTO_GENERATE_PRIVATE_KEY/$PRIVATE_KEY/g" /etc/xray/config.json

# Output the client configuration for easy setup
echo "========================================"
echo "VLESS Reality Proxy Configuration"
echo "========================================"
echo "Protocol: vless"
echo "Server: $RAILWAY_PUBLIC_DOMAIN"
echo "Port: 443"
echo "UUID: $UUID"
echo "Flow: xtls-rprx-vision"
echo "Network: tcp"
echo "Security: reality"
echo "SNI: partners.playstation.net"
echo "Fingerprint: chrome"
echo "========================================"
echo "GENERATED REALITY KEYS:"
echo "Private Key: $PRIVATE_KEY"
echo "Public Key: $PUBLIC_KEY"
echo "========================================"
echo "ShortId: 8236"
echo "========================================"
echo ""
echo "Client URL:"
echo "vless://$UUID@$RAILWAY_PUBLIC_DOMAIN:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=partners.playstation.net&fp=chrome&pbk=$PUBLIC_KEY&sid=8236&type=tcp&allowInsecure=1#Railway-VLESS-Reality"
echo "========================================"

echo "Current config.json content:"
cat /etc/xray/config.json

# Start Xray
exec /usr/local/bin/xray run -config /etc/xray/config.json
