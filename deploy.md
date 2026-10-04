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

## 🕒 Build Date & Time Tracking (Sidebar Verification)
The sidebar in the frontend automatically displays the **date and time of the last successful deployment** at the very bottom (below *"Topper's First Choice"*).

### How it Works:
1. When `deploy/deploy.sh` runs `bun run build`, Next.js reads `next.config.ts` which evaluates:
   ```ts
   NEXT_PUBLIC_BUILD_TIME: new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })
   ```
2. The current Pakistan Standard Time timestamp is automatically baked into the client production bundle at build time.
3. Once the deployment finishes and PM2 restarts the frontend, anyone loading the application will see the new timestamp (e.g., `Build: 10/4/2026, 10:45:00 PM`) at the bottom of the sidebar.
4. **Verification Step:** After deploying, refresh the browser (or do a Hard Refresh `Ctrl+Shift+R` / `Cmd+Shift+R`) to confirm the timestamp matches the time you ran the deployment.
