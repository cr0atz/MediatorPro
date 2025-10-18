# Mediator Pro - AI-Powered Case Management Platform

## Overview

Mediator Pro is an AI-powered case management platform for legal mediators. It streamlines the mediation process by automating case intake through AI document analysis, managing sessions, tracking parties and communications, and providing intelligent assistance. The platform integrates document processing, case tracking, and automated communication to create a unified workflow, aiming to enhance efficiency and organization for mediation professionals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Vite for fast development. It's a Single-Page Application (SPA) with Wouter for routing. UI components are built using Shadcn/ui (based on Radix UI) and styled with Tailwind CSS, supporting both light and dark themes. TanStack Query manages server state and caching, while React Hook Form with Zod handles form validation.

### Backend Architecture
The backend uses Express.js with Node.js and TypeScript, designed with RESTful APIs. Authentication supports both Replit Authentication (OpenID Connect) for cloud deployments and auto-bypass mode for self-hosted deployments. Session management uses Passport.js with PostgreSQL-backed session storage. API routes are organized by feature domain, include middleware-based authentication, and provide consistent error responses. File uploads are managed by Multer, supporting PDF, DOC, and DOCX formats.

### Data Storage Solutions
The primary database is PostgreSQL with Drizzle ORM for type-safe queries. The schema includes Users, Cases, Parties, Documents, Case Notes, AI Analyses, and Sessions, with clear relationships. For self-hosted deployments, documents are stored in local file system with a custom LocalFileStorageService that implements secure file access control and path traversal prevention. For Replit/cloud deployments, Google Cloud Storage can be used as an alternative.

### UI/UX Decisions
The platform features a custom design system based on Shadcn's "New York" style variant, ensuring accessibility and responsiveness. Icons are provided by Lucide React for consistent visual elements. The layout for parties is structured with dedicated columns for applicants and respondents, enhancing clarity for multi-party cases. A comprehensive document viewer system supports PDF, DOCX (converted to HTML via mammoth.js), and XLSX (rendered as HTML tables via xlsx library), with a fallback for unsupported formats.

### Technical Implementations
Key technical implementations include:
- **Email System**: Dual email support with both SMTP configuration and Gmail API integration. Includes a full CRUD interface for managing email templates with comprehensive placeholder replacement system for dynamic data injection. Gmail API integration uses the same OAuth2 credentials as Google Calendar, eliminating the need for DKIM/SPF configuration and preventing authentication warnings.
- **Zoom Integration**: Secure server-to-server OAuth for Zoom stored in database (zoom_settings table), enabling on-demand meeting creation and deletion. Credentials configured via Settings page are used for all Zoom operations. Meeting links and passwords are integrated into case data and email templates. Case detail page shows "Set Zoom" button to create meetings on-demand, changing to "Join Session" after creation.
- **Google Calendar Integration**: OAuth-based integration for two-way synchronization of events, allowing cases to be synced to calendars and new cases to be created from calendar events. It stores OAuth tokens securely and uses the user's own Google API credentials.
- **Gmail API Integration**: Uses the same OAuth2 setup as Google Calendar for sending authenticated emails. Supports test emails and bulk email sending without requiring DKIM/SPF DNS configuration. Emails are sent from the user's Gmail account with full authentication.
- **AI Analysis**: Integration with OpenAI API for document analysis, OCR, entity extraction, and AI-powered Q&A, with "Send to Case Notes" and "Re-Parse" functionalities.
- **Party Management**: Manual "Add Party" dialog for comprehensive input of party and legal representative details, complementing AI extraction.
- **Icon System**: Migration from Font Awesome to Lucide React for better browser compatibility.
- **Local File Storage**: Secure local file system storage with LocalFileStorageService implementing ACL-based access control and robust path traversal prevention using path.relative() containment checks.
- **Self-Hosted Authentication**: Automatic authentication bypass mode for self-hosted deployments - when REPL_ID is not set, the system creates a default admin user and skips OIDC authentication entirely.

## External Dependencies

- **AI & Machine Learning**: OpenAI API (GPT-5) for document analysis, OCR, entity extraction, and AI-powered Q&A.
- **Email Services**: Custom SMTP configuration (Gmail, Office365, etc.) for transactional email delivery.
- **File Storage**: Local file system (self-hosted) with secure ACL implementation, or Google Cloud Storage (cloud deployments).
- **Database**: PostgreSQL (self-hosted in Docker or native) or Neon PostgreSQL (serverless cloud).
- **File Upload**: Uppy file upload library.
- **Development & Deployment**: Replit deployment platform, TypeScript, Vite, Drizzle Kit, PostCSS.
- **UI Libraries**: Radix UI, Shadcn/ui, Tailwind CSS, Lucide React, React Hook Form, Wouter.
- **Document Processing**: Mammoth.js (for DOCX to HTML conversion), XLSX library (for Excel rendering).
```