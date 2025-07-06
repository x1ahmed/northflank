#!/bin/bash

# Generate a UUID for the client
UUID=$(cat /proc/sys/kernel/random/uuid | tr -d '\n')

echo "========================================"
echo "Setting up VLESS with Certbot certificates"
echo "========================================"

# Setup certificates using Certbot
echo "Setting up SSL certificates..."
/setup-certs.sh

# Check if we should use TLS or Reality configuration
if [ -f "/etc/ssl/certs/partners.playstation.net.crt" ] && [ -f "/etc/ssl/certs/partners.playstation.net.key" ]; then
    echo "Using TLS configuration with custom certificates"
    CONFIG_FILE="/etc/xray/config-tls.json"
    SECURITY_TYPE="tls"
    FLOW=""
else
    echo "Using Reality configuration"
    CONFIG_FILE="/etc/xray/config.json"
    SECURITY_TYPE="reality"
    FLOW="xtls-rprx-vision"
    
    # Generate Reality key pair for fallback
    echo "Generating Reality key pair..."
    KEYPAIR=$(/usr/local/bin/xray x25519)
    PRIVATE_KEY=$(echo "$KEYPAIR" | grep "Private key:" | cut -d' ' -f3 | tr -d '\n')
    PUBLIC_KEY=$(echo "$KEYPAIR" | grep "Public key:" | cut -d' ' -f3 | tr -d '\n')
    
    # Replace the private key in config
    sed -i "s/AUTO_GENERATE_PRIVATE_KEY/$PRIVATE_KEY/g" $CONFIG_FILE
fi

# Replace the UUID in the config
sed -i "s/AUTO_GENERATE_UUID/$UUID/g" $CONFIG_FILE

# Output the client configuration
echo "========================================"
echo "VLESS Proxy Configuration"
echo "========================================"
echo "Server: $RAILWAY_PUBLIC_DOMAIN"
echo "Port: 443"
echo "UUID: $UUID"
echo "Security: $SECURITY_TYPE"
echo "SNI: partners.playstation.net"

if [ "$SECURITY_TYPE" = "reality" ]; then
    echo "Flow: $FLOW"
    echo "Fingerprint: chrome"
    echo "Private Key: $PRIVATE_KEY"
    echo "Public Key: $PUBLIC_KEY"
    echo "ShortId: 8236"
    echo "========================================"
    echo "Client URL:"
    echo "vless://$UUID@$RAILWAY_PUBLIC_DOMAIN:443?encryption=none&flow=$FLOW&security=reality&sni=partners.playstation.net&fp=chrome&pbk=$PUBLIC_KEY&sid=8236&type=tcp&allowInsecure=1#Railway-VLESS-Reality"
else
    echo "========================================"
    echo "Client URL:"
    echo "vless://$UUID@$RAILWAY_PUBLIC_DOMAIN:443?encryption=none&security=tls&sni=partners.playstation.net&type=tcp&allowInsecure=1#Railway-VLESS-TLS"
fi

echo "========================================"

# Show certificate information
echo "Certificate information:"
if [ -f "/etc/ssl/certs/partners.playstation.net.crt" ]; then
    openssl x509 -in /etc/ssl/certs/partners.playstation.net.crt -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After :|DNS:)"
fi

echo "========================================"
echo "Starting Xray with configuration: $CONFIG_FILE"

# Start Xray
exec /usr/local/bin/xray run -config $CONFIG_FILE
