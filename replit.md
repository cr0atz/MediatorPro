# Mediator Pro - AI-Powered Case Management Platform

## Overview

Mediator Pro is a comprehensive case management system designed for legal mediators. The platform automates case intake through AI-powered document analysis, manages mediation sessions, tracks parties and communications, and provides intelligent assistance throughout the mediation process. Built as a full-stack web application, it combines document processing, case tracking, and automated communication tools into a unified workflow.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 12, 2025 - Session 5**
- Fixed email template synchronization between Settings and Send Email dialog:
  - EmailModal component now uses database templates from /api/email/templates endpoint instead of hardcoded templates
  - Custom Email option always available alongside database templates
  - Implemented comprehensive placeholder replacement system via replacePlaceholders() function
  - All supported placeholders: {caseNumber}, {mediatorName}, {mediationType}, {mediationDate}, {mediationTime}, {recipientName}, {disputeType}, {disputeAmount}
  - Missing data shows user-friendly bracket format like [Mediator Name] instead of empty strings or raw {tokens}
  - Added CaseWithDetails TypeScript type for type-safe case queries with parties and documents
  - Fixed getRecipients function name bug that caused runtime errors
- End-to-end testing confirmed all placeholders replaced correctly with no runtime errors
- Architect-approved as production-ready

**October 12, 2025 - Session 4**
- Implemented complete SMTP configuration and email template management system:
  - Added Settings page accessible via user dropdown menu (changed name display to "Danny Jovica")
  - SMTP Configuration tab: Form for host, port, username, password, from email/name with save and test functionality
  - Email Templates tab: Full CRUD interface for creating, editing, and deleting email templates with categories
  - Added smtpSettings database table with user-specific SMTP configurations
  - Integrated existing emailTemplates system with new UI
- Fixed React render loop bug in Settings component by moving form.reset() to useEffect
- Updated auth upsert to use email as conflict target (handles legacy UUID-based users, but may have edge case with email changes)
- All Settings features tested end-to-end and fully functional

**October 12, 2025 - Session 3**
- Migrated entire icon system from Font Awesome to Lucide React to resolve Brave browser blocking
  - Removed Font Awesome CDN link from index.html (privacy and browser compatibility fix)
  - Replaced all icon references across DocumentManager, DocumentViewer, and CaseDetail components
  - All icons now render correctly across all browsers including Brave
- Restructured party layout with dedicated columns for better organization:
  - Left column: All applicants grouped together with "Applicant" header and "Primary Party" badges
  - Right column: All respondents grouped together with "Respondent" header and "Opposing Party" badges
  - Improved visual hierarchy and clarity for multi-party cases
- All changes architect-approved and production-ready

**October 12, 2025 - Session 2**
- Fixed party display bug: Changed from `.find()` to `.filter()` to display ALL parties (not just first one)
  - Multiple applicants and respondents now show as separate cards
  - Tested with 3 respondents + 1 applicant successfully
- Implemented comprehensive document viewer system with modal interface:
  - PDF viewer: Direct display using iframe
  - DOCX viewer: Converts to HTML using mammoth.js library
  - XLSX viewer: Renders as HTML tables using xlsx library
  - Unsupported file fallback: Helpful messages for legacy .doc and .xls files
  - Download button available in all viewer modes
  - Custom styling for Word and Excel documents with proper theming
- All features tested end-to-end and architect-approved

**October 12, 2025 - Session 1**
- Added "Send to Case Notes" button in AI Analysis - saves AI responses to case notes with one click
- Added "Re-Parse" button for documents - reruns AI extraction when OCR misses details (e.g., landlord contact information)
- Added manual "Add Party" dialog with complete form - handles parties missed by AI extraction
  - Form includes: entity name, party type, primary contact details, legal representative information
  - Properly validates and persists to database
  - Updates UI immediately via cache invalidation
- Fixed auth bug: Changed upsert conflict target from email to id to prevent duplicate key errors on repeat OIDC logins
- All features tested end-to-end and architect-approved for production use

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing without the overhead of React Router
- Single-page application (SPA) architecture with code splitting

