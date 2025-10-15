# Deployment Notes - Self-Hosted Server Setup

## ✅ Updated for Self-Hosted Deployment

The documentation has been updated to support **self-hosted server deployments** with local file storage instead of requiring Google Cloud Storage.

### What Changed

#### 1. **File Storage** 
- **Old**: Required Google Cloud Storage (GCS) with service account credentials
- **New**: Uses local file system storage on your server
- **Location**: `/home/mediator/mediator-pro/uploads`

#### 2. **Environment Variables**
Updated `.env` configuration:
```env
# Local File Storage (NEW)
UPLOAD_DIR=/home/mediator/mediator-pro/uploads
MAX_FILE_SIZE=52428800  # 50MB

# Removed (no longer required for self-hosted):
# DEFAULT_OBJECT_STORAGE_BUCKET_ID
# PUBLIC_OBJECT_SEARCH_PATHS
# PRIVATE_OBJECT_DIR
# GOOGLE_APPLICATION_CREDENTIALS
```

#### 3. **Installation Guide** (`Install.md`)
- Removed GCS setup section
- Added local file storage directory creation
- Added Apache configuration for serving uploaded files
- Simplified deployment process

### 📋 What You Need to Know

#### Current Code Status
⚠️ **Important**: The current codebase still uses Google Cloud Storage via `ObjectStorageService`. 

For full local file storage support, you have **two options**:

**Option A: Use GCS (Recommended for now)**
- Keep the current code as-is
- Follow the optional GCS setup in Install.md Appendix A
- This is the path of least resistance

**Option B: Migrate to Local Storage (Requires Code Changes)**
- Modify `server/objectStorage.ts` to use local file system
- Update upload routes to save files to disk
- Update download routes to serve from disk
- Estimated effort: 2-3 hours of development

### 🐳 Docker PostgreSQL Compatibility

**Yes, PostgreSQL in Docker works perfectly!**

No code changes needed. Just update your connection string:

```env
# If app runs on host, PostgreSQL in Docker:
DATABASE_URL=postgresql://mediator_user:password@localhost:5432/mediator_pro

# If app also runs in Docker (same network):
DATABASE_URL=postgresql://mediator_user:password@postgres-container:5432/mediator_pro
```

### 📁 Directory Structure (Self-Hosted)

```
/home/mediator/mediator-pro/
├── uploads/              # Local file storage (NEW)
│   ├── documents/       # Uploaded documents
│   └── temp/           # Temporary files
├── server/
├── client/
├── .env                # Environment config
├── logs/               # PM2 logs
└── ecosystem.config.js # PM2 config
```

### 🚀 Quick Deployment Checklist

For self-hosted server with local storage:

1. ✅ **Server Requirements**
   - Ubuntu 20.04+ 
   - Node.js 20.x
   - PostgreSQL (Docker or native)
   - Apache 2.4+

2. ✅ **Setup Steps**
   ```bash
   # Create upload directories
   mkdir -p /home/mediator/mediator-pro/uploads/{documents,temp}
   chmod -R 755 /home/mediator/mediator-pro/uploads
   
   # Update .env with local storage config
   UPLOAD_DIR=/home/mediator/mediator-pro/uploads
   MAX_FILE_SIZE=52428800
   
   # Database (Docker example)
   docker run -d --name mediator-postgres \
     -e POSTGRES_DB=mediator_pro \
     -e POSTGRES_USER=mediator_user \
     -e POSTGRES_PASSWORD=secure_password \
     -p 5432:5432 postgres:14
   ```

3. ✅ **Database Configuration**
   ```env
   DATABASE_URL=postgresql://mediator_user:password@localhost:5432/mediator_pro
   ```

4. ✅ **External Services** (Required)
   - OpenAI API key
   - Google Calendar OAuth (for calendar sync)
   - Zoom credentials (optional, for video meetings)
   - SendGrid SMTP (optional, for email)

### 📝 Documentation Files

All documentation has been updated:

- ✅ **README.md** - Updated to show local storage option
- ✅ **Install.md** - Complete self-hosted deployment guide
- ✅ **.env.example** - Updated environment variables
- ✅ **Project_Status.md** - Feature status and roadmap
- ✅ **DEPLOYMENT_CHECKLIST.md** - Production deployment checklist

### 🔧 Code Changes Needed (Optional)

If you want to fully implement local file storage, here are the files to modify:

1. **server/objectStorage.ts**
   - Replace GCS client with fs/promises
   - Implement local file save/read/delete

2. **server/routes.ts** (document upload)
   - Line ~337: Replace GCS upload with local file save
   - Line ~407: Replace GCS download with local file read

3. **server/routes.ts** (document download)
   - Update to serve from local filesystem

Would you like me to create the code changes for local file storage support? Or would you prefer to use GCS as currently implemented?

### 💡 Recommended Approach

**For Production Self-Hosted Deployment:**

1. **Short-term** (Deploy now):
   - Use the existing GCS code
   - Set up a simple GCS bucket (free tier available)
   - Follow Install.md for GCS setup

2. **Long-term** (Future enhancement):
   - Migrate to local storage when needed
   - Or keep GCS for better scalability and backups

### 📞 Need Help?

- Installation issues: See `Install.md` troubleshooting section
- Code changes: Request local storage migration guide
- General questions: Check `README.md`

---

**Your deployment is ready!** The updated documentation supports self-hosted servers with local storage configuration. 🚀
