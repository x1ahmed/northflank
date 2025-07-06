# VLESS Reality Proxy for Railway

This project deploys a VLESS proxy with Reality protocol on Railway platform.

## Configuration

The proxy is configured with the following settings:
- **Port**: 443
- **SNI**: www.microsoft.com
- **Fingerprint**: chrome
- **Public Key**: Generated automatically
- **Short ID**: 8236

## Deployment on Railway

1. Connect this repository to Railway
2. Railway will automatically build and deploy using the Dockerfile
3. After deployment, check the logs to get your client configuration
4. The UUID will be automatically generated on each deployment

## Client Configuration

After deployment, you'll see the complete client configuration in the logs, including:
- Generated UUID
- Generated Reality private and public keys
- Railway domain
- Complete VLESS URL for easy import

## Files

- `Dockerfile`: Container configuration
- `config.json`: Xray configuration with Reality settings
- `entrypoint.sh`: Startup script that generates UUID and displays config
- `railway.json`: Railway deployment configuration

## Security Notes

- Reality key pair is generated automatically on each deployment for maximum security
- Private and public keys are displayed in deployment logs
- UUID is generated automatically for security
- Reality protocol provides traffic camouflage
- SNI is set to Microsoft's domain for reliable SSL certificates
- Traffic appears as legitimate HTTPS to Microsoft's servers

## Usage

Copy the generated VLESS URL from the deployment logs and import it into your VLESS client (V2Ray, Clash, etc.).
