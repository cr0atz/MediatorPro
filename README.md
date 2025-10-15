# Mediator Pro - AI-Powered Case Management Platform

An intelligent case management system designed specifically for legal mediators, combining AI-powered document analysis, automated workflows, and integrated communication tools.

## 🌟 Features

### Core Case Management
- **AI-Powered Document Intake**: Automated document analysis using OpenAI GPT-5 for OCR, entity extraction, and case information parsing
- **Smart Case Organization**: Comprehensive case tracking with parties, documents, notes, and timeline management
- **Multi-Party Support**: Dedicated applicant/respondent columns with full legal representative details
- **Document Management**: Support for PDF, DOCX, and XLSX with inline viewers and AI analysis

### Communication & Scheduling
- **Email Integration**: SMTP configuration with customizable email templates and dynamic placeholder replacement
- **Zoom Integration**: Server-to-server OAuth for on-demand video meeting creation and management
- **Google Calendar Sync**: Two-way calendar synchronization with OAuth 2.0 using user's own credentials
- **Calendar Month View**: Visual calendar display with react-big-calendar integration

### AI Capabilities
- **Document Analysis**: OCR, entity extraction, and dispute background summarization
- **AI Q&A Assistant**: RAG-based question answering over case documents
- **Automated Data Extraction**: Intelligent parsing of party information, case details, and legal data
- **Case Notes Integration**: Send AI insights directly to case notes

### User Experience
- **Modern UI**: Built with Shadcn/ui and Tailwind CSS
- **Dark/Light Themes**: Full theme support with persistent preferences
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: TanStack Query for optimized data fetching and caching

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **UI Components**: Shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js with TypeScript
- **Authentication**: OpenID Connect (Replit Auth) + Passport.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **File Upload**: Multer
- **Session Storage**: PostgreSQL-backed sessions

### Integrations
- **AI**: OpenAI API (GPT-5)
- **Email**: SendGrid SMTP
- **Storage**: Local file system (self-hosted) or Google Cloud Storage (cloud)
- **Video**: Zoom API (Server-to-Server OAuth)
- **Calendar**: Google Calendar API (OAuth 2.0)

### Document Processing
- **PDF**: pdf-parse
- **DOCX**: mammoth.js (HTML conversion)
- **XLSX**: xlsx library (table rendering)

## 📋 Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14+ database
- Google Cloud Platform account (for Calendar & Storage APIs)
- OpenAI API key
- SendGrid account (optional, for email)
- Zoom account with Server-to-Server OAuth app (optional, for video)

## 🚀 Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mediator-pro.git
   cd mediator-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5000
   - Complete the authentication setup
   - Configure integrations in Settings

## 📦 Environment Variables

### Required
```env
DATABASE_URL=postgresql://user:password@localhost:5432/mediator_pro
SESSION_SECRET=your-random-secret-key
OPENAI_API_KEY=sk-...
```

### File Storage
```env
# Local File Storage (for self-hosted deployments)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB

# OR Google Cloud Storage (for Replit/cloud deployments)
# DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
# PUBLIC_OBJECT_SEARCH_PATHS=public
# PRIVATE_OBJECT_DIR=.private
```

### Optional Integrations
```env
# Zoom (configured via Settings UI)
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

## 🏗️ Project Structure

```
mediator-pro/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/          # Utilities and helpers
│   │   └── hooks/        # Custom React hooks
├── server/                # Backend Express application
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database interface
│   ├── index.ts          # Server entry point
│   └── services/         # Integration services
├── shared/               # Shared code between client/server
│   └── schema.ts        # Database schema & types
└── db/                  # Database migrations
```

## 🔧 Configuration

### Authentication Setup
The app uses OpenID Connect for authentication. Configure your identity provider in the Settings page.

### Google Calendar Integration
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add authorized redirect URI: `https://your-domain.com/api/calendar/oauth/callback`
3. Enable Google Calendar API
4. Configure credentials in Settings → Google Calendar

### Zoom Integration
1. Create Server-to-Server OAuth app in Zoom Marketplace
2. Configure credentials in Settings → Zoom Credentials
3. Meetings are created on-demand from case details

### Email Templates
1. Configure SMTP settings in Settings → Email Configuration
2. Create custom templates in Settings → Email Templates
3. Use placeholders for dynamic content injection

## 📚 Documentation

- [Installation Guide](Install.md) - Detailed deployment instructions
- [Project Status](Project_Status.md) - Current features and roadmap
- [API Documentation](docs/API.md) - Backend API reference (coming soon)

## 🔒 Security

- Session-based authentication with PostgreSQL storage
- OAuth 2.0 for third-party integrations
- Secure token storage and automatic refresh
- CSRF protection on all state-changing operations
- Environment-based secrets management

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@mediatorpro.com
- Documentation: https://docs.mediatorpro.com

## 🙏 Acknowledgments

- OpenAI for GPT-5 API
- Shadcn for the beautiful UI components
- Replit for authentication infrastructure
- The open-source community for amazing tools and libraries

---

**Built with ❤️ for legal mediators worldwide**
