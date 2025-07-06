#!/bin/bash

# Generate a UUID for the client
UUID=$(cat /proc/sys/kernel/random/uuid)

# Replace the placeholder UUID in the config file
sed -i "s/AUTO_GENERATE_UUID/$UUID/g" /etc/xray/config.json

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
echo "PublicKey: eqTREGmvRVdLzIlSjxFrqJ9oxBpNTfMqnMdMDMHCEBs"
echo "ShortId: 8236"
echo "========================================"
echo ""
echo "Client URL:"
echo "vless://$UUID@$RAILWAY_PUBLIC_DOMAIN:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=partners.playstation.net&fp=chrome&pbk=eqTREGmvRVdLzIlSjxFrqJ9oxBpNTfMqnMdMDMHCEBs&sid=8236&type=tcp#Railway-VLESS-Reality"
echo "========================================"

# Start Xray
exec /usr/local/bin/xray run -config /etc/xray/config.json
