FROM alpine:latest

# Install required packages
RUN apk add --no-cache \
    curl \
    unzip \
    bash \
    ca-certificates \
    openssl \
    certbot \
    nginx

# Download and install Xray
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then ARCH="64"; fi && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64-v8a"; fi && \
    curl -L -o /tmp/Xray-linux-${ARCH}.zip https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-${ARCH}.zip && \
    unzip /tmp/Xray-linux-${ARCH}.zip -d /tmp && \
    mv /tmp/xray /usr/local/bin/xray && \
    chmod +x /usr/local/bin/xray && \
    rm -rf /tmp/*

# Create directories
RUN mkdir -p /etc/xray /var/log/xray /var/www/html /etc/nginx/conf.d

# Copy configuration and scripts
COPY config.json /etc/xray/config.json
COPY config-tls.json /etc/xray/config-tls.json
COPY entrypoint.sh /entrypoint.sh
COPY entrypoint-with-certs.sh /entrypoint-with-certs.sh
COPY entrypoint-certbot.sh /entrypoint-certbot.sh
COPY generate-certs.sh /generate-certs.sh
COPY setup-certs.sh /setup-certs.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Make scripts executable
RUN chmod +x /entrypoint.sh && \
    chmod +x /entrypoint-with-certs.sh && \
    chmod +x /entrypoint-certbot.sh && \
    chmod +x /generate-certs.sh && \
    chmod +x /setup-certs.sh

# Expose ports
EXPOSE 443 80

# Set entrypoint
ENTRYPOINT ["/entrypoint-certbot.sh"]