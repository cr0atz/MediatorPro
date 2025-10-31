# Development Rules for MediatorPro

## Critical Guidelines

### 1. Always Back Up Files
- **BEFORE** deleting or modifying any file, create a backup with timestamp
- Format: `filename.YYYYMMDD_HHMM.bak`
- Example: `Settings.tsx.20251030_1939.bak`

### 2. Minimal Code Changes
- **Do not touch any code that is not directly related to the current task**
- Focus ONLY on what's needed to solve the immediate problem
- Avoid refactoring or "improving" unrelated code

### 3. Environment Configuration
- Read the `.env` file to understand project variables
- Use environment variables correctly (PRODUCTION_DOMAIN, etc.)
- Never hardcode values that should be environment-specific

### 4. Check Memory and Context
- Review memory for past mistakes and solutions
- Do not repeat errors that have already been identified
- Learn from previous debugging sessions

### 5. Isolated Changes
- **Focus on your current task**
- **Do not modify any code that will impact the performance of other functions**
- Test that unrelated features still work after your changes

### 6. Test-Driven Development
- **TEST with CURL before editing files**
- **TEST API endpoints to confirm your fixes**
- Verify changes work before considering the task complete
- Use browser F12 console to verify frontend changes

### 7. Git and Large Files
- For files >100MB that cause GitHub issues:
  - Add them to `.gitignore`
  - **DO NOT delete or remove them from the filesystem**
- Keep project assets intact while managing repository size

## Testing Checklist

Before marking any task as complete:

1. ✅ Backup created for modified files
2. ✅ Only changed code directly related to the task
3. ✅ Tested API endpoints with CURL or Postman
4. ✅ Verified in browser (F12 console shows no errors)
5. ✅ Confirmed unrelated features still work
6. ✅ Checked server logs for errors
7. ✅ Built and restarted application successfully

## Build and Restart Commands

```bash
# Build the application
npm run build

# Restart PM2
sudo -u mediator pm2 restart MediatorPro

# Check logs
sudo -u mediator pm2 logs MediatorPro --lines 50
```

## Remember

**"First, do no harm"** - Make the smallest change possible to achieve the goal. Avoid cascade effects that break working functionality.
