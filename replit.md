# Lead Management System

## Overview

This is a full-stack Lead Management System built as an internship assignment for Erino. The application provides a complete solution for managing sales leads with user authentication, CRUD operations, and advanced filtering capabilities. The system is designed to help businesses track and manage their sales pipeline effectively.

The application features a modern React frontend with TypeScript, an Express.js backend with Node.js, and uses PostgreSQL as the database. It implements JWT authentication with httpOnly cookies for security and includes comprehensive lead management functionality with server-side pagination and filtering.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **UI Framework**: Radix UI components with shadcn/ui for consistent, accessible design
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Management**: React Hook Form with Zod validation for robust form handling
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture  
- **Framework**: Express.js with TypeScript for API development
- **Authentication**: Passport.js with local strategy using bcrypt for password hashing
- **Session Management**: express-session with PostgreSQL session store for persistence
- **Security**: JWT tokens stored in httpOnly cookies to prevent XSS attacks
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas shared between frontend and backend for consistent validation

### Database Design
- **Database**: PostgreSQL for robust relational data storage
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Tables**: 
  - Users table with authentication credentials
  - Leads table with comprehensive lead information including status tracking, scoring, and activity timestamps
  - Session table for secure session persistence
- **Data Types**: Proper use of enums for status and source fields, UUIDs for primary keys

### Authentication & Authorization
- **Strategy**: JWT tokens with httpOnly cookies for secure token storage
- **Password Security**: bcrypt for hashing with salt for protection against rainbow table attacks
- **Session Management**: PostgreSQL-backed sessions for scalability
- **Protected Routes**: Middleware-based route protection returning proper HTTP status codes
- **CSRF Protection**: httpOnly cookies prevent client-side token access

### API Design
- **RESTful Architecture**: Standard HTTP methods with proper status codes
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Validation**: Server-side validation using Zod schemas
- **Pagination**: Server-side pagination with configurable page size
- **Filtering**: Advanced filtering capabilities for lead search and categorization
- **Sorting**: Configurable sorting by multiple fields

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: Neon database driver for PostgreSQL connectivity
- **drizzle-orm**: Type-safe ORM for database operations
- **express**: Web framework for API server
- **passport**: Authentication middleware with local strategy
- **bcrypt**: Password hashing library
- **jsonwebtoken**: JWT token generation and validation

### Frontend Dependencies
- **React ecosystem**: React 18, React DOM, React Router (wouter)
- **UI Components**: Extensive Radix UI component library for accessible UI primitives
- **Form handling**: React Hook Form with Hookform resolvers for Zod integration
- **State management**: TanStack React Query for server state management
- **Styling**: Tailwind CSS with class-variance-authority for component variants

### Development Tools
- **TypeScript**: Full TypeScript support across frontend and backend
- **Vite**: Modern build tool with HMR and optimized bundling
- **ESBuild**: Fast JavaScript bundler for production builds
- **Drizzle Kit**: Database migration and introspection tools

### Database & Infrastructure
- **PostgreSQL**: Primary database (configurable with DATABASE_URL)
- **Session Storage**: connect-pg-simple for PostgreSQL session persistence
- **Environment Configuration**: dotenv for environment variable management

### Deployment Considerations
- **Frontend**: Configured for static deployment (Vercel, Netlify)
- **Backend**: Express server deployable to cloud platforms (Railway, Render)
- **Database**: Compatible with managed PostgreSQL services (Neon, Supabase, Railway)
- **Environment Variables**: Requires DATABASE_URL and SESSION_SECRET configuration