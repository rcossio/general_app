# General App — Modular PWA Platform

A full-stack PWA built with the T3 Stack pattern. Single Next.js project handling both
frontend and backend via Route Handlers. Modular architecture: drop a new folder into
`modules/` and register it in `config/modules.ts` to add a feature.

**Active modules:** Workout, Life Tracker

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access 15min + refresh 30d) + bcrypt
- **Styling:** Tailwind CSS (mobile-first)
- **PWA:** manifest.json + service worker
- **Process manager:** PM2
- **Reverse proxy:** Nginx

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/appdb
JWT_ACCESS_SECRET=any-random-string
JWT_REFRESH_SECRET=another-random-string
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To stop: `Ctrl+C`. PostgreSQL keeps running as a system service — no need to restart it.

### Re-running after a reboot

```bash
# Check PostgreSQL is up
sudo systemctl status postgresql
# If stopped:
sudo systemctl start postgresql

# Then just:
npm run dev
```

---

## Production Deployment (Hetzner CX23 — Ubuntu 24.04)

### 1. Create the server

- Provider: [Hetzner Cloud](https://console.hetzner.cloud)
- Image: Ubuntu 24.04
- Type: CX23 (2 vCPU, 4 GB RAM, 40 GB SSD) — ~€3.79/month
- Add your SSH public key during setup
- Attach a Firewall (see Firewall section below)

### 2. SSH into the server

```bash
ssh root@<your-server-ip>
```

### 3. Install system dependencies

```bash
# Update system
apt update && apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Nginx
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# PM2
npm install -g pm2
pm2 startup  # run this — it configures auto-start on reboot automatically, no copy-paste needed

# Git
apt install -y git
```

Verify everything installed correctly:

```bash
node -v && npm -v && psql --version && nginx -v && pm2 -v && git --version
```

### 4. Create PostgreSQL database and user

```bash
sudo -u postgres psql
```

Inside the psql shell:

```sql
CREATE USER appuser WITH PASSWORD 'strongpassword';
CREATE DATABASE appdb OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
\q
```

### 5. Deploy the app

```bash
# Clone the repo
git clone https://github.com/youruser/yourrepo.git /var/www/app
cd /var/www/app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
nano .env  # fill in all values (see Environment Variables section)

# Run database migrations and seed
npx prisma migrate deploy
npx prisma db seed

# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

### 6. Configure Nginx

```bash
cp nginx.conf /etc/nginx/sites-available/app
ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
rm /etc/nginx/sites-enabled/default
nginx -t  # test config
systemctl reload nginx
```

### 7. SSL with Certbot (Let's Encrypt — free)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot auto-renews via a systemd timer — nothing else needed.

---

## Firewall (Hetzner Cloud Console)

Go to **Hetzner Console → Firewalls → Create Firewall** and set:

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 22 (SSH) | Your IP (or `0.0.0.0/0`) |
| Inbound | TCP | 80 (HTTP) | `0.0.0.0/0` |
| Inbound | TCP | 443 (HTTPS) | `0.0.0.0/0` |
| Outbound | All | All | `0.0.0.0/0` |

**Do not open port 3000** (Next.js) or **5432** (PostgreSQL) — they stay internal.

Attach the firewall to your server from the server's Networking tab.

---

## Environment Variables

See `.env.example` for the full list. Required before first run:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (generate a strong random string) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (different from access secret) |
| `NEXT_PUBLIC_APP_URL` | Your public domain, e.g. `https://yourdomain.com` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID (for file uploads) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public URL for R2 bucket |

Optional (for tests):

| Variable | Description |
|---|---|
| `TEST_DATABASE_URL` | Separate test database URL |

---

## Module System

Each module lives in `modules/<name>/` and exports a manifest. To activate or
deactivate a module, edit `config/modules.ts` — no other file needs to change.

### Adding a new module (5 steps)

1. Create `modules/<name>/` with `manifest.ts`, `api/`, `pages/`, `components/`, `lib/`
2. Write the manifest following the shape in `modules/workout/manifest.ts`
3. Add your Prisma models to `prisma/schema.prisma` in a clearly commented section
4. Register in `config/modules.ts`: `import myModule from '@/modules/<name>/manifest'` and add to `activeModules`
5. Run `npx prisma migrate dev --name add_<name>_module`

The nav bar, permissions, and API prefix are all picked up automatically.

---

## Useful Commands

```bash
# Development
npm run dev              # start dev server
npm run build            # production build
npm run test             # run Vitest tests

# Prisma
npx prisma studio        # visual database browser
npx prisma migrate dev   # create + apply a new migration
npx prisma db seed       # seed roles, permissions, admin user

# PM2 (production)
pm2 status               # check running processes
pm2 logs                 # tail logs
pm2 reload app           # zero-downtime reload
pm2 monit                # live monitoring dashboard

# Deployment
bash deploy.sh           # pull, migrate, build, reload PM2
bash backup.sh           # manual database backup to R2
```

---

## Default Admin Account

After seeding, a master admin account is created:

- **Email:** `admin@app.com`
- **Password:** `changeme123`

Change the password immediately after first login.
