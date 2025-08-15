# Overview

This is a full-stack AI chatbot application called "Erza" built with TypeScript, React, and Express. The application provides a conversational interface where users can chat with an AI assistant that has multiple personality modes (friendly, sarcastic, professional, funny). The system supports file uploads for document processing and maintains conversation history with persistent sessions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with a custom Catppuccin dark theme
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling
- **File Processing**: Multer for file uploads with PDF parsing capabilities
- **Development**: Hot reload with Vite middleware integration

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: In-memory storage with interface for future database integration
- **File Storage**: Memory-based file storage with metadata tracking

## Authentication & Sessions
- **Session Management**: UUID-based session identification stored in localStorage
- **No Authentication**: Currently operates without user authentication
- **Conversation Persistence**: Sessions maintain chat history and personality settings

## AI Integration
- **OpenAI Integration**: GPT-4o model for chat responses
- **Personality System**: Four distinct AI personalities with different response styles
- **Context Awareness**: Conversation history maintained for contextual responses
- **File Processing**: PDF content extraction and summarization capabilities

## Development Architecture
- **Monorepo Structure**: Shared schema and types between client and server
- **Build Process**: Vite for frontend, esbuild for backend production builds
- **Development Server**: Express with Vite middleware for full-stack development
- **Type Safety**: Comprehensive TypeScript coverage with shared type definitions

The application follows a clean separation of concerns with shared TypeScript schemas ensuring type safety across the full stack. The modular component architecture allows for easy extension of UI components and API endpoints.