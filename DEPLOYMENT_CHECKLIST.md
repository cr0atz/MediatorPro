# Deployment Checklist for Mediator Pro

Use this checklist to ensure a smooth deployment to production.

## 📋 Pre-Deployment

### Code Preparation
- [ ] All features tested and working
- [ ] All tests passing (`npm test`)
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Documentation updated (README, Install.md, Project_Status.md)
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated with release notes

### Security Review
- [ ] No hardcoded secrets or credentials in code
- [ ] All sensitive data in environment variables
- [ ] .env file not committed to repository
- [ ] .gitignore properly configured
- [ ] Dependencies updated and audited (`npm audit`)
- [ ] Security headers configured in Apache
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints

## 🖥️ Server Setup

### System Requirements
- [ ] Ubuntu 20.04 LTS or newer installed
- [ ] Minimum 4GB RAM, 2 CPU cores
- [ ] At least 20GB available storage
- [ ] Static IP or domain name configured
- [ ] Firewall rules configured (ports 80, 443, 22)

### Software Installation
- [ ] Node.js 20.x installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Apache 2.4+ installed and running
- [ ] PM2 process manager installed
- [ ] Git installed
- [ ] Certbot installed (for SSL)

### User & Permissions
- [ ] Application user created (mediator)
- [ ] Proper file permissions set (755 for directories, 644 for files)
- [ ] Application user has sudo access (if needed)

## 🗄️ Database Setup

### PostgreSQL Configuration
- [ ] Database created (mediator_pro)
- [ ] Database user created with strong password
- [ ] User granted all privileges on database
- [ ] PostgreSQL configured for local connections
- [ ] pg_hba.conf configured correctly
- [ ] Database connection tested
- [ ] Migrations run successfully (`npm run db:push`)

### Backup Strategy
- [ ] Backup script created and tested
- [ ] Cron job configured for daily backups
- [ ] Backup retention policy configured (30 days)
- [ ] Backup restore procedure tested
- [ ] Backup storage location secured

## 🔐 Security Configuration

### SSL/TLS
- [ ] Domain DNS configured correctly
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Certificate auto-renewal configured
- [ ] HTTPS redirect enabled
- [ ] HTTP/2 enabled (optional but recommended)
- [ ] SSL configuration tested (A+ rating on SSL Labs)

### Application Security
- [ ] SESSION_SECRET generated (64+ characters)
- [ ] All API keys stored in environment variables
- [ ] File upload restrictions configured
- [ ] Rate limiting configured (optional but recommended)
- [ ] Security headers configured in Apache

## 🔌 External Services

### OpenAI API
- [ ] OpenAI account created
- [ ] API key generated
- [ ] OPENAI_API_KEY configured in .env
- [ ] API key tested and working
- [ ] Usage limits reviewed

### Google Cloud Storage
- [ ] GCP project created
- [ ] Storage bucket created
- [ ] Service account created
- [ ] Service account key downloaded
- [ ] CORS configuration set on bucket
- [ ] Credentials file path configured
- [ ] File upload/download tested

### Google Calendar (Optional)
- [ ] OAuth 2.0 credentials created in GCP
- [ ] Authorized redirect URI configured
- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Test user added (if in testing mode)
- [ ] Calendar sync tested

### Zoom Integration (Optional)
- [ ] Server-to-Server OAuth app created
- [ ] Account ID, Client ID, Secret obtained
- [ ] Credentials configured in Settings
- [ ] Meeting creation tested

### SendGrid Email (Optional)
- [ ] SendGrid account created
- [ ] API key generated
- [ ] Sender domain verified
- [ ] SMTP credentials configured
- [ ] Test email sent successfully

## 🌐 Apache Configuration

### Virtual Host
- [ ] Virtual host file created
- [ ] ServerName and ServerAlias configured
- [ ] Proxy configuration correct
- [ ] WebSocket support enabled
- [ ] SSL configuration included
- [ ] Security headers configured
- [ ] Error and access logs configured
- [ ] Configuration tested (`apache2ctl configtest`)
- [ ] Site enabled (`a2ensite`)
- [ ] Apache restarted

### Apache Modules
- [ ] mod_proxy enabled
- [ ] mod_proxy_http enabled
- [ ] mod_proxy_wstunnel enabled
- [ ] mod_ssl enabled
- [ ] mod_headers enabled
- [ ] mod_rewrite enabled

## 🚀 Application Deployment

### Code Deployment
- [ ] Repository cloned to server
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (.env)
- [ ] Frontend built (`npm run build`)
- [ ] File permissions set correctly
- [ ] Static files accessible

### Process Management
- [ ] PM2 ecosystem file created
- [ ] Application started with PM2
- [ ] PM2 startup script configured
- [ ] PM2 auto-restart working
- [ ] Application logs accessible
- [ ] Application accessible via domain

## 🧪 Testing

### Functionality Tests
- [ ] Application accessible at https://yourdomain.com
- [ ] User authentication working
- [ ] Case creation working
- [ ] Document upload working
- [ ] AI analysis working
- [ ] Email sending working (if configured)
- [ ] Calendar sync working (if configured)
- [ ] Zoom integration working (if configured)
- [ ] All pages load without errors
- [ ] Mobile responsiveness verified

### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Database queries optimized
- [ ] Large file uploads working
- [ ] Concurrent user access tested
- [ ] Memory usage acceptable
- [ ] CPU usage acceptable

### Security Tests
- [ ] HTTPS working correctly
- [ ] HTTP redirects to HTTPS
- [ ] Session management working
- [ ] CSRF protection verified
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] File upload validation working
- [ ] Authentication required on protected routes

## 📊 Monitoring Setup

### Application Monitoring
- [ ] PM2 monitoring configured
- [ ] Application logs being written
- [ ] Error logging working
- [ ] Log rotation configured
- [ ] Disk space monitoring setup
- [ ] Memory monitoring setup
- [ ] CPU monitoring setup

### Alerts (Recommended)
- [ ] Uptime monitoring configured (UptimeRobot, etc.)
- [ ] Email alerts for downtime
- [ ] Disk space alerts configured
- [ ] Database backup alerts configured
- [ ] SSL expiry alerts configured

## 📚 Documentation

### User Documentation
- [ ] User guide created/updated
- [ ] Admin guide created/updated
- [ ] FAQ documented
- [ ] Troubleshooting guide available
- [ ] API documentation available (if public API)

### Operations Documentation
- [ ] Deployment procedure documented
- [ ] Backup/restore procedure documented
- [ ] Monitoring procedure documented
- [ ] Incident response plan documented
- [ ] Rollback procedure documented
- [ ] Update procedure documented

## 🔄 Post-Deployment

### Immediate Actions
- [ ] Monitor application logs for errors
- [ ] Monitor system resources
- [ ] Test all critical features
- [ ] Verify backup ran successfully
- [ ] Verify SSL certificate working
- [ ] Verify all integrations working

### First 24 Hours
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check database performance
- [ ] Review security logs
- [ ] Test emergency procedures
- [ ] Gather user feedback

### First Week
- [ ] Review all logs for anomalies
- [ ] Verify backups are running daily
- [ ] Check SSL certificate auto-renewal
- [ ] Review performance metrics
- [ ] Optimize based on usage patterns
- [ ] Update documentation with any issues found

## 🆘 Emergency Contacts

### Team Contacts
- **Technical Lead**: [Name] - [Email] - [Phone]
- **Database Admin**: [Name] - [Email] - [Phone]
- **DevOps**: [Name] - [Email] - [Phone]
- **Support Lead**: [Name] - [Email] - [Phone]

### Service Providers
- **Hosting Provider**: [Support URL/Phone]
- **Domain Registrar**: [Support URL/Phone]
- **OpenAI Support**: https://help.openai.com
- **Google Cloud Support**: https://cloud.google.com/support
- **SendGrid Support**: https://support.sendgrid.com

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] Deployment verified by technical lead
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Documentation complete and accurate
- [ ] Team trained on new deployment
- [ ] Rollback procedure tested and documented
- [ ] Go-live approved by stakeholders

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Verified By**: _______________  
**Production URL**: https://_______________

---

## 📝 Notes

Use this section to document any deployment-specific notes, issues encountered, or deviations from the standard procedure:

```
[Add your notes here]
```

---

**Congratulations on your deployment! 🎉**
