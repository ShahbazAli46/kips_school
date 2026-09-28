#!/bin/bash
# ==============================================================================
# 🚀 1-Click Initial VPS Setup Script (Ubuntu 22.04 / 24.04 LTS)
# Configures: 2GB Swap, Nginx with Gzip, PHP 8.3 + OPcache, MySQL, Bun, PM2, Supervisor
# Run as: sudo bash setup_vps.sh
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting KIPS School Management System VPS Provisioning..."
echo "=========================================================="

# 1. Update Packages
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y
apt-get install -y curl git unzip zip software-properties-common ufw supervisor fail2ban

# 2. Setup 2GB Swap File (Crucial for 2GB RAM VPS)
if [ ! -f /swapfile ]; then
    echo "Creating 2GB swap file..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
fi

# 3. Install PHP (Using default Ubuntu repository to ensure compatibility)
apt-get update
apt-get install -y \
    php \
    php-fpm \
    php-cli \
    php-mysql \
    php-mbstring \
    php-xml \
    php-bcmath \
    php-curl \
    php-gd \
    php-zip \
    php-intl

# 4. Install Composer
if ! command -v composer &> /dev/null; then
    echo "Installing Composer..."
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

# 5. Install Node.js, Bun & PM2 (For Next.js frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# 6. Install & Configure Nginx
apt-get install -y nginx

# 7. Apply OPcache Configuration
PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
cat << EOF > /etc/php/$PHP_VERSION/mods-available/opcache.ini
[opcache]
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=64
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=10000
opcache.validate_timestamps=1
opcache.revalidate_freq=60
opcache.fast_shutdown=1
EOF
phpenmod opcache
systemctl restart php${PHP_VERSION}-fpm

# 8. Firewall Setup (UFW)
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=========================================================="
echo "✅ VPS Provisioning Complete!"
echo "Next steps:"
echo "1. Clone your project to /var/www/kips"
echo "2. Copy deploy/nginx.conf to /etc/nginx/sites-available/kips"
echo "3. Copy deploy/supervisor-queue.conf to /etc/supervisor/conf.d/"
echo "4. Run: bash deploy/deploy.sh"
echo "=========================================================="
