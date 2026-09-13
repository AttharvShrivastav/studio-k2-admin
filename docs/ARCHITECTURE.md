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

The API includes the public `GET /api/health` route and authenticated project-management routes under `/api/admin/projects`. PostgreSQL contains Better Auth's required tables and the Studio K2 `projects` table, plus Drizzle's migration journal.

## Projects module

`projects` stores common, queryable metadata in relational columns: identity, category, lifecycle status, template selection, listing details, ordering, and timestamps. PostgreSQL enums constrain category, status, and template type. Slugs are unique and browser order is non-negative.

The lifecycle is reversible: new projects begin `active`; archive sets `status = archived` and `archivedAt`; restore sets `status = active` and clears `archivedAt`. There is no permanent-delete endpoint.

Authenticated routes are:

- `GET /api/admin/projects?status=active|archived`
- `GET /api/admin/projects/:id`
- `POST /api/admin/projects`
- `PATCH /api/admin/projects/:id`
- `POST /api/admin/projects/:id/archive`
- `POST /api/admin/projects/:id/restore`

The seven JSONB columns—`browserImage`, `hero`, `themeConfig`, `templateConfig`, `galleryConfig`, `footerConfig`, and `seoConfig`—reserve ownership for their corresponding future project-editor sections. The common metadata endpoint cannot write them. Their validated shapes and editing routes must be introduced with the template-editor work, not inferred here.

## Persistence and migrations

PostgreSQL is infrastructure, not an application-directory asset. Data must survive builds, deploys, application replacement, and rollbacks.

Migrations are generated with `npm run db:generate`, reviewed in `drizzle/`, and applied deliberately with `npm run db:migrate`. Server startup must never generate, push, or apply a migration. It may only verify connectivity before listening.

## Scope boundaries

- Do not split the API into another repository or introduce monorepo tooling.
- Do not replace the locked stack with a generic CMS, hosted backend, GraphQL, microservices, queues, Redis, or Docker by default.
- Do not create Homepage, Site Settings, or Contact Enquiries schemas until their data model is approved.
- Future media UX is field-level upload/replace. Do not introduce a central media library.
- Do not import or modify the separate Studio K2 public frontend repository from this admin project.

New work should extend the existing `server/routes`, `server/db`, `shared`, and `src` boundaries without re-architecting the foundation.

## Project editor

`docs/FRONTEND-CONTRACT.md` is the locked boundary for all project-owned content. The editor reads and saves one complete, strict Zod payload through `/api/admin/projects/:id/editor`; the server updates the relational basics and seven JSONB owners in one database transaction. Empty foundation-era `{}` values are normalized to safe template defaults at read time. Nonempty invalid stored values are surfaced for manual review rather than silently discarded.

Template switching preserves General, Browser, Hero, Theme, Gallery, Footer, and SEO. Meaningful existing `templateConfig` requires explicit client confirmation and a server confirmation flag before it is replaced with defaults for the selected template. Disabled sections retain their content. ProjectNavigation, animation choreography, isometric composition controls, and Template 4's undocumented horizontal-frame union remain frontend-owned.

Uploads are authenticated field-level actions backed by an isolated filesystem adapter. `UPLOAD_ROOT` must point outside generated output and, in production, at persistent infrastructure. Public media is served only through generated storage keys under `/api/uploads/*`; the browser never receives an absolute filesystem path. Upload replacement/removal does not delete the old file.

## Contact, settings, and template references

`contact_submissions` is the source of truth for public enquiries. `POST /api/public/contact` validates and stores name, email, and message. Authenticated `/api/admin/contact-enquiries` routes list newest first, read one message, and change only `new | read` status; the Admin route is `/contact-enquiries`.

`site_settings` is a singleton constrained to `id = 1`. Its only editable content is `address` and `email`. Authenticated `GET/PATCH /api/admin/site-settings` serves the Admin form at `/site-settings`; `GET /api/public/site-settings` exposes only those two values.

Canonical frontend template pages use short-lived reference authorization. An authenticated `POST /api/admin/template-reference/:templateType` accepts only `template-1` through `template-4`, creates a ten-minute HMAC authorization using the existing server secret, and returns a URL under `PUBLIC_SITE_ORIGIN`. The frontend validates the signed token through `POST /api/public/template-reference/verify`; the secret and Better Auth session token never enter the URL. Missing, expired, invalid, and wrong-template authorizations resolve to the frontend NotFound experience.

Migration `drizzle/0002_contact_settings.sql` creates both tables and initializes the singleton with the previously locked frontend address and email. It remains a manual deployment step through `npm run db:migrate`; startup does not apply migrations.