**UI Component System**
- Shadcn/ui components built on Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with CSS variables for theming
- Custom design system using "New York" style variant from Shadcn
- Support for both light and dark themes through CSS custom properties

**State Management**
- TanStack Query (React Query) for server state management and caching
- Custom hooks for authentication state (`useAuth`) and toast notifications
- React Hook Form with Zod resolvers for form validation
- Local component state with React hooks

**Key Design Patterns**
- Component composition with Radix UI's compound component pattern
- Custom utility functions for class name merging (cn utility)
- Path aliasing for clean imports (@/ for client, @shared for shared code)
- Separation of UI components from business logic

### Backend Architecture

**Server Framework**
- Express.js running on Node.js with TypeScript
- ESM modules for modern JavaScript module support
- RESTful API design with JSON request/response format
- Custom middleware for request logging and error handling

**Authentication & Sessions**
- Replit Authentication using OpenID Connect (OIDC) protocol
- Passport.js strategy for authentication flow
- PostgreSQL-backed session storage using connect-pg-simple
- HTTP-only secure cookies for session management
- Session TTL of 7 days with automatic refresh

**API Design Philosophy**
- Route handlers organized by feature domain (cases, documents, AI, email)
- Middleware-based authentication with `isAuthenticated` guard
- Consistent error responses with appropriate HTTP status codes
- File upload handling with Multer middleware (50MB limit for mediation documents)
- Support for PDF, DOC, and DOCX file types

### Data Storage Solutions

**Primary Database**
- Neon PostgreSQL serverless database for scalable cloud storage
- Drizzle ORM for type-safe database queries and schema management
- Connection pooling via @neondatabase/serverless with WebSocket support
- Database schema co-located with application in shared/schema.ts

**Database Schema Design**
- **Users**: Authentication and profile information (Replit Auth integration)
- **Cases**: Core case metadata (case number, mediation details, status, dispute information)
- **Parties**: Involved parties with contact information and legal representation
- **Documents**: File metadata with cloud storage references
- **Case Notes**: Timestamped notes for case management
- **AI Analyses**: Cached AI-generated insights and extracted data
- **Sessions**: User session data for authentication

**Relationships**
- One-to-many: Cases to Parties, Cases to Documents, Cases to Notes
- Foreign key constraints via mediatorId linking to user records
- Array fields for flexible data (issues for discussion)

**Object Storage**
- Google Cloud Storage integration for document storage
- Replit's sidecar service for credential management
- Custom ACL (Access Control List) system for fine-grained permissions
- Support for signed URLs and secure file uploads via Uppy

### External Dependencies

**AI & Machine Learning**
- OpenAI API (GPT-5) for document analysis and natural language processing
- OCR capabilities for extracting structured data from uploaded mediation documents
- Entity extraction for automatically populating case fields (parties, dates, issues)
- AI-powered Q&A system for querying case documents

**Email Services**
- SendGrid for transactional email delivery
- Template-based email system with dynamic data injection
- Support for mediation confirmations, document requests, and party notifications
- HTML and plain-text email formats

**File Management**
- Uppy file upload library with AWS S3 compatibility
- Google Cloud Storage for scalable object storage
- Support for multipart uploads and progress tracking
- File type validation and size restrictions

**Cloud Infrastructure**
- Replit deployment platform with native integrations
- Environment-based configuration (DATABASE_URL, API keys)
- WebSocket support for real-time features via Neon serverless
- Development tooling: Replit cartographer and dev banner plugins

**Development & Build Tools**
- TypeScript for static type checking across the stack
- ESBuild for fast production bundling of server code
- Drizzle Kit for database migrations and schema management
- PostCSS with Autoprefixer for CSS processing

**Third-Party UI Libraries**
- React Hook Form for performant form handling
- Radix UI comprehensive component primitives (30+ components)
- Lucide React for consistent iconography
- TailwindCSS for utility-first styling