# Studio K2 Admin Architecture

## Locked foundation

Studio K2 Admin is a bespoke private CMS for one architecture website. It remains one understandable full-stack TypeScript project and one Node application deployment.

| Area | Decision |
| --- | --- |
| Admin client | React + Vite + TypeScript |
| API | Node.js + Fastify + TypeScript |
| Database | External persistent PostgreSQL |
| Database access | Drizzle ORM with versioned Drizzle migrations |
| Authentication | Better Auth email/password and database sessions |
| Validation | Zod |
| Server state | TanStack Query |
| Forms | React Hook Form |

## Runtime shape

During development, Vite and Fastify run concurrently. The browser uses relative `/api` URLs and Vite proxies them to Fastify. In production, Vite outputs to `dist/client`; the compiled Fastify server serves that SPA and `/api` on one origin.

Better Auth is mounted at `/api/auth/*`. Public sign-up is disabled. Administrators are provisioned deliberately with the server-side `npm run admin:create` command. There are no roles, organizations, or permission matrices in this foundation.

The only custom API route is `GET /api/health`. The only PostgreSQL tables are Better Auth's required `user`, `session`, `account`, and `verification` tables, plus Drizzle's migration journal. No Studio K2 business table exists yet.

## Persistence and migrations

PostgreSQL is infrastructure, not an application-directory asset. Data must survive builds, deploys, application replacement, and rollbacks.

Migrations are generated with `npm run db:generate`, reviewed in `drizzle/`, and applied deliberately with `npm run db:migrate`. Server startup must never generate, push, or apply a migration. It may only verify connectivity before listening.

## Scope boundaries

- Do not split the API into another repository or introduce monorepo tooling.
- Do not replace the locked stack with a generic CMS, hosted backend, GraphQL, microservices, queues, Redis, or Docker by default.
- Do not create Projects, Homepage, Site Settings, Contact Enquiries, or Archive schemas until their data model is approved.
- Future media UX is field-level upload/replace. Do not introduce a central media library.
- Do not import or modify the separate Studio K2 public frontend repository from this admin project.

New work should extend the existing `server/routes`, `server/db`, `shared`, and `src` boundaries without re-architecting the foundation.
