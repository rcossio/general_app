# Deployment Guide — VPS Setup (Hetzner CX23, Ubuntu 24.04)

This file is the single source of truth for deploying this app on the VPS.
A Claude instance on the VPS should read this file, verify each step, and complete what is missing.

---

## Server Specs

- Provider: Hetzner Cloud
- Type: CX23 (2 vCPU, 4 GB RAM, 40 GB SSD)
- OS: Ubuntu 24.04
- App location: `/var/www/app`
- App runs on: port 3000 (internal only)
- Nginx proxies: port 80/443 → 3000

---

## Step 1 — System Update

**Verify:** `apt list --upgradable 2>/dev/null | wc -l` should return `1` (just the header line).

**If not done:**
```bash
apt update && apt upgrade -y
```

---

## Step 2 — Node.js 20

**Verify:** `node -v` should print `v20.x.x`

**If not done:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

---

## Step 3 — PostgreSQL

**Verify:** `systemctl is-active postgresql` should print `active`

**If not done:**
```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

---

## Step 4 — Nginx

**Verify:** `systemctl is-active nginx` should print `active`

**If not done:**
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

---

## Step 5 — PM2

**Verify:** `pm2 -v` should print a version number. `systemctl is-enabled pm2-root` should print `enabled`.

**If not done:**
```bash
npm install -g pm2
pm2 startup   # run this — it configures auto-start automatically, no copy-paste needed
```

---

## Step 6 — Git

**Verify:** `git --version` should print a version number.

**If not done:**
```bash
apt install -y git
```

---

## Step 7 — PostgreSQL Database and User

**Verify:**
```bash
sudo -u postgres psql -c "\l" | grep appdb
```
Should show the `appdb` database.

**If not done:**
```bash
sudo -u postgres psql
```
```sql
CREATE USER appuser WITH PASSWORD 'strongpassword';
CREATE DATABASE appdb OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
\q
```

---

## Step 8 — Clone the Repository

**Verify:** `ls /var/www/app/package.json` should exist.

**If not done:**
```bash
git clone https://github.com/rcossio/general_app.git /var/www/app
```

---

## Step 9 — Environment Variables

**Verify:** `ls /var/www/app/.env` should exist. Check it has real values (not empty) for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

**If not done:**
```bash
cd /var/www/app
cp .env.example .env
nano .env
```

Fill in:
- `DATABASE_URL=postgresql://appuser:strongpassword@localhost:5432/appdb`
- `JWT_ACCESS_SECRET=` — generate with `openssl rand -base64 64`
- `JWT_REFRESH_SECRET=` — generate with `openssl rand -base64 64` (different value)
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `NEXT_PUBLIC_APP_URL=http://<server-ip>` (use domain once DNS is set up)

R2 variables can be left blank until file uploads are needed.

---

## Step 10 — Install Dependencies

**Verify:** `ls /var/www/app/node_modules` should exist.

**If not done:**
```bash
cd /var/www/app
npm install
```

---

## Step 11 — Run Migrations and Seed

**Verify:**
```bash
sudo -u postgres psql -d appdb -c "\dt" | grep users
```
Should list the `users` table.

**If not done:**
```bash
cd /var/www/app
npx prisma migrate deploy
npx prisma db seed
```

---

## Step 12 — Build

**Verify:** `ls /var/www/app/.next/BUILD_ID` should exist.

**If not done:**
```bash
cd /var/www/app
npm run build
```

---

## Step 13 — Start with PM2

**Verify:** `pm2 status` should show the app with status `online`.

**If not done:**
```bash
cd /var/www/app
pm2 start ecosystem.config.js
pm2 save
```

---

## Step 14 — Configure Nginx

**Verify:** `ls /etc/nginx/sites-enabled/app` should exist. `nginx -t` should print `syntax is ok`.

**If not done:**
```bash
cp /var/www/app/nginx.conf /etc/nginx/sites-available/app
ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## Step 15 — SSL with Certbot

**Verify:** `certbot certificates` should show a valid certificate for your domain.

**Prerequisite:** DNS A record must point to this server's IP before running Certbot.

**If not done:**
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

Auto-renewal is handled by systemd — nothing else needed.

---

## Firewall (Hetzner Cloud Console — not on the server)

Configured in Hetzner Console → Firewalls. Required rules:

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 22 | Your IP |
| Inbound | TCP | 80 | `0.0.0.0/0` |
| Inbound | TCP | 443 | `0.0.0.0/0` |
| Outbound | All | All | `0.0.0.0/0` |

Do not open port 3000 or 5432 — they stay internal.

---

## Default Admin Account

Created by `prisma db seed`:
- Email: `admin@app.com`
- Password: `changeme123`

**Change this immediately after first login.**

---

## Useful Commands

```bash
# App
pm2 status                  # check if app is running
pm2 logs                    # tail logs
pm2 reload app              # zero-downtime reload
pm2 monit                   # live dashboard

# Database
sudo -u postgres psql       # enter postgres shell
npx prisma migrate deploy   # apply pending migrations
npx prisma db seed          # re-seed roles, permissions, admin user

# Nginx
nginx -t                    # test config
systemctl reload nginx      # apply config changes

# Redeploy
cd /var/www/app && bash deploy.sh
```
