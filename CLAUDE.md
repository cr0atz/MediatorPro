# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mediator Pro** is an AI-powered case management platform for legal mediators. It combines OpenAI GPT-based document analysis, automated workflows, and third-party integrations (Zoom, Google Calendar, SMTP email) to streamline mediation case handling.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Wouter + TanStack Query + Shadcn/ui + Tailwind CSS
- Backend: Express.js + TypeScript + Drizzle ORM + PostgreSQL
- AI: OpenAI API (GPT-4 Turbo)
- Integrations: Zoom API (Server-to-Server OAuth), Google Calendar API (OAuth 2.0), Custom SMTP

## Development Commands

```bash
# Development (runs both Vite dev server and tsx for backend hot reload)
npm run dev

# Production build (Vite frontend + esbuild backend bundle)
npm run build

# Start production server (requires build first)
npm run start

# Type checking
npm run check

# Database schema push (Drizzle)
npm run db:push
```

**Production deployment uses PM2:**
- Config: `ecosystem.config.cjs`
- Runs in cluster mode with 2 instances
- Logs: `./logs/` directory

## Architecture

### Directory Structure

```
mediator-pro/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/       # Page components (Home, CaseDetail, Settings, etc.)
│   │   ├── components/  # Reusable UI components (shadcn/ui based)
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Client utilities
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route handlers
│   ├── storage.ts       # Database abstraction layer (IStorage interface)
│   ├── replitAuth.ts    # Authentication (OIDC + local auth)
│   ├── localFileStorage.ts  # File upload/ACL for self-hosted
│   ├── aiService.ts     # OpenAI integration
│   ├── emailService.ts  # SMTP email sender
│   ├── zoomService.ts   # Zoom meeting creation
│   ├── googleCalendarService.ts  # Google Calendar sync
│   ├── googleCalendarOAuthService.ts  # OAuth flow for Calendar
│   └── gmailService.ts  # Gmail inbox monitoring
├── shared/              # Code shared between client/server
│   └── schema.ts        # Drizzle schema + Zod validation schemas
└── db/                  # Database migrations (Drizzle)
```

### Data Model (shared/schema.ts)

Core entities:
- **users**: Mediators (supports both Replit OIDC and local auth)
- **cases**: Mediation cases with status, parties, documents, notes
- **parties**: Applicants and respondents with contact/legal rep details
- **documents**: Uploaded files with extracted text and AI processing status
- **caseNotes**: Notes attached to cases
- **aiAnalyses**: AI analysis results (summary, Q&A, etc.)
- **emailTemplates**: User-defined email templates with placeholder support
- **smtpSettings, zoomSettings, calendarSettings**: User-specific integration credentials

All tables use UUID primary keys. Relations are defined with Drizzle's `relations()` helper.

### Authentication Strategy

The app supports two authentication modes (see `server/replitAuth.ts`):

1. **Replit Auth (OIDC)**: For Replit-hosted deployments
   - Enabled when `REPL_ID` and `REPLIT_DOMAINS` are set
   - Uses OpenID Connect with Replit as the identity provider

