# VLESS Reality/TLS Proxy with Certbot for Railway

This project deploys a VLESS proxy with Reality protocol and Certbot SSL certificates on Railway platform.

## Configuration

The proxy supports two modes:
1. **TLS Mode**: Uses Certbot-generated SSL certificates
2. **Reality Mode**: Falls back to Reality protocol with custom certificates

### Default Settings:
- **Port**: 443
- **SNI**: partners.playstation.net
- **Fingerprint**: chrome
- **Short ID**: 8236

## Environment Variables

Set these in Railway's environment variables:

```
CERTBOT_EMAIL=your-email@example.com
CERTBOT_DOMAIN=partners.playstation.net
```

## Deployment on Railway

1. **Set Environment Variables**:
   - `CERTBOT_EMAIL`: Your email for Let's Encrypt
   - `CERTBOT_DOMAIN`: The domain for SSL certificate (partners.playstation.net)

2. **Connect Repository**: Connect this repository to Railway

3. **Deploy**: Railway will automatically build and deploy

4. **Check Logs**: After deployment, check logs for your client configuration

## Certificate Management

### Automatic Certificate Generation
- First tries to get Let's Encrypt certificate via Certbot
- Falls back to self-signed certificate if Let's Encrypt fails
- Uses TLS mode if certificates are available
- Falls back to Reality mode if certificate generation fails

### Manual Certificate Setup
If you have your own certificates, place them at:
- `/etc/ssl/certs/partners.playstation.net.crt`
- `/etc/ssl/certs/partners.playstation.net.key`

## Files

- `Dockerfile`: Container configuration with Certbot
- `config.json`: Xray Reality configuration 
- `config-tls.json`: Xray TLS configuration
- `entrypoint-certbot.sh`: Main startup script with certificate setup
- `setup-certs.sh`: Certificate generation script
- `nginx.conf`: Nginx configuration for HTTP validation
- `railway.toml`: Railway deployment configuration

## Security Features

- ✅ **Let's Encrypt Integration**: Automatic SSL certificate generation
- ✅ **Dual Mode Support**: TLS and Reality protocol support
- ✅ **Certificate Validation**: Proper SSL/TLS certificate handling
- ✅ **Automatic Fallback**: Falls back to Reality if TLS fails
- ✅ **Fresh Keys**: New UUID and Reality keys on each deployment

## Client Configuration

After deployment, the logs will show either:

### TLS Mode
```
vless://[uuid]@your-app.railway.app:443?encryption=none&security=tls&sni=partners.playstation.net&type=tcp&allowInsecure=1#Railway-VLESS-TLS
```

### Reality Mode (Fallback)
```
vless://[uuid]@your-app.railway.app:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=partners.playstation.net&fp=chrome&pbk=[public-key]&sid=8236&type=tcp&allowInsecure=1#Railway-VLESS-Reality
```

## Troubleshooting

### Certificate Issues
- Check `CERTBOT_EMAIL` and `CERTBOT_DOMAIN` environment variables
- Verify domain DNS points to Railway deployment
- Check logs for certificate generation errors

### TLS Internal Errors
- The system automatically falls back to Reality mode
- Self-signed certificates are generated as backup
- Check certificate validity in logs

## Usage

1. Set environment variables in Railway
2. Deploy the application
3. Copy the generated VLESS URL from logs
4. Import into your VLESS client (V2Ray, Clash, etc.)
