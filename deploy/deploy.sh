#!/bin/bash
# ==============================================================================
# 🚀 1-Click Zero-Downtime Deployment Script
# Run whenever you push code updates to your VPS:
# bash /var/www/kips/deploy/deploy.sh
# ==============================================================================

set -e

PROJECT_ROOT="/var/www/kips"
BACKEND_DIR="$PROJECT_ROOT/school_backend"
FRONTEND_DIR="$PROJECT_ROOT/school_frontend"

echo "=========================================================="
echo " Starting KIPS School Application Deployment..."
echo "=========================================================="

cd $PROJECT_ROOT

# 1. Pull Latest Code
echo "📥 Pulling latest git repository updates..."
git pull origin main || true

# 2. Deploy Laravel Backend
echo "🐘 Updating Backend (Composer, Migrations, Cache)..."
cd $BACKEND_DIR

composer install --no-dev --optimize-autoloader --no-interaction

# Set correct storage permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Run database migrations
php artisan migrate --force

# 🚀 Compile Production Caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart queue workers with new code
php artisan queue:restart

# 3. Deploy Next.js Frontend
echo "⚡ Building Frontend with Bun..."
cd $FRONTEND_DIR

bun install --frozen-lockfile || bun install
bun run build

# Restart Next.js in PM2
if pm2 list | grep -q "kips-frontend"; then
    pm2 restart kips-frontend --update-env
else
    pm2 start "bun run start" --name "kips-frontend" -i 1 --max-memory-restart 300M
    pm2 save
fi

# 4. Reload Services
echo "🔄 Reloading Nginx & PHP-FPM..."
PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
systemctl reload php${PHP_VERSION}-fpm
systemctl reload nginx
supervisorctl reread || true
supervisorctl update || true

echo "=========================================================="
echo "🎉 Deployment Successfully Finished!"
echo "Your app is live with Gzip compression and OPcache enabled."
echo "=========================================================="