2. **Local Auth**: For self-hosted deployments
   - Enabled when `USE_LOCAL_AUTH=true` or Replit vars are missing
   - Uses passport-local with bcrypt password hashing
   - Admin credentials: `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   - **Important**: Disables secure cookies to work behind Apache/nginx reverse proxies

Sessions are stored in PostgreSQL via `connect-pg-simple`.

### File Storage Architecture

File uploads use a dual-strategy approach (see `server/localFileStorage.ts` and `server/routes.ts`):

1. **Local File Storage** (self-hosted):
   - Files saved to `./uploads/documents/{uuid}`
   - ACL policies stored in `./uploads/.acl/{uuid}.json`
   - Streaming downloads via Express

2. **Google Cloud Storage** (Replit deployments):
   - Uses `@google-cloud/storage` package
   - Configured via `DEFAULT_OBJECT_STORAGE_BUCKET_ID` env var

File uploads go through multer (memory storage), then are persisted to the appropriate storage backend. ACL checks are enforced on download.

### AI Integration (server/aiService.ts)

The `AIService` class provides:

1. **Document Extraction** (`extractCaseDataFromDocument`):
   - Accepts images, PDFs, DOCX, XLSX
   - Uses OpenAI Vision API for images
   - Extracts structured case data (parties, dates, dispute background, etc.)

2. **Q&A over Documents** (`askQuestionAboutCase`):
   - RAG-based: concatenates all extracted text from case documents
   - Sends to OpenAI with conversation history
   - Returns contextual answers

3. **Meeting Extraction** (`extractMeetingDataFromEmail`):
   - Parses ICS calendar invites and email bodies
   - Extracts meeting details for scheduling

### Email System (server/emailService.ts)

- User configures SMTP settings in Settings page (stored in `smtpSettings` table)
- Email templates support placeholders: `{caseNumber}`, `{applicantName}`, etc.
- Dynamic placeholder replacement at send time
- CC option to mediator email (from `users.mediatorEmail`)

### Integration Services

**Zoom** (`server/zoomService.ts`):
- Server-to-Server OAuth (no user login required)
- Creates meetings on-demand from case details
- Meeting link/password stored in `cases` table

**Google Calendar** (`server/googleCalendarService.ts`, `googleCalendarOAuthService.ts`):
- User-specific OAuth 2.0 flow
- Refresh tokens stored in `calendarSettings` table
- Two-way sync: create/update/delete events
- Calendar month view uses `react-big-calendar`

**Gmail** (`server/gmailService.ts`):
- OAuth-based inbox reading
- Extracts meeting invites from emails
- Used for importing ICS attachments

## API Patterns

All routes follow REST conventions:
- `GET /api/cases` - List cases
- `GET /api/cases/:id` - Get single case
- `POST /api/cases` - Create case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

Authentication is enforced via `isAuthenticated` middleware (returns 401 if not logged in).

File uploads use multipart form data (multer):
```typescript
// Example: /api/cases/:caseId/documents
upload.single('file') -> req.file (Buffer)
```

## Frontend Patterns

**State Management:**
- TanStack Query for server state (see `client/src/lib/queryClient.ts`)
- Custom `apiRequest` helper for mutations
- Query keys follow `/api/{resource}/{id}` pattern
- Stale time set to `Infinity` (manual invalidation)

**Routing:**
- Wouter for client-side routing
- Page components in `client/src/pages/`
- Protected routes check `useQuery("/api/user")` for auth status

**UI Components:**
- Shadcn/ui (Radix primitives + Tailwind)
- Theme support via `next-themes`
- Form validation with `react-hook-form` + Zod

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random string for session encryption
- `OPENAI_API_KEY` - OpenAI API key

**Authentication (self-hosted):**
- `USE_LOCAL_AUTH=true` - Enable local auth mode
- `ADMIN_USERNAME` - Admin username
- `ADMIN_PASSWORD` - Admin password
- `PRODUCTION_DOMAIN` - Domain for Google OAuth redirects (without https://)

**File Storage:**
- `UPLOAD_DIR` - Local upload directory (default: `./uploads`)
- `MAX_FILE_SIZE` - Max file size in bytes (default: 50MB)

**Integrations (optional):**
- `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` - Zoom Server-to-Server OAuth
- Google Calendar/Gmail credentials configured per-user via Settings UI

## Important Implementation Notes

### Google Calendar OAuth Redirects

For self-hosted deployments, the OAuth callback URL must use HTTPS. The code constructs the redirect URI as:
```typescript
const baseUrl = `https://${process.env.PRODUCTION_DOMAIN}`;
const redirectUri = `${baseUrl}/api/calendar/oauth/callback`;
```

Ensure `PRODUCTION_DOMAIN` is set correctly (e.g., `pro.mediator.life`) and that Apache/nginx terminates SSL.

### Case Document Text Extraction

When documents are uploaded:
1. File is parsed based on MIME type (pdf-parse, mammoth, xlsx)
2. Extracted text stored in `documents.extractedText`
3. `documents.isProcessed` flag set to `true`
4. AI analysis can optionally be triggered to populate case fields

The AI extraction is **manual** (user clicks "Analyze Document" button in UI). It does not run automatically on upload to save API costs.

### Database Schema Changes

After modifying `shared/schema.ts`:
1. Run `npm run db:push` to push schema to database
2. Drizzle does NOT generate migrations automatically; it applies changes directly
3. For production, consider using `drizzle-kit generate` + manual migration review

### Path Aliases

The codebase uses TypeScript path aliases:
- `@/` -> `client/src/`
- `@shared/` -> `shared/`

These are configured in `tsconfig.json` and `vite.config.ts`.

## Common Pitfalls

1. **File URLs**: File download URLs must include protocol. For self-hosted, the code generates URLs like:
   ```typescript
   `https://${process.env.PRODUCTION_DOMAIN}/api/documents/${docId}/download`
   ```
   Ensure `PRODUCTION_DOMAIN` is set correctly.

2. **Session Cookies**: In self-hosted mode, `secure: false` is required for session cookies to work behind a reverse proxy. The proxy (Apache/nginx) handles SSL termination.

3. **OpenAI API Key**: The service checks both `OPENAI_API_KEY` and `OPENAI_KEY` env vars. Ensure one is set.

4. **Zoom Meetings**: Zoom Server-to-Server OAuth requires account-level credentials. Individual user login is NOT needed.

5. **Google Calendar Tokens**: Refresh tokens are stored encrypted in the database. If a user revokes access, they must re-authenticate via Settings page.

## Testing Strategy

No automated tests are currently committed. When adding tests:
- Frontend: Use Vitest + React Testing Library (place in `client/src/__tests__/`)
- Backend: Use Supertest (place in `server/__tests__/`)
- Add `npm test` script to `package.json`
- Keep Drizzle seeds deterministic for test environments

## Coding Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use
- **Components**: Functional components with hooks (no class components)
- **Validation**: Use Zod schemas from `shared/schema.ts` for all inputs
- **Error Handling**: Throw descriptive errors; Express error handler catches them

Follow existing patterns in the codebase. See `AGENTS.md` for additional style guidelines.
