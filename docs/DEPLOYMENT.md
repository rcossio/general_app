# Deployment Guide — Hetzner CX23, Ubuntu 24.04

This file is the single source of truth for deploying this app on the VPS.
An agent or human can read this file, verify each step, and complete what is missing.

---

## Ingredients — Have These Ready Before Starting

### Server
- Provider: Hetzner Cloud
- Type: CX23 (2 vCPU, 4 GB RAM, 40 GB SSD)
- OS: Ubuntu 24.04
- SSH access as root

### Domain
- A registered domain name pointing to the server IP via DNS A record (for both `@` and `www`)
- DNS must propagate before running Certbot (Step 15)

### Firewall (Hetzner Cloud Console — not on the server)
Configure in Hetzner Console → Firewalls before anything else:

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 22 | Your IP |
| Inbound | TCP | 80 | `0.0.0.0/0` |
| Inbound | TCP | 443 | `0.0.0.0/0` |
| Outbound | All | All | `0.0.0.0/0` |

Do not open port 3000 or 5432 — they stay internal.

### Values to prepare before starting
Have these ready before you begin — you will need them during `.env` setup:

| Value | Notes |
|---|---|
| DB password | Pick a strong password for the `appuser` PostgreSQL role |
| `JWT_ACCESS_SECRET` | Generate: `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 64` (different from above) |
| `ADMIN_EMAIL` | Email for the initial master admin app account (does not need to be real) |
| `ADMIN_PASSWORD` | Strong password for the initial master admin app account |

---

## Procedure

### Step 1 — System Update

**Verify:** `apt list --upgradable 2>/dev/null | wc -l` should return `1` (just the header line).

**If not done:**
```bash
apt update && apt upgrade -y
```

---

### Step 2 — Node.js 20

**Verify:** `node -v` should print `v20.x.x`

**If not done:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

---

### Step 3 — PostgreSQL

**Verify:** `systemctl is-active postgresql` should print `active`

**If not done:**
```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

---

### Step 4 — Nginx

**Verify:** `systemctl is-active nginx` should print `active`

**If not done:**
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

---

### Step 5 — PM2

**Verify:** `pm2 -v` should print a version number. `systemctl is-enabled pm2-root` should print `enabled`.

**If not done:**
```bash
npm install -g pm2
pm2 startup   # run this — it configures auto-start automatically, no copy-paste needed
```

---

### Step 6 — Git

**Verify:** `git --version` should print a version number.

**If not done:**
```bash
apt install -y git
```

---

### Step 7 — PostgreSQL Database and User

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
CREATE USER appuser WITH PASSWORD '<your-db-password>';
CREATE DATABASE appdb OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
ALTER USER appuser CREATEDB;   -- required for prisma migrate dev shadow database
\q
```

**Note:** `CREATEDB` is needed if you ever run `prisma migrate dev` on the server
(e.g. for local testing). `prisma migrate deploy` (used in `deploy.sh`) does **not**
require it. If you skip `CREATEDB` and later run `migrate dev`, it will fail with
"permission denied to create database".

---

### Step 8 — Clone the Repository

**Verify:** `ls /var/www/app/package.json` should exist.

**If not done:**
```bash
git clone https://github.com/yourusername/yourrepo.git /var/www/app
```

---

### Step 9 — Environment Variables

**Verify:** `ls /var/www/app/.env` should exist. Check it has real values (not empty) for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

**If not done:**
```bash
cd /var/www/app
cp .env.example .env
nano .env
```

Fill in:
- `DATABASE_URL=postgresql://appuser:<your-db-password>@localhost:5432/appdb`
- `JWT_ACCESS_SECRET=` — generate with `openssl rand -base64 64`
- `JWT_REFRESH_SECRET=` — generate with `openssl rand -base64 64` (different value)
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- `ADMIN_EMAIL=` — email for the initial master admin account
- `ADMIN_PASSWORD=` — strong password for the initial master admin account

R2 variables can be left blank until file uploads are needed.

---

### Step 9b — Verify DB Credentials

**Verify:** The password in `DATABASE_URL` must match the PostgreSQL user password set in Step 7.

```bash
cd /var/www/app
source .env 2>/dev/null || export $(grep -v '^#' .env | xargs)
psql "$DATABASE_URL" -c "SELECT 1" 2>&1
```

Should print `(1 row)`. If it fails with "authentication failed", reset the PostgreSQL password to match `.env`:

```bash
sudo -u postgres psql -c "ALTER USER appuser WITH PASSWORD '<your-db-password>';"
```

---

### Step 10 — Install Dependencies

**Verify:** `ls /var/www/app/node_modules` should exist.

**If not done:**
```bash
cd /var/www/app
npm install
```

---

### Step 11 — Run Migrations and Seed

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

**What seed creates:** roles, permissions, master admin account, and 10 bot community
users with public workouts and tracker entries. The community feed will be populated
immediately after first deploy. The seed is idempotent — safe to re-run.

---

### Step 12 — Build

**Verify:** `ls /var/www/app/.next/BUILD_ID` should exist.

**If not done:**
```bash
cd /var/www/app
pm2 stop all  # stop PM2 before building to avoid an incomplete .next output
npm run build
```

**Important:** Always stop PM2 before rebuilding. A running instance can interfere with the build and leave `.next` without a `BUILD_ID`, causing PM2 to crash on start.

---

### Step 13 — Start with PM2

**Verify:** `pm2 status` should show the app with status `online`.

**If not done:**
```bash
cd /var/www/app
pm2 start ecosystem.config.js
pm2 save
```

**Troubleshooting — app starts then immediately crashes:** If `pm2 status` shows `errored` or a high restart count within seconds of starting, check:

1. `cwd` in `ecosystem.config.js` must be `/var/www/app`
2. `.next/BUILD_ID` must exist — if missing, the build was incomplete; run `npm run build` again

```bash
pm2 logs --err --lines 20  # shows the actual crash reason
```

---

### Step 14 — Configure Nginx

**Verify:** `ls /etc/nginx/sites-enabled/app` should exist. `nginx -t` should print `syntax is ok`.

**If not done:**
```bash
cp /var/www/app/nginx.conf /etc/nginx/sites-available/app
# Edit server_name to your actual domain before enabling:
nano /etc/nginx/sites-available/app
ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

**Note:** `nginx.conf` in the repo is a template with `yourdomain.com` placeholders. The live config at `/etc/nginx/sites-available/app` is what actually runs and will be modified by Certbot — do not copy from the repo over it after SSL is set up.

---

### Step 15 — SSL with Certbot

**Verify:** `certbot certificates` should show a valid certificate for your domain.

**Prerequisite:** DNS A record must point to the server IP before running Certbot.

**If not done:**
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Auto-renewal is handled by systemd — nothing else needed.

---

## Admin Account

Created by `npx prisma db seed` using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `.env`.
Log in with those credentials after the first deploy.

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
