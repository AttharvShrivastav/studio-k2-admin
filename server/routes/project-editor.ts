import { eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createBrowserImage,
  createFooterConfig,
  createGalleryConfig,
  createHeroConfig,
  createSeoConfig,
  createTemplateConfig,
  createThemeConfig,
  hasMeaningfulTemplateConfig,
  isEmptyStoredConfig,
} from "../../shared/lib/project-editor-defaults.js";
import {
  browserImageSchema,
  footerConfigSchema,
  galleryConfigSchema,
  heroConfigSchema,
  projectEditorInputSchema,
  seoConfigSchema,
  templateConfigSchema,
  themeConfigSchema,
} from "../../shared/schemas/project-editor.js";
import type { ApiErrorResponse, ProjectBasics } from "../../shared/types/project.js";
import type { ProjectEditorData, ProjectEditorResponse } from "../../shared/types/project-editor.js";
import { preserveSpecialBespokeModule } from "../../shared/lib/special-bespoke-modules.js";
import { requireAuthentication } from "../auth/guard.js";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";

const paramsSchema = z.object({ id: z.uuid() }).strict();
const selection = {
  id: projects.id, title: projects.title, slug: projects.slug, category: projects.category,
  status: projects.status, templateType: projects.templateType, location: projects.location,
  area: projects.area, year: projects.year, browserOrder: projects.browserOrder,
  browserImage: projects.browserImage, hero: projects.hero, themeConfig: projects.themeConfig,
  templateConfig: projects.templateConfig, galleryConfig: projects.galleryConfig,
  footerConfig: projects.footerConfig, seoConfig: projects.seoConfig,
  createdAt: projects.createdAt, updatedAt: projects.updatedAt, archivedAt: projects.archivedAt,
};
type Row = typeof projects.$inferSelect;

function basic(row: Row): ProjectBasics {
  return { id: row.id, title: row.title, slug: row.slug, category: row.category, status: row.status,
    templateType: row.templateType, location: row.location, area: row.area, year: row.year,
    browserOrder: row.browserOrder, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null };
}
function validation(reply: FastifyReply, error: z.ZodError) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    fields[path] = [...(fields[path] ?? []), issue.message];
  }
  return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "Review the highlighted editor fields", fields } } satisfies ApiErrorResponse);
}
function notFound(reply: FastifyReply) {
  return reply.status(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } } satisfies ApiErrorResponse);
}
function unique(error: unknown) {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
function stored<T>(schema: z.ZodType<T>, value: unknown, fallback: () => T, name: string): T {
  if (isEmptyStoredConfig(value)) return fallback();
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`Stored ${name} configuration is invalid`);
  return parsed.data;
}
function editor(row: Row): ProjectEditorData {
  const templateConfig = preserveSpecialBespokeModule(
    stored(templateConfigSchema, row.templateConfig, () => createTemplateConfig(row.templateType), "template"),
    row.slug,
  );
  return {
    project: basic(row),
    general: { title: row.title, slug: row.slug, category: row.category, templateType: row.templateType,
      location: row.location, area: row.area, year: row.year, browserOrder: row.browserOrder },
    browserImage: stored(browserImageSchema, row.browserImage, createBrowserImage, "browser image"),
    hero: stored(heroConfigSchema, row.hero, createHeroConfig, "hero"),
    themeConfig: stored(themeConfigSchema, row.themeConfig, createThemeConfig, "theme"),
    templateConfig,
    galleryConfig: stored(galleryConfigSchema, row.galleryConfig, createGalleryConfig, "gallery"),
    footerConfig: stored(footerConfigSchema, row.footerConfig, createFooterConfig, "footer"),
    seoConfig: stored(seoConfigSchema, row.seoConfig, createSeoConfig, "SEO"),
    templateHasContent: hasMeaningfulTemplateConfig(row.templateConfig),
  };
}

export const projectEditorRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuthentication);

  app.get<{ Params: { id: string }; Reply: ProjectEditorResponse | ApiErrorResponse }>("/projects/:id/editor", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return validation(reply, params.error);
    const [row] = await db.select(selection).from(projects).where(eq(projects.id, params.data.id)).limit(1);
    if (!row) return notFound(reply);
    try { return { editor: editor(row as Row) }; }
    catch { return reply.status(500).send({ error: { code: "STORED_CONFIG_INVALID", message: "This project contains configuration that needs manual review" } }); }
  });

  app.patch<{ Params: { id: string }; Body: unknown; Reply: ProjectEditorResponse | ApiErrorResponse }>("/projects/:id/editor", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return validation(reply, params.error);
    const input = projectEditorInputSchema.safeParse(request.body);
    if (!input.success) return validation(reply, input.error);
    const [existing] = await db.select().from(projects).where(eq(projects.id, params.data.id)).limit(1);
    if (!existing) return notFound(reply);
    if (existing.status === "archived") return reply.status(409).send({ error: { code: "PROJECT_ARCHIVED", message: "Restore this project before editing it" } });
    const switching = existing.templateType !== input.data.general.templateType;
    if (switching && hasMeaningfulTemplateConfig(existing.templateConfig) && !input.data.confirmTemplateReset) {
      return reply.status(409).send({ error: { code: "TEMPLATE_SWITCH_CONFIRM_REQUIRED", message: "Changing template resets template-specific content. Confirm this change to continue." } });
    }
    const data = input.data;
    const previousTemplateConfig = stored(
      templateConfigSchema,
      existing.templateConfig,
      () => createTemplateConfig(existing.templateType),
      "template",
    );
    const templateConfig = preserveSpecialBespokeModule(
      data.templateConfig,
      data.general.slug,
      previousTemplateConfig,
    );
    const nullable = (value: string | null | undefined) => value?.trim() ? value.trim() : null;
    try {
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx.update(projects).set({
          title: data.general.title, slug: data.general.slug, category: data.general.category,
          templateType: data.general.templateType, location: nullable(data.general.location),
          area: nullable(data.general.area), year: nullable(data.general.year), browserOrder: data.general.browserOrder,
          browserImage: data.browserImage, hero: data.hero, themeConfig: data.themeConfig,
          templateConfig, galleryConfig: data.galleryConfig,
          footerConfig: data.footerConfig, seoConfig: data.seoConfig, updatedAt: new Date(),
        }).where(eq(projects.id, params.data.id)).returning();
        return row;
      });
      return { editor: editor(updated as Row) };
    } catch (error) {
      if (unique(error)) return reply.status(409).send({ error: { code: "SLUG_CONFLICT", message: "A project with this slug already exists", fields: { "general.slug": ["This slug is already in use"] } } });
      throw error;
    }
  });
};
