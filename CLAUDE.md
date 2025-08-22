# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Next.js dev server on localhost:3000
- **Build**: `npm run build` - Creates production build
- **Production server**: `npm run start` - Runs production server
- **Linting**: `npm run lint` - Runs ESLint with Next.js config
- **Database migrations**: `npm run db:migrate` - Apply database migrations
- **Database setup (simple)**: `npm run db:setup-simple` - Simple database setup
- **Database migration (direct)**: `npm run db:migrate-direct` - Direct migration application

## Architecture Overview

This is a multi-tenant baseball league management SaaS application built with Next.js 15, featuring:

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + GraphQL)
- **State Management**: Zustand, Apollo Client with GraphQL
- **Authentication**: NextAuth.js with Supabase integration
- **UI Components**: Custom components with Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom color palette

### Multi-tenant Architecture
The app uses a league subdomain-based multi-tenancy model:
- Each league has a unique subdomain and code
- User roles: `admin`, `anotador` (scorer), `jugador` (player)
- League-specific routing: `/[liga]/admin`, `/[liga]/anotador`, `/[liga]/dashboard`
- Super admin functionality for managing multiple leagues

### Core Data Models
- **Liga** (League): Main tenant entity with subdomain
- **Temporada** (Season): League seasons
- **Equipo** (Team): Teams within leagues
- **Jugador** (Player): Team players with jersey numbers and positions
- **Usuario** (User): System users linked to players
- **Juego** (Game): Baseball games with scoring
- **EstadisticaJugador** (Player Stats): Detailed game statistics
- **AnotadorJuego** (Scorer Assignment): Game scorer assignments

### Authentication Flow
- NextAuth.js with custom credentials provider
- Supabase Auth integration for user authentication
- JWT tokens with user role and league context (24-hour session)
- Middleware-based route protection with role checking
- Super admin temporary authentication system

### Database & GraphQL
- Supabase PostgreSQL with UUID primary keys
- GraphQL endpoint via Supabase: `/graphql/v1`
- Apollo Client with custom cache policies for baseball data
- Schema migrations in `src/lib/supabase/migrations/`
- Row Level Security (RLS) policies for multi-tenancy

### Key Directories
- `src/app/[liga]/` - League-specific routes (admin, anotador, dashboard, etc.)
- `src/app/api/` - API routes for data operations
- `src/lib/auth/` - Authentication configuration
- `src/lib/supabase/` - Database client and migrations
- `src/lib/apollo/` - GraphQL client and queries
- `src/components/` - React components organized by feature
- `src/types/beisbol.ts` - Core TypeScript interfaces
- `scripts/` - Database migration and setup scripts

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXTAUTH_SECRET` - NextAuth.js secret

### Development Notes
- **Project Name**: D-sports
- **Language**: Uses Spanish naming conventions for baseball terms (beisbol, jugador, equipo)
- **Security**: Role-based access control enforced at middleware level
- **GraphQL**: Apollo Client configured with error handling and auth token management
- **Multi-tenancy**: Context passed via `X-Liga-ID` header in GraphQL requests
- **Styling**: Custom color palette with dark mode support
- **Photo Upload**: Player photo management with image cropping
- **Excel Export**: Statistical data export functionality

### Color Palette (HEX)
- Primary Blue: `#013771`
- Red Accent: `#BE0D3C` 
- Light Blue: `#619BF3`
- Dark Blue: `#3D5C8A`
- White: `#FFFFFF`