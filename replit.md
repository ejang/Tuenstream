# Collective - Collaborative Music Platform

## Overview

Collective is a real-time collaborative music request platform that allows users to create shared music rooms where participants can search for YouTube videos, add songs to a queue, and enjoy synchronized playback together. The application features a minimalist design with a focus on social music discovery and sharing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component system for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Real-time Communication**: WebSocket server for live room updates and synchronization
- **Storage**: In-memory storage with interface-based design for easy database migration
- **API Design**: RESTful endpoints with WebSocket events for real-time features

### Data Storage Solutions
- **Current**: In-memory storage using Maps for development and prototyping
- **Database Ready**: Drizzle ORM configured with PostgreSQL dialect for future persistence
- **Schema**: Zod schemas for runtime validation and type safety across client/server boundary

### Authentication and Authorization
- **Current**: Simple participant name-based identification
- **Room Access**: Room code-based joining system without complex authentication
- **Future Ready**: Structure supports user authentication integration

### External Service Integrations
- **YouTube Integration**: 
  - YouTube IFrame Player API for embedded video playback
  - YouTube Data API v3 for video search functionality
  - Thumbnail and metadata extraction for rich media display
- **Real-time Sync**: WebSocket-based synchronization for playback state and queue management

### Key Architectural Decisions

**Monorepo Structure**: Single repository with shared TypeScript schemas between client and server for type consistency and reduced duplication.

**Real-time First**: WebSocket-driven architecture ensures all participants see updates immediately, creating a truly collaborative experience.

**Component-Based UI**: Radix UI + shadcn/ui provides accessible, customizable components while maintaining design consistency and reducing custom CSS.

**Type-Safe APIs**: Shared Zod schemas ensure runtime validation and compile-time type safety across the entire stack.

**Development-Focused Storage**: In-memory storage allows rapid prototyping while maintaining clean interfaces for easy database integration.

**Responsive Design**: Mobile-first approach with Tailwind CSS ensures the platform works seamlessly across all device sizes.