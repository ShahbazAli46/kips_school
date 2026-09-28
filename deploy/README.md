# 🚀 KIPS School VPS Deployment & Performance Package

This directory contains everything you need to deploy the **KIPS School Management System** to a **2GB RAM Ubuntu VPS** with maximum speed, ultra-fast Gzip/HTTP compression, and PHP OPcache.

---

## 📁 Package Contents

| File | Purpose |
| :--- | :--- |
| **`nginx.conf`** | Complete Nginx config with fast Gzip JSON compression, SSL readiness, PHP-FPM fastcgi, and Next.js reverse proxy. |
| **`opcache.ini`** | Production OPcache tuning configuration for PHP 8.3 (2x–3x API speedup). |
| **`supervisor-queue.conf`** | Daemon configuration to keep background WhatsApp & PDF workers running forever. |
| **`setup_vps.sh`** | **1-Click automated server setup** (Installs PHP 8.3, Nginx, Bun, PM2, creates 2GB swap file, configures firewall). |
| **`deploy.sh`** | **1-Click deployment script** to run anytime you push updates (pulls code, compiles caches, restarts workers & Next.js). |

---

## 🛠️ Step-by-Step VPS Setup Guide

### Step 1: Connect to your fresh Ubuntu VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Clone the Project
```bash
mkdir -p /var/www
cd /var/www
git clone <your-git-repo-url> kips
cd /var/www/kips
```

### Step 3: Run the 1-Click Server Provisioning Script
```bash
sudo bash deploy/setup_vps.sh
```

### Step 4: Configure Environment Files
1. **Backend `.env`**:
   ```bash
   cp school_backend/.env.example school_backend/.env
   nano school_backend/.env
   ```
   * Set your database credentials (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).
   * Set `APP_ENV=production` and `APP_DEBUG=false`.
   * Set `QUEUE_CONNECTION=database`.

2. **Frontend `.env.production`**:
   ```bash
   nano school_frontend/.env.production
   ```
   * Set `NEXT_PUBLIC_API_URL=http://your-vps-ip/api` (or your domain).

### Step 5: Link Nginx & Supervisor Configurations
```bash
# Nginx setup
sudo cp deploy/nginx.conf /etc/nginx/sites-available/kips
sudo ln -s /etc/nginx/sites-available/kips /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Supervisor queue worker setup
sudo cp deploy/supervisor-queue.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start school-queue:*
```

### Step 6: Run the 1-Click Deploy Script
```bash
sudo bash deploy/deploy.sh
```

---

## 🚀 HTTP Compression (Zstd & Brotli)

To make your API responses incredibly fast, you should enable HTTP compression. Since this is an **Interserver VPS** (which gives you full root access), you have two ways to do this:

### Option 1: The Cloudflare Way (Highly Recommended & Easiest)
You don't even need to configure your VPS for this. Just put Cloudflare in front of your domain:
1. Point your domain's nameservers to Cloudflare.
2. In the Cloudflare Dashboard, go to **Speed** -> **Optimization** -> **Content Optimization**.
3. Turn on both **Brotli** and **Zstd**.
*Cloudflare will automatically compress all JSON from Laravel and send it to the browser perfectly.*

### Option 2: The Nginx Way (Direct on Interserver VPS)
If you aren't using Cloudflare, the `nginx.conf` provided in this package already has standard `gzip` compression enabled (which is 90% as good as Brotli/Zstd and works out of the box).
If you explicitly want Brotli or Zstd on your Interserver VPS Nginx server:
1. You must compile Nginx with custom modules (`nginx-module-brotli` or `nginx-module-zstd`).
2. This requires manual server administration, which is why **Option 1 (Cloudflare)** is vastly preferred for standard deployments!

---

## 🔄 Daily Code Updates (How to Deploy New Changes)

Whenever you push new code to GitHub, simply run on your VPS:
```bash
cd /var/www/kips
sudo bash deploy/deploy.sh
```
This automatically updates both backend and frontend, clears caches, runs migrations, and restarts your workers seamlessly!
