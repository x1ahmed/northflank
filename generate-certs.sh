#!/bin/bash

# Create certificate# Generate certificate signing request
openssl req -new -key /etc/ssl/certs/partners.playstation.net.key -out /etc/ssl/certs/partners.playstation.net.csr -config /etc/ssl/certs/partners.playstation.net.conf

# Generate self-signed certificate
openssl x509 -req -in /etc/ssl/certs/partners.playstation.net.csr -signkey /etc/ssl/certs/partners.playstation.net.key -out /etc/ssl/certs/partners.playstation.net.crt -days 365 -extensions v3_req -extfile /etc/ssl/certs/partners.playstation.net.conf

# Set proper permissions
chmod 644 /etc/ssl/certs/partners.playstation.net.crt
chmod 600 /etc/ssl/certs/partners.playstation.net.keyry
mkdir -p /etc/ssl/certs

# Generate private key for partners.playstation.net
openssl genrsa -out /etc/ssl/certs/partners.playstation.net.key 2048

# Create certificate signing request
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
openssl req -new -key /etc/xray/certs/partners.playstation.net.key -out /etc/xray/certs/partners.playstation.net.csr -config /etc/xray/certs/partners.playstation.net.conf

# Generate self-signed certificate
openssl x509 -req -in /etc/xray/certs/partners.playstation.net.csr -signkey /etc/xray/certs/partners.playstation.net.key -out /etc/xray/certs/partners.playstation.net.crt -days 365 -extensions v3_req -extfile /etc/xray/certs/partners.playstation.net.conf

# Set proper permissions
chmod 644 /etc/xray/certs/partners.playstation.net.crt
chmod 600 /etc/xray/certs/partners.playstation.net.key

echo "Certificate generated for partners.playstation.net"
