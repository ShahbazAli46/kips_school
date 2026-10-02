# KIPS School VPS Deployment Guide

This guide contains the credentials and exact commands needed to deploy changes to the live VPS. Keep this safe so you don't have to guess next time!

## 🌐 Server Details
- **Domain:** `kips.usachunian.com`
- **Server IP:** `162.35.24.176`
- **Username:** `root`
- **Password:** `M4@##40H1=Li7` (Assuming you haven't changed it)
- **Project Directory:** `/var/www/kips`

## 🚀 How to Deploy New Code

Whenever you push new code to the `main` branch on GitHub, simply SSH into your server and run the automated deployment script.

### Step 1: Connect to the Server
Open your terminal and run:
```bash
ssh root@162.35.24.176
```
*(Enter your password when prompted)*

### Step 2: Run the Deploy Script
Once connected, run this exact command to pull the latest code, update dependencies, clear caches, and rebuild the frontend:
```bash
cd /var/www/kips
bash deploy/deploy.sh
```

That's it! The script is designed to handle everything automatically with zero downtime.

## 🛠️ Helpful Commands
If you ever need to manually restart services:
- **Restart Nginx:** `systemctl restart nginx`
- **Restart PHP:** `systemctl restart php8.3-fpm` (or your current PHP version)
- **Restart Frontend:** `pm2 restart kips-frontend`
- **View Frontend Logs:** `pm2 logs kips-frontend`

## 🕒 Build Time Tracking
The sidebar in the frontend automatically displays the **date and time of the last successful build** at the very bottom. This allows you to visually confirm that your latest deployment actually finished and the new code is running.
