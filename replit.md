# Headshot Generator Application

## Overview

This is a full-stack TypeScript application that generates professional headshots using AI image generation APIs. The application features user authentication, character customization, headshot generation, and public profile pages with QR code sharing capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with custom configuration
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript (ES modules)
- **Authentication**: Passport.js with local and OAuth strategies
- **Session Management**: Express sessions with PostgreSQL store
- **File Storage**: Database-based image storage with Multer for uploads

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon serverless PostgreSQL via connection pooling
- **Schema Management**: Drizzle Kit for migrations and schema management

## Key Components

### Authentication System
- **Local Authentication**: Email/password with bcrypt hashing
- **OAuth Integration**: Google OAuth 2.0 support
- **Magic Link Authentication**: Passwordless login via email tokens
- **Session Management**: Secure session handling with PostgreSQL storage
- **Development Mode**: Auto-login functionality for development environment

### User Management
- **Organizations**: Multi-tenant support with organization-based user management
- **Profiles**: Comprehensive user profiles with public pages
- **Path Management**: Custom public URLs with redirect handling
- **QR Code Generation**: Dynamic QR codes for profile sharing

### Image Generation Pipeline
- **Character System**: Custom character creation with detailed attributes
- **AI Integration**: RenderNet API for headshot generation (with fallback support)
- **Prompt Engineering**: Dynamic prompt generation based on character attributes
- **Storage**: Database-based image storage with Base64 encoding

### Content Management
- **Sections System**: Modular content sections (Quick Actions, Resources, CTA, Embed)
- **Analytics**: Page view and interaction tracking
- **Lead Generation**: Form-based lead capture with customizable fields
- **File Uploads**: Secure file handling with validation

## Data Flow

### Headshot Generation Flow
1. User creates/selects a character with specific attributes
2. System generates optimized prompts based on character settings
3. Request sent to RenderNet API with character reference image
4. Generated images stored in database as Base64 data
5. User can download or use images in their profile

### Profile Access Flow
1. Public URLs resolve through path matching system
2. Analytics tracking for page views and interactions
3. Dynamic content rendering based on user settings
4. QR code generation for profile sharing

### Authentication Flow
1. Multiple authentication methods (local, OAuth, magic link)
2. Session persistence with PostgreSQL store
3. User context management across requests
4. Organization-based access control

## External Dependencies

### Core APIs
- **RenderNet API**: Primary image generation service (API key required)
- **OpenAI API**: Chat functionality and AI assistance (optional)
- **Google OAuth**: Social authentication
- **Mailtrap**: Email delivery service for notifications and magic links

### Development Tools
- **Drizzle ORM**: Type-safe database operations
- **Zod**: Runtime type validation
- **Jest**: Testing framework with React Testing Library
- **ESLint/Prettier**: Code quality and formatting

### Build Dependencies
- **esbuild**: Fast bundling for server-side code
- **PostCSS**: CSS processing with Tailwind
- **TypeScript**: Type checking and compilation

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized React application to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations applied via `drizzle-kit push`

### Environment Configuration
- **Development**: Local PostgreSQL with hot reload via nodemon
- **Production**: Cloud Run deployment with environment variables
- **Database**: Neon PostgreSQL with connection pooling

### Required Environment Variables
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
OPENAI_API_KEY=sk-... (optional)
RENDERNET_API_KEY=your-rendernet-key (optional)
MAILTRAP_TOKEN=your-mailtrap-token (optional)
GOOGLE_CLIENT_ID=your-google-client-id (optional)
GOOGLE_CLIENT_SECRET=your-google-client-secret (optional)
```

### Deployment Targets
- **Primary**: Google Cloud Run with automatic scaling
- **Development**: Replit environment with PostgreSQL module
- **Local**: Docker support with PostgreSQL container

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 16, 2025. Initial setup