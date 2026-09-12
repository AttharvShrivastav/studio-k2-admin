# Project Editor

`docs/FRONTEND-CONTRACT.md` is authoritative. The admin owns only project content declared there; all JSONB is parsed by shared strict Zod schemas on both client and server.

## Ownership

The editor route `/projects/:id` contains General, Browser, Hero, Theme, Template Content, Gallery, Footer, and SEO. General writes the approved relational fields. The other sections write `browser_image`, `hero`, `theme_config`, `template_config`, `gallery_config`, `footer_config`, and `seo_config` respectively.

Template 1 exposes Statement, Story, the supported Bespoke module identifier, Feature, Horizontal Story content, and Drawing. Template 2 exposes Intro, Horizontal Story, canonical narrative images, and Drawing. Template 3 exposes Intro, the validated frame sequence, its dedicated four-frame story content, and Drawing. Template 4 exposes Intro, its locked Horizontal Story content, canonical narrative/takeover content, and Drawing. Horizontal frames use strict discriminated schemas. The default sequence is `editorial` → `imageScene` → `editorialImage`; the editor changes only documented text and media, never type, order, IDs, geometry, timing, or choreography. Existing valid `intrinsicImage` frames remain editable but are not added to the locked default sequence.

Section enable switches persist `enabled: false` without clearing content. ProjectNavigation and section order remain frontend-owned. The existing exploded-isometric renderer is selectable/preserved, but layers, offsets, scaling, timing, and animation editing are deferred.

## Saving and template switches

Saving is manual and shows dirty, saving, saved, validation, and API-error states. One authenticated `PATCH /api/admin/projects/:id/editor` transaction saves the complete payload. Archived projects are read-only until restored. Empty `{}` JSONB values receive safe defaults; nonempty invalid stored data is not overwritten automatically.

Changing a project with meaningful template content presents a destructive-change confirmation. The server independently requires `confirmTemplateReset`; only `templateConfig` is reset. General, Browser, Hero, Theme, Gallery, Footer, and SEO are preserved.

SEO stores only explicit title, description, and social-image values. Public fallback selection is deliberately not persisted.
