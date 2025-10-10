# Mediator Pro - AI-Powered Case Management Platform

## Overview

Mediator Pro is a comprehensive case management system designed for legal mediators. The platform automates case intake through AI-powered document analysis, manages mediation sessions, tracks parties and communications, and provides intelligent assistance throughout the mediation process. Built as a full-stack web application, it combines document processing, case tracking, and automated communication tools into a unified workflow.

## User Preferences

Preferred communication style: Simple, everyday language.

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