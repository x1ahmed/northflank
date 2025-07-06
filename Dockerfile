FROM alpine:latest

# Install required packages
RUN apk add --no-cache \
    curl \
    unzip \
    bash \
    ca-certificates

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
RUN mkdir -p /etc/xray /var/log/xray

# Copy configuration and entrypoint
COPY config.json /etc/xray/config.json
COPY entrypoint.sh /entrypoint.sh

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 443

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]