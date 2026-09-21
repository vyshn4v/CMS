# Automated Deployment & CI/CD Guide

This guide provides end-to-end instructions for deploying the **Headless CMS Monolith** to a remote Linux server (Ubuntu, Debian, Oracle Linux) using **GitHub Actions**, **SSH**, and **PM2**.

---

## 🏗️ Architecture & Deployment Flow

```mermaid
flowchart TD
    Developer["Developer"] -->|"git push main / Merge PR"| GitHub["GitHub Repository"]
    GitHub -->|"Trigger CI/CD"| Runner["GitHub Actions Runner\n(ubuntu-latest, Node.js 20)"]

    subgraph "GitHub Actions Pipeline"
        Runner -->|"1. npm ci"| DepStep["Install Dependencies"]
        DepStep -->|"2. npx prisma generate"| PrismaStep["Prisma Client Generation"]
        PrismaStep -->|"3. npm run test"| TestStep["Automated Unit Tests"]
        TestStep -->|"4. npm run build"| BuildStep["Compile All Workspaces\n(api, web, shared-types)"]
        BuildStep -->|"5. tar -czf"| BundleStep["Bundle Deploy Artifact\n(deploy.tar.gz)"]
    end

    BundleStep -->|"6. SCP over SSH\n(Port 22)"| TargetServer["Remote Server / VPS\n(e.g., /home/ubuntu/cms-backend)"]

    subgraph "Target Server Execution"
        TargetServer -->|"7. Extract & Clean"| ExtractStep["tar -xzf deploy.tar.gz"]
        ExtractStep -->|"8. npm ci --omit=dev"| ProdDepStep["Install Production Libs"]
        ProdDepStep -->|"9. npx prisma migrate deploy"| DBStep["Run Database Migrations"]
        DBStep -->|"10. pm2 restart cms-api"| PM2Step["Reload PM2 Monolith Process"]
    end
```

---

## ⚙️ 1. Initial Remote Server Setup

Execute the following commands on your remote server (e.g. AWS EC2, Oracle Cloud Free Tier, DigitalOcean droplet):

### A. Install Node.js (v20 LTS) & PM2
```bash
# Using NodeSource LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify versions
node -v # Should be v20.x.x
npm -v

# Install PM2 globally
sudo npm install -g pm2
```

### B. Create Project Directory & Set Permissions
```bash
mkdir -p /home/ubuntu/cms-backend
cd /home/ubuntu/cms-backend
```

### C. Create Production `.env` File
Create `/home/ubuntu/cms-backend/.env` with your production settings:
```bash
nano /home/ubuntu/cms-backend/.env
```
Example configuration:
```ini
NODE_ENV=production
PORT=5000
CLIENT_URL=https://cms.yourdomain.com
STATIC_PATH=apps/web/dist

# PostgreSQL connection
DATABASE_URL="postgresql://postgres:your_db_password@localhost:5432/cms_db?schema=public"

# Redis connection
REDIS_URL="redis://localhost:6379"

# Security keys (must be >= 32 characters)
JWT_SECRET=production_strong_secret_key_minimum_32_characters_long_1234567890
JWT_EXPIRY=24h

# Google OAuth credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://cms.yourdomain.com/api/v1/auth/google/callback
ALLOWED_EMAILS=admin@yourdomain.com,editor@yourdomain.com

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-smtp-api-key
SMTP_SECURE=false
SMTP_FROM="CMS Notifications <noreply@yourdomain.com>"
DEFAULT_EMAIL_RECIPIENT=admin@yourdomain.com
```

