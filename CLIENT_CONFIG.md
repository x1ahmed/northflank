# Reality VLESS Configuration Template

## Quick Setup for Common Clients

### v2rayN / v2rayNG
1. Add server manually
2. Configure as follows:
   - **Address**: [Your Server IP]
   - **Port**: 17306
   - **UUID**: [Generated UUID from web interface]
   - **Security**: reality
   - **SNI**: partners.playstation.net
   - **uTLS**: chrome
   - **Reality Public Key**: eqTREGmvRVdLzIlSjxFrqJ9oxBpNTfMqnMdMDMHCEBs
   - **Short ID**: 8236
   - **Transport**: tcp
   - **Flow**: xtls-rprx-vision

### Clash Meta
```yaml
proxies:
  - name: "Reality-Proxy"
    type: vless
    server: [Your Server IP]
    port: 17306
    uuid: [Generated UUID]
    network: tcp
    tls: true
    reality-opts:
      public-key: "eqTREGmvRVdLzIlSjxFrqJ9oxBpNTfMqnMdMDMHCEBs"
      short-id: "8236"
    servername: partners.playstation.net
    flow: xtls-rprx-vision
```

### Xray Core Config
```json
{
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "[Your Server IP]",
            "port": 17306,
            "users": [
              {
                "id": "[Generated UUID]",
                "flow": "xtls-rprx-vision",
                "encryption": "none"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "fingerprint": "chrome",
          "serverName": "partners.playstation.net",
          "publicKey": "eqTREGmvRVdLzIlSjxFrqJ9oxBpNTfMqnMdMDMHCEBs",
          "shortId": "8236"
        }
      }
    }
  ]
}
```

### Notes
- Replace `[Your Server IP]` with your actual server IP address
- Replace `[Generated UUID]` with the UUID from your web interface
- These settings match the Reality configuration in your server
- Make sure your client supports Reality protocol
