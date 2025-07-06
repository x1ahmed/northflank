#!/bin/bash

# Create directories for certificates
mkdir -p /etc/letsencrypt/live/partners.playstation.net
mkdir -p /etc/ssl/certs
mkdir -p /var/www/html/.well-known/acme-challenge

# Function to generate self-signed certificate as fallback
generate_self_signed() {
    echo "Generating self-signed certificate for partners.playstation.net..."
    
    # Generate private key
    openssl genrsa -out /etc/ssl/certs/partners.playstation.net.key 2048
    
    # Create certificate configuration
    cat > /etc/ssl/certs/partners.playstation.net.conf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CA
L = San Francisco
O = PlayStation
OU = Partners
CN = partners.playstation.net

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = partners.playstation.net
DNS.2 = *.partners.playstation.net
EOF

    # Generate certificate signing request
    openssl req -new -key /etc/ssl/certs/partners.playstation.net.key \
        -out /etc/ssl/certs/partners.playstation.net.csr \
        -config /etc/ssl/certs/partners.playstation.net.conf

    # Generate self-signed certificate
    openssl x509 -req -in /etc/ssl/certs/partners.playstation.net.csr \
        -signkey /etc/ssl/certs/partners.playstation.net.key \
        -out /etc/ssl/certs/partners.playstation.net.crt \
        -days 365 -extensions v3_req \
        -extfile /etc/ssl/certs/partners.playstation.net.conf

    # Copy to Let's Encrypt directory for consistency
    cp /etc/ssl/certs/partners.playstation.net.crt /etc/letsencrypt/live/partners.playstation.net/fullchain.pem
    cp /etc/ssl/certs/partners.playstation.net.key /etc/letsencrypt/live/partners.playstation.net/privkey.pem

    # Set proper permissions
    chmod 644 /etc/ssl/certs/partners.playstation.net.crt
    chmod 600 /etc/ssl/certs/partners.playstation.net.key
    chmod 644 /etc/letsencrypt/live/partners.playstation.net/fullchain.pem
    chmod 600 /etc/letsencrypt/live/partners.playstation.net/privkey.pem

    echo "Self-signed certificate generated successfully"
}

# Try to get a real certificate with Certbot (this will likely fail in Railway but we try anyway)
if [ ! -z "$CERTBOT_DOMAIN" ] && [ ! -z "$CERTBOT_EMAIL" ]; then
    echo "Attempting to get Let's Encrypt certificate for $CERTBOT_DOMAIN..."
    
    # Start nginx for HTTP validation
    nginx -g "daemon on;" 2>/dev/null || true
    
    # Try to get certificate
    certbot certonly --webroot --webroot-path=/var/www/html \
        --email $CERTBOT_EMAIL --agree-tos --no-eff-email \
        -d $CERTBOT_DOMAIN --non-interactive 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "Let's Encrypt certificate obtained successfully"
        # Copy certificates to our directory
        cp /etc/letsencrypt/live/$CERTBOT_DOMAIN/fullchain.pem /etc/ssl/certs/partners.playstation.net.crt
        cp /etc/letsencrypt/live/$CERTBOT_DOMAIN/privkey.pem /etc/ssl/certs/partners.playstation.net.key
    else
        echo "Let's Encrypt certificate generation failed, using self-signed certificate"
        generate_self_signed
    fi
else
    echo "CERTBOT_DOMAIN and CERTBOT_EMAIL not set, using self-signed certificate"
    generate_self_signed
fi

echo "Certificate setup completed"