### D. Setup Dedicated SSH Deploy Key
On your local machine or server, generate an SSH keypair for GitHub Actions:
```bash
ssh-keygen -t ed25519 -C "github-actions-cms-deploy" -f ~/.ssh/cms_deploy_key
```
1. Copy the public key (`cms_deploy_key.pub`) to your server's `~/.ssh/authorized_keys`:
   ```bash
   cat cms_deploy_key.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
2. The private key (`cms_deploy_key`) will be added to GitHub Secrets.

---

## 🔐 2. GitHub Repository Secrets Configuration

Navigate to your GitHub repository:  
**Settings > Secrets and variables > Actions > New repository secret**

Configure the following secrets:

| Secret Name | Required | Description | Example Value |
| :--- | :---: | :--- | :--- |
| `SSH_PRIVATE_KEY` | **Yes** | Content of the private SSH key (`cms_deploy_key`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_HOST` | **Yes** | Server IP address or fully-qualified domain name | `123.45.67.89` or `cms.example.com` |
| `SERVER_USER` | **Yes** | SSH username on the server | `ubuntu` |
| `SERVER_PATH` | No | Absolute folder path on the server (default: `/home/ubuntu/cms-backend`) | `/home/ubuntu/cms-backend` |
| `SERVER_PORT` | No | Custom SSH port if not default (default: `22`) | `22` |
| `BACKEND_APP_NAME` | No | PM2 application process name (default: `cms-api`) | `cms-api` |

---

## 🚀 3. Deploying Applications

### Automatic Deployment
The pipeline runs automatically when:
1. A Pull Request is merged into the `main` branch.
2. Direct commits are pushed to the `main` branch.

### Manual One-Click Deployment
You can trigger a deployment anytime from the GitHub web interface:
1. Go to **Actions** tab in GitHub.
2. Select **Deploy CMS Monolith to Server** in the left sidebar.
3. Click **Run workflow** > select branch (`main`) > click **Run workflow**.

---

## 🛠️ 4. Server Process Management with PM2

### Basic Commands on Server
```bash
# Check status of the running app
pm2 status

# Real-time monitoring of CPU, memory, and event loop latency
pm2 monit

# View streaming logs
pm2 logs cms-api

# Manually restart the application
pm2 restart cms-api

# Reload without downtime
pm2 reload cms-api

# Stop the application
pm2 stop cms-api
```

### Auto-start PM2 on Server Reboot
To ensure your CMS automatically starts whenever the VM reboots:
```bash
pm2 startup
# Copy and execute the sudo command provided by PM2 output, then:
pm2 save
```

---

## 🌐 5. Optional: Nginx Reverse Proxy & SSL (Domain Setup)

To expose your application on standard HTTP/HTTPS ports (`80` and `443`):

### A. Install Nginx & Certbot
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### B. Configure Nginx Site
Create `/etc/nginx/sites-available/cms`:
```nginx
server {
    listen 80;
    server_name cms.yourdomain.com;

    # Client-side file upload limits
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/cms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### C. Issue Free SSL Certificate with Let's Encrypt
```bash
sudo certbot --nginx -d cms.yourdomain.com
```

---

## 🔍 Troubleshooting & Failure Modes

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **`Permission denied (publickey)`** | SSH private key mismatch or missing in `authorized_keys` | Ensure `SSH_PRIVATE_KEY` in GitHub secrets matches the public key in `~/.ssh/authorized_keys` with `chmod 600`. |
| **`npx: command not found` / `pm2: command not found`** | Non-interactive SSH shell does not load user `.bashrc` NVM paths | The deployment script automatically exports NVM and standard path fallbacks. Verify Node is in `/usr/local/bin` or `~/.nvm/versions/node/`. |
| **`EADDRINUSE: port 5000`** | Another process is holding port 5000 | Run `sudo lsof -i :5000` or `netstat -tlpn \| grep 5000` on the server and kill any orphaned process before restarting PM2. |
| **`PrismaClientInitializationError`** | Invalid database credentials or PostgreSQL is stopped | Verify PostgreSQL is running (`sudo systemctl status postgresql` or `docker ps`) and verify `DATABASE_URL` in `/home/ubuntu/cms-backend/.env`. |
| **Out-Of-Memory (OOM) Killed** | Exceeded memory limits on 1GB VPS | `ecosystem.config.js` sets `--max-old-space-size=180` and `max_memory_restart: '250M'` to prevent runaway heap usage. |
