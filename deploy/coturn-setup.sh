#!/bin/bash
# ==============================================================================
# ZenSend - Coturn (TURN/STUN) Automated Installer for Oracle Cloud Ubuntu
# Powered by Zentyr
# ==============================================================================
# Run this script on your Oracle Cloud Ubuntu instance:
#   chmod +x coturn-setup.sh
#   sudo ./coturn-setup.sh
# ==============================================================================

set -e

echo "🚀 Starting Coturn setup for ZenSend..."

# Check root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use: sudo ./coturn-setup.sh)"
  exit 1
fi

# Detect Public IP
PUBLIC_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org)
echo "📍 Detected Public IP: ${PUBLIC_IP}"

read -p "Enter TURN Username [zensend]: " TURN_USER
TURN_USER=${TURN_USER:-zensend}

read -p "Enter TURN Password (keep this secret) [zensend1234]: " TURN_PASS
TURN_PASS=${TURN_PASS:-zensend1234}

read -p "Enter Realm/Domain [zentyr.com]: " TURN_REALM
TURN_REALM=${TURN_REALM:-zentyr.com}

echo "📦 Installing coturn..."
apt-get update
apt-get install -y coturn

echo "⚙️ Configuring /etc/turnserver.conf..."
cat <<EOF > /etc/turnserver.conf
# ==========================================
# ZenSend Coturn Configuration (Oracle Free Tier)
# ==========================================
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0

# External Public IP for NAT
external-ip=${PUBLIC_IP}

# Credentials & Realm
realm=${TURN_REALM}
user=${TURN_USER}:${TURN_PASS}
lt-cred-mech
fingerprint

# Security & Limits
no-cli
no-multicast-peers
no-loopback-peers
max-allocate-timeout=600

# Relay UDP Port Range
min-port=49152
max-port=65535

# Logging
verbose
log-file=/var/log/turnserver.log
EOF

# Enable daemon
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/g' /etc/default/coturn 2>/dev/null || true

echo "🛡️ Configuring Ubuntu Firewall (UFW) if active..."
if ufw status | grep -q "active"; then
  ufw allow 3478/tcp
  ufw allow 3478/udp
  ufw allow 5349/tcp
  ufw allow 5349/udp
  ufw allow 49152:65535/udp
  ufw reload
  echo "✅ UFW firewall rules updated"
fi

# Also configure iptables (Oracle Ubuntu default firewall often blocks non-SSH)
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3478 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p udp --dport 3478 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5349 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p udp --dport 5349 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p udp --dport 49152:65535 -j ACCEPT

# Restart service
echo "🔄 Starting Coturn service..."
systemctl restart coturn
systemctl enable coturn

echo ""
echo "=================================================================="
echo "✅ Coturn (TURN/STUN) setup complete!"
echo "=================================================================="
echo "Use these credentials in your ZenSend .env on Vercel:"
echo ""
echo "TURN_SERVER_URL=turn:${PUBLIC_IP}:3478"
echo "TURN_USERNAME=${TURN_USER}"
echo "TURN_CREDENTIAL=${TURN_PASS}"
echo ""
echo "⚠️ IMPORTANT FOR ORACLE CLOUD USERS:"
echo "Make sure to add Ingress Rules in your Oracle Cloud Console:"
echo "Virtual Cloud Network -> Security Lists -> Ingress Rules"
echo "  - Port 3478 (TCP/UDP) from 0.0.0.0/0"
echo "  - Port 5349 (TCP/UDP) from 0.0.0.0/0"
echo "  - Port 49152-65535 (UDP) from 0.0.0.0/0"
echo "=================================================================="
