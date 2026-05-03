# Systemctl Service File Fix

## Issue Found

The systemd service file `/etc/systemd/system/pm2-mediator.service` is using `pm2 resurrect` which exits immediately, but `Type=forking` expects a daemon. This causes the "protocol" error when trying to start the service.

## Fix

Edit `/etc/systemd/system/pm2-mediator.service` and make these changes:

### Change 1: Add WorkingDirectory
**After line 8 (User=mediator), add:**
```
WorkingDirectory=/home/mediator/MediatorPro
```

### Change 2: Update ExecStart
**Line 17 - Change from:**
```
ExecStart=/usr/lib/node_modules/pm2/bin/pm2 resurrect
```

**To:**
```
ExecStart=/usr/lib/node_modules/pm2/bin/pm2 start ecosystem.config.cjs
```

## Commands to Apply Fix

```bash
# Edit the service file
sudo nano /etc/systemd/system/pm2-mediator.service

# After editing, reload systemd
sudo systemctl daemon-reload

# Start the service
sudo systemctl start pm2-mediator.service

# Check status
sudo systemctl status pm2-mediator.service
```

## Normal Restart Command (After Initial Fix)

**For normal restarts after code changes, use:**
```bash
sudo -u mediator pm2 restart MediatorPro
```

**NOT:**
- `systemctl restart pm2-mediator.service` (only needed if service is broken)
- `pm2 restart` without `sudo -u mediator` (runs as wrong user)

## Build and Restart Workflow

After making code changes:
```bash
# 1. Build the application
npm run build

# 2. Restart PM2 process
sudo -u mediator pm2 restart MediatorPro
```
