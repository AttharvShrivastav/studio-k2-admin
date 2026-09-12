# Studio K2 Admin

Private administration application for the Studio K2 architecture website. This repository is one full-stack Node deployment: Vite builds the React client and Fastify serves both the client and `/api` routes in production.

The public website is a separate repository and is not imported or modified by this application.

## Architecture

- React, Vite, and TypeScript for the admin interface
- Fastify and TypeScript for the API
- PostgreSQL through Drizzle ORM
- Better Auth with email/password and database-backed sessions
- Zod for shared form and server environment validation
- TanStack Query for admin data fetching
- React Hook Form for forms

Only the authentication tables exist today. Projects, homepage content, site settings, contact enquiries, archive behavior, and uploads are intentionally out of scope.

## Project structure

```text
src/                  React admin application
  app/                Routes and application composition
  components/         Admin shell and shared UI
  lib/                Auth, API, and query clients
  pages/              Login and dashboard pages
  styles/             Global light-mode interface styles
server/               Fastify application
  auth/               Better Auth configuration and account bootstrap
  db/                 Drizzle connection and auth schema
  lib/                Validated server configuration
  routes/             Health and authentication routes
shared/               Shared Zod schemas and TypeScript types
drizzle/              Versioned SQL migrations and metadata
docs/ARCHITECTURE.md   Locked architectural decisions
```

## Local setup

Requirements: Node.js 22+, npm, and a persistent PostgreSQL database.

```bash
npm install
cp .env.example .env
```

Update `.env` with a real database URL and a high-entropy auth secret. Create the PostgreSQL database outside this project directory, then apply the committed migration explicitly:

```bash
npm run db:migrate
npm run admin:create
npm run dev
```

`admin:create` prompts for the initial administrator name, email, and a masked password. Public email/password sign-up is disabled; this server-side command is the account bootstrap path.

The development command starts Vite at `http://localhost:5173` and Fastify at `http://localhost:3001`. Vite proxies `/api` to the backend.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for persistent external infrastructure |
| `BETTER_AUTH_SECRET` | High-entropy Better Auth secret, at least 32 characters |
| `BETTER_AUTH_URL` | Canonical backend/application URL; `http://localhost:3001` locally |
| `ADMIN_ORIGIN` | Allowed admin browser origin; `http://localhost:5173` locally |
| `PORT` | Fastify port; defaults to `3001` |

All required server configuration is validated with Zod before startup. Never commit `.env`.

## Commands

```bash
npm run dev            # Vite and Fastify in watch mode
npm run check          # ESLint and TypeScript checks
npm run build          # Compile server and build client
npm start              # Run the compiled production server
npm run db:generate    # Generate a reviewed migration from schema changes
npm run db:migrate     # Explicitly apply committed migrations
npm run admin:create   # Create an admin account interactively
```

In production, run `npm run build`, set `NODE_ENV=production`, and run `npm start`. Fastify serves `dist/client` and the API from the same deployment.

## Database safety

> **Migrations are never run automatically on application startup.**

The PostgreSQL database is persistent infrastructure outside the application deployment directory. Application replacement or redeployment must not replace, delete, or recreate the database. Apply migrations only through the explicit `npm run db:migrate` command after reviewing the generated SQL.

`GET /api/health` returns `{ "ok": true }` when the running API is available. Server startup separately verifies PostgreSQL connectivity with a read-only query.
