import { eq, inArray } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createEmptyHomepageSpotlightConfig,
  createDefaultHomepageContent,
  homepageConfigDraftSchema,
  homepageConfigSchema,
  omitEmptyHomepageMobile,
  type HomepageConfig,
} from "../../shared/schemas/homepage.js";
import type {
  HomepageAdminResponse,
  PublicHomepageResponse,
} from "../../shared/types/homepage.js";
import type { ApiErrorResponse } from "../../shared/types/project.js";
import { requireAuthentication } from "../auth/guard.js";
import { db } from "../db/index.js";
import { homepageConfig, projects } from "../db/schema.js";

async function readHomepageDraft() {
  const [row] = await db
    .select({ spotlight: homepageConfig.spotlightConfig })
    .from(homepageConfig)
    .where(eq(homepageConfig.id, 1))
    .limit(1);

  const content = createDefaultHomepageContent();
  if (!row) return { ...content, spotlight: createEmptyHomepageSpotlightConfig() };
  const stored = row.spotlight && typeof row.spotlight === "object" && "slots" in row.spotlight
    ? { ...content, spotlight: row.spotlight }
    : row.spotlight;
  const parsed = homepageConfigDraftSchema.safeParse(omitEmptyHomepageMobile(stored));
  if (!parsed.success) throw new Error("Stored Homepage configuration is invalid");
  return parsed.data;
}

async function validateActiveProjects(config: HomepageConfig["spotlight"]) {
  const uniqueIds = [...new Set(config.slots.map((slot) => slot.projectId))];
  const rows = await db
    .select({ id: projects.id, title: projects.title, slug: projects.slug, status: projects.status })
    .from(projects)
    .where(inArray(projects.id, uniqueIds));
  const activeProjects = rows.filter((row) => row.status === "active");
  const activeIds = new Set(activeProjects.map((row) => row.id));
  return {
    projects: activeProjects.map((project) => ({
      id: project.id,
      title: project.title,
      slug: project.slug,
    })),
    invalidSlots: config.slots.flatMap((slot, index) =>
      activeIds.has(slot.projectId) ? [] : [index],
    ),
  };
}

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "Review the required Homepage fields",
      fields: z.flattenError(error).fieldErrors,
    },
  } satisfies ApiErrorResponse);
}

function invalidProjectError(reply: FastifyReply, slots: number[]) {
  return reply.status(400).send({
    error: {
      code: "SPOTLIGHT_PROJECT_INACTIVE",
      message: "Every Spotlight must reference an active project",
      fields: Object.fromEntries(slots.map((index) => [`slots.${index}.projectId`, ["Choose an active project"]])),
    },
  } satisfies ApiErrorResponse);
}

export const homepageRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuthentication);

  app.get<{ Reply: HomepageAdminResponse | ApiErrorResponse }>("/homepage", async (_request, reply) => {
    try {
      return await readHomepageDraft();
    } catch {
      return reply.status(500).send({
        error: { code: "HOMEPAGE_CONFIG_INVALID", message: "Homepage configuration could not be loaded" },
      });
    }
  });

  app.patch<{ Body: unknown; Reply: HomepageAdminResponse | ApiErrorResponse }>("/homepage", async (request, reply) => {
    const parsed = homepageConfigSchema.safeParse(omitEmptyHomepageMobile(request.body));
    if (!parsed.success) return validationError(reply, parsed.error);

    const active = await validateActiveProjects(parsed.data.spotlight);
    if (active.invalidSlots.length) return invalidProjectError(reply, active.invalidSlots);

    const normalized = omitEmptyHomepageMobile(parsed.data) as HomepageConfig;

    const [saved] = await db
      .insert(homepageConfig)
      .values({ id: 1, spotlightConfig: normalized })
      .onConflictDoUpdate({ target: homepageConfig.id, set: { spotlightConfig: normalized } })
      .returning({ spotlight: homepageConfig.spotlightConfig });

    const response = homepageConfigDraftSchema.safeParse(saved.spotlight);
    if (!response.success) throw new Error("Saved Homepage configuration is invalid");
    return response.data;
  });
};

export const publicHomepageRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: PublicHomepageResponse | ApiErrorResponse }>("/homepage", async (_request, reply) => {
    let draft;
    try {
      draft = await readHomepageDraft();
    } catch {
      return reply.status(503).send({
        error: { code: "HOMEPAGE_CONFIG_INVALID", message: "Homepage configuration is unavailable" },
      });
    }

    const parsed = homepageConfigSchema.safeParse(draft);
    if (!parsed.success) {
      return reply.status(503).send({
        error: { code: "HOMEPAGE_CONFIG_INCOMPLETE", message: "Homepage configuration is incomplete" },
      });
    }

    const active = await validateActiveProjects(parsed.data.spotlight);
    if (active.invalidSlots.length) {
      return reply.status(503).send({
        error: { code: "HOMEPAGE_SPOTLIGHT_UNAVAILABLE", message: "A Homepage Spotlight project is unavailable" },
      });
    }

    const projectById = new Map(active.projects.map((project) => [project.id, project]));
    const slots = parsed.data.spotlight.slots.map((slot) => ({
      ...slot,
      project: projectById.get(slot.projectId)!,
    })) as PublicHomepageResponse["spotlight"]["slots"];

    return {
      horizontalJourney: parsed.data.horizontalJourney,
      frame3: parsed.data.frame3,
      spotlight: { slots },
    };
  });
};
