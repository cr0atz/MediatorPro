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
✅ **Local file storage is fully implemented** via `LocalFileStorageService`.

Files are saved to `UPLOAD_DIR/documents/{uuid}` with ACL metadata in `UPLOAD_DIR/.acl/`. No Google Cloud Storage configuration is required for self-hosted deployments.

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

### � RAG / AI Document Processing

Documents uploaded via **any method** are automatically indexed for RAG:

- `LocalFileStorageService.saveFile()` stores the file and returns an `objectPath` in `/objects/{uuid}` format
- The PUT endpoint returns a `Location` header so Uppy correctly uses the storage path as `uploadURL`
- Text extraction runs at upload time for PDF, DOCX, TXT; `is_processed` is set to `true` on success
- The AI Assistant queries only documents with `is_processed = true` and non-empty `extracted_text`

To re-process a document that failed text extraction, use the **Re-Parse Document** action in the Documents tab.

### 📞 Need Help?

- Installation issues: See `Install.md` troubleshooting section
- Code changes: Request local storage migration guide
- General questions: Check `README.md`

---

**Your deployment is ready!** The updated documentation supports self-hosted servers with local storage configuration. 🚀
