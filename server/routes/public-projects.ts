import { and, asc, desc, eq } from "drizzle-orm";
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
import type { ApiErrorResponse } from "../../shared/types/project.js";
import type {
  PublicProject,
  PublicProjectListResponse,
  PublicProjectResponse,
} from "../../shared/types/public-project.js";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";

const slugParamsSchema = z.object({ slug: z.string().trim().min(1).max(160) }).strict();
const selection = {
  id: projects.id,
  title: projects.title,
  slug: projects.slug,
  category: projects.category,
  templateType: projects.templateType,
  location: projects.location,
  area: projects.area,
  year: projects.year,
  browserOrder: projects.browserOrder,
  browserImage: projects.browserImage,
  hero: projects.hero,
  themeConfig: projects.themeConfig,
  templateConfig: projects.templateConfig,
  galleryConfig: projects.galleryConfig,
  footerConfig: projects.footerConfig,
  seoConfig: projects.seoConfig,
  updatedAt: projects.updatedAt,
};

type PublicProjectRow = typeof projects.$inferSelect;

function stored<T>(schema: z.ZodType<T>, value: unknown, fallback: () => T): T {
  if (isEmptyStoredConfig(value)) return fallback();
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error("Stored project configuration is invalid");
  return parsed.data;
}

function containsFilesystemPath(value: unknown): boolean {
  if (typeof value === "string") {
    return /^(?:file:\/\/|[a-z]:\\|\/(?:Users|home|private|tmp|var|srv|opt)\/)/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsFilesystemPath);
  return Boolean(value && typeof value === "object" && Object.values(value).some(containsFilesystemPath));
}

function serializePublicProject(row: Pick<PublicProjectRow, keyof typeof selection>): PublicProject {
  const parsed = projectEditorInputSchema.safeParse({
    general: {
      title: row.title,
      slug: row.slug,
      category: row.category,
      templateType: row.templateType,
      location: row.location,
      area: row.area,
      year: row.year,
      browserOrder: row.browserOrder,
    },
    browserImage: stored(browserImageSchema, row.browserImage, createBrowserImage),
    hero: stored(heroConfigSchema, row.hero, createHeroConfig),
    themeConfig: stored(themeConfigSchema, row.themeConfig, createThemeConfig),
    templateConfig: stored(templateConfigSchema, row.templateConfig, () => createTemplateConfig(row.templateType)),
    galleryConfig: stored(galleryConfigSchema, row.galleryConfig, createGalleryConfig),
    footerConfig: stored(footerConfigSchema, row.footerConfig, createFooterConfig),
    seoConfig: stored(seoConfigSchema, row.seoConfig, createSeoConfig),
  });
  if (!parsed.success) throw new Error("Stored project configuration is invalid");

  const data = parsed.data;
  const result: PublicProject = {
    id: row.id,
    title: data.general.title,
    slug: data.general.slug,
    category: data.general.category,
    templateType: data.general.templateType,
    location: row.location,
    area: row.area,
    year: row.year,
    browserOrder: data.general.browserOrder,
    browserImage: data.browserImage,
    hero: data.hero,
    themeConfig: data.themeConfig,
    templateConfig: data.templateConfig,
    galleryConfig: data.galleryConfig,
    footerConfig: data.footerConfig,
    seoConfig: data.seoConfig,
    updatedAt: row.updatedAt.toISOString(),
  };
  if (containsFilesystemPath(result)) throw new Error("Stored project media contains a private filesystem path");
  return result;
}

function notFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
  } satisfies ApiErrorResponse);
}

function unavailable(reply: FastifyReply) {
  return reply.status(500).send({
    error: { code: "PROJECT_CONTENT_INVALID", message: "Project content is temporarily unavailable" },
  } satisfies ApiErrorResponse);
}

export const publicProjectRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: PublicProjectListResponse | ApiErrorResponse }>("/projects", async (_request, reply) => {
    const rows = await db
      .select(selection)
      .from(projects)
      .where(eq(projects.status, "active"))
      .orderBy(asc(projects.browserOrder), desc(projects.updatedAt));

    try {
      return { projects: rows.map((row) => serializePublicProject(row as PublicProjectRow)) };
    } catch {
      return unavailable(reply);
    }
  });

  app.get<{ Params: { slug: string }; Reply: PublicProjectResponse | ApiErrorResponse }>("/projects/:slug", async (request, reply) => {
    const params = slugParamsSchema.safeParse(request.params);
    if (!params.success) return notFound(reply);

    const [row] = await db
      .select(selection)
      .from(projects)
      .where(and(eq(projects.slug, params.data.slug), eq(projects.status, "active")))
      .limit(1);
    if (!row) return notFound(reply);

    try {
      return { project: serializePublicProject(row as PublicProjectRow) };
    } catch {
      return unavailable(reply);
    }
  });
};
