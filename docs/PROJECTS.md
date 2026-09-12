# Projects Foundation

## Schema

The `projects` table holds metadata shared by every Studio K2 project template.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Database-generated primary key |
| `title` | text | Required, trimmed by API validation |
| `slug` | text | Required, lowercase URL-safe, unique index |
| `category` | `project_category` | `built` or `unbuilt` |
| `status` | `project_status` | `active` by default, or `archived` |
| `template_type` | `project_template_type` | `template-1` through `template-4` |
| `location`, `area`, `year` | text, nullable | Optional listing metadata; year intentionally supports ranges/text |
| `browser_order` | integer | Defaults to `0`; database check requires non-negative values |
| `created_at`, `updated_at` | timestamptz | Record timestamps |
| `archived_at` | timestamptz, nullable | Set only while archived |

The JSONB columns `browser_image`, `hero`, `theme_config`, `template_config`, `gallery_config`, `footer_config`, and `seo_config` currently default to empty objects. They are storage boundaries for later editors and are not accepted by the basic project API.

## Authenticated API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/projects?status=active` | List active projects by browser order, then update time |
| `GET` | `/api/admin/projects?status=archived` | List archived projects by archive time |
| `GET` | `/api/admin/projects/:id` | Read basic metadata for direct edit navigation |
| `POST` | `/api/admin/projects` | Create an active project |
| `PATCH` | `/api/admin/projects/:id` | Update approved common metadata only |
| `POST` | `/api/admin/projects/:id/archive` | Archive and timestamp a project |
| `POST` | `/api/admin/projects/:id/restore` | Restore a project and clear its archive timestamp |

Every route requires a valid Better Auth session. Duplicate slugs return HTTP `409` with error code `SLUG_CONFLICT`. Unknown fields and arbitrary JSON are rejected by strict Zod schemas.

## Admin routes

- `/projects` — active project index, create link, edit links, and confirmed archive action
- `/projects/new` — lean project creation form
- `/projects/:id` — full template-aware project editor with General, Browser, Hero, Theme, Template Content, Gallery, Footer, and SEO
- `/archive` — archived project list and restore action

TanStack Query owns remote state and invalidation. React Hook Form with the shared Zod project schema owns create/edit form state and client validation.

## Lifecycle

Creation always starts at `active`. Archiving never deletes data; it changes status and sets `archived_at`. Archived records leave the active query and appear in the archive query. Restoring reverses those two values so the project returns to the active index in browser order.

Migrations remain explicit through `npm run db:migrate`. Neither application startup nor deployment creates, resets, seeds, or migrates project data.

## Editor routes

- `GET /api/admin/projects/:id/editor` normalizes and returns all editor owners.
- `PATCH /api/admin/projects/:id/editor` validates and atomically saves common metadata plus all JSONB owners.

The basic project PATCH remains restricted to common metadata. Archived projects cannot be edited until restored. Template-specific section order is fixed and disabled sections preserve their values. See `docs/PROJECT-EDITOR.md` for ownership and deferred frontend-controlled concerns.
