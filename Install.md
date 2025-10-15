# Mediator Pro - Installation Guide

Complete step-by-step instructions for deploying Mediator Pro on Ubuntu Server with Apache.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Server Setup](#server-setup)
3. [Install Dependencies](#install-dependencies)
4. [Database Setup](#database-setup)
5. [Application Installation](#application-installation)
6. [Apache Configuration](#apache-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [External Services Configuration](#external-services-configuration)
9. [Process Management](#process-management)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 1. System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **Network**: Static IP or domain name

### Recommended Requirements
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: Domain with SSL certificate

---

## 2. Server Setup

### 2.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Create Application User
```bash
sudo adduser mediator --disabled-password --gecos ""
sudo usermod -aG sudo mediator
```

### 2.3 Configure Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Install Dependencies

### 3.1 Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x.x
npm --version
```

### 3.2 Install PostgreSQL 14+
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.3 Install Apache and Modules
```bash
sudo apt install -y apache2
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### 3.4 Install Build Tools
```bash
sudo apt install -y build-essential git
```

### 3.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## 4. Database Setup

### 4.1 Create Database and User
```bash
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE mediator_pro;
CREATE USER mediator_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mediator_pro TO mediator_user;
\q
```

### 4.2 Configure PostgreSQL for Remote Access (Optional)
Edit PostgreSQL config:
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Add/modify:
```
listen_addresses = 'localhost'
```

Edit pg_hba.conf:
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Add:
```
local   mediator_pro    mediator_user                   md5
host    mediator_pro    mediator_user   127.0.0.1/32    md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 5. Application Installation

### 5.1 Clone Repository
```bash
cd /home/mediator
sudo -u mediator git clone https://github.com/yourusername/mediator-pro.git
cd mediator-pro
```

### 5.2 Install Application Dependencies
```bash
sudo -u mediator npm install
```

### 5.3 Build Frontend
```bash
sudo -u mediator npm run build
```

### 5.4 Configure Environment Variables
```bash
sudo -u mediator nano .env
```

Add the following:
```env
# Database
DATABASE_URL=postgresql://mediator_user:your_secure_password@localhost:5432/mediator_pro
PGHOST=localhost
PGPORT=5432
PGUSER=mediator_user
PGPASSWORD=your_secure_password
PGDATABASE=mediator_pro

# Application
NODE_ENV=production
PORT=5000
SESSION_SECRET=generate_random_64_char_string_here

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Local File Storage
UPLOAD_DIR=/home/mediator/mediator-pro/uploads
MAX_FILE_SIZE=52428800

# Zoom (Optional - configure via Settings UI)
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# Domain
REPLIT_DEV_DOMAIN=yourdomain.com
```

### 5.5 Run Database Migrations
```bash
sudo -u mediator npm run db:push
```

### 5.6 Set Permissions
```bash
sudo chown -R mediator:mediator /home/mediator/mediator-pro
sudo chmod -R 755 /home/mediator/mediator-pro
```

---

## 6. Apache Configuration

### 6.1 Create Apache Virtual Host
```bash
sudo nano /etc/apache2/sites-available/mediator-pro.conf
```

Add configuration:
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    # Redirect all HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    # SSL Configuration (will be added by Certbot)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Proxy Configuration
    ProxyPreserveHost On
    ProxyRequests Off

    # Proxy to Node.js application
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/

    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:5000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*)           http://localhost:5000/$1 [P,L]

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/mediator-pro-error.log
    CustomLog ${APACHE_LOG_DIR}/mediator-pro-access.log combined
</VirtualHost>
```

### 6.2 Enable Site and Restart Apache
```bash
sudo a2ensite mediator-pro.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## 7. SSL/TLS Setup

### 7.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-apache
```

### 7.2 Obtain SSL Certificate
```bash
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 7.3 Configure Auto-Renewal
```bash
sudo systemctl status certbot.timer
```

Test renewal:
```bash
sudo certbot renew --dry-run
```

---

## 8. External Services Configuration

### 8.1 Local File Storage Setup

For self-hosted deployments, files are stored directly on the server instead of cloud storage.

#### Create Storage Directories
```bash
# Create uploads directory for documents
sudo mkdir -p /home/mediator/mediator-pro/uploads
sudo mkdir -p /home/mediator/mediator-pro/uploads/documents
sudo mkdir -p /home/mediator/mediator-pro/uploads/temp

# Set ownership and permissions
sudo chown -R mediator:mediator /home/mediator/mediator-pro/uploads
sudo chmod -R 755 /home/mediator/mediator-pro/uploads
```

#### Configure Apache for File Serving (Optional)
If you want Apache to serve uploaded files directly:

```bash
sudo nano /etc/apache2/sites-available/mediator-pro.conf
```

Add inside the `<VirtualHost *:443>` block:
```apache
# Serve uploaded files
Alias /uploads /home/mediator/mediator-pro/uploads
<Directory /home/mediator/mediator-pro/uploads>
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>
```

Restart Apache:
```bash
sudo systemctl restart apache2
```

#### Update Environment Variables
The `.env` file should have:
```env
# Local File Storage
UPLOAD_DIR=/home/mediator/mediator-pro/uploads
MAX_FILE_SIZE=52428800  # 50MB in bytes
```

**Note**: The application now uses local file storage by default. No additional cloud storage setup is required.

### 8.2 Google Calendar OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://yourdomain.com/api/calendar/oauth/callback`
5. Download credentials
6. Users will configure Client ID and Secret in Settings UI

### 8.3 Zoom Integration Setup

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create Server-to-Server OAuth app
3. Get Account ID, Client ID, and Client Secret
4. Configure in Settings UI or environment variables

### 8.4 Email Configuration (Optional)

The application supports custom SMTP for email notifications. Configure in Settings UI:
- SMTP Host (e.g., smtp.gmail.com, smtp.office365.com)
- SMTP Port (usually 587 for TLS)
- Username (your email)
- Password (app-specific password recommended)

---

## 9. Process Management

### 9.1 Create PM2 Ecosystem File
```bash
sudo -u mediator nano /home/mediator/mediator-pro/ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'mediator-pro',
    script: './server/index.js',
    cwd: '/home/mediator/mediator-pro',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 9.2 Start Application with PM2
```bash
cd /home/mediator/mediator-pro
sudo -u mediator mkdir -p logs
sudo -u mediator pm2 start ecosystem.config.js
sudo -u mediator pm2 save
```

### 9.3 Configure PM2 Startup
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u mediator --hp /home/mediator
sudo systemctl enable pm2-mediator
```

### 9.4 PM2 Commands
```bash
# Status
sudo -u mediator pm2 status

# Logs
sudo -u mediator pm2 logs mediator-pro

# Restart
sudo -u mediator pm2 restart mediator-pro

# Stop
sudo -u mediator pm2 stop mediator-pro

# Monitor
sudo -u mediator pm2 monit
```

---

## 10. Monitoring & Maintenance

### 10.1 Application Logs
```bash
# PM2 logs
sudo -u mediator pm2 logs --lines 100

# Apache logs
sudo tail -f /var/log/apache2/mediator-pro-access.log
sudo tail -f /var/log/apache2/mediator-pro-error.log

# Application logs
tail -f /home/mediator/mediator-pro/logs/combined.log
```

### 10.2 Database Backup Script
```bash
sudo nano /usr/local/bin/backup-mediator-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/mediator/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U mediator_user -h localhost mediator_pro | gzip > $BACKUP_DIR/mediator_pro_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "mediator_pro_*.sql.gz" -mtime +30 -delete

echo "Backup completed: mediator_pro_$DATE.sql.gz"
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-mediator-db.sh
```

### 10.3 Configure Cron for Backups
```bash
sudo crontab -e
```

Add:
```
# Daily database backup at 2 AM
0 2 * * * /usr/local/bin/backup-mediator-db.sh >> /var/log/mediator-backup.log 2>&1
```

### 10.4 System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop

# Check disk usage
df -h

# Check application status
sudo -u mediator pm2 status
sudo systemctl status apache2
sudo systemctl status postgresql
```

### 10.5 Update Application
```bash
# Navigate to application directory
cd /home/mediator/mediator-pro

# Pull latest changes
sudo -u mediator git pull origin main

# Install dependencies
sudo -u mediator npm install

# Build frontend
sudo -u mediator npm run build

# Run migrations if needed
sudo -u mediator npm run db:push

# Restart application
sudo -u mediator pm2 restart mediator-pro
```

---

## 🔧 Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
sudo -u mediator pm2 logs mediator-pro --lines 100

# Check Node.js version
node --version

# Check environment variables
sudo -u mediator pm2 env 0
```

### Database Connection Issues
```bash
# Test database connection
sudo -u postgres psql -U mediator_user -d mediator_pro -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Apache Issues
```bash
# Test configuration
sudo apache2ctl configtest

# Check Apache status
sudo systemctl status apache2

# Check error logs
sudo tail -f /var/log/apache2/error.log
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal

# Check renewal timer
sudo systemctl status certbot.timer
```

### Permission Issues
```bash
# Fix application permissions
sudo chown -R mediator:mediator /home/mediator/mediator-pro
sudo chmod -R 755 /home/mediator/mediator-pro

# Fix log permissions
sudo chmod -R 755 /home/mediator/mediator-pro/logs
```

---

## 📊 Performance Tuning

### PostgreSQL Optimization
Edit `/etc/postgresql/14/main/postgresql.conf`:
```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 16MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Apache Optimization
Edit `/etc/apache2/apache2.conf`:
```
Timeout 60
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5
```

### Node.js Optimization
Edit `ecosystem.config.js`:
```javascript
max_memory_restart: '1G',
instances: 'max',  // Use all CPU cores
node_args: '--max-old-space-size=2048'
```

---

## 🎉 Post-Installation Steps

1. **Access Application**: Navigate to `https://yourdomain.com`
2. **Complete Authentication Setup**: Configure OpenID Connect provider
3. **Configure Integrations**:
   - SMTP Settings
   - Google Calendar OAuth
   - Zoom Credentials
4. **Create First Case**: Test document upload and AI analysis
5. **Test Email System**: Send test email
6. **Test Calendar Sync**: Sync a test case
7. **Monitor Logs**: Check for any errors

---

## 📞 Support

For issues during installation:
- Check logs: `/home/mediator/mediator-pro/logs/`
- Review documentation: `README.md` and `Project_Status.md`
- GitHub Issues: https://github.com/yourusername/mediator-pro/issues

---

**Installation Complete! 🚀**

Your Mediator Pro application should now be running at `https://yourdomain.com`
