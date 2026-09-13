import { and, asc, desc, eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createProjectInputSchema,
  projectStatusSchema,
  updateProjectBasicsInputSchema,
} from "../../shared/schemas/project.js";
import type {
  ApiErrorResponse,
  ProjectBasics,
  ProjectDeleteResponse,
  ProjectListResponse,
  ProjectResponse,
} from "../../shared/types/project.js";
import { requireAuthentication } from "../auth/guard.js";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";

const projectIdSchema = z.object({ id: z.uuid() }).strict();
const projectListQuerySchema = z
  .object({ status: projectStatusSchema.default("active") })
  .strict();

const projectSelection = {
  id: projects.id,
  title: projects.title,
  slug: projects.slug,
  category: projects.category,
  status: projects.status,
  templateType: projects.templateType,
  location: projects.location,
  area: projects.area,
  year: projects.year,
  browserOrder: projects.browserOrder,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
  archivedAt: projects.archivedAt,
};

type SelectedProject = typeof projects.$inferSelect;

function serializeProject(project: Pick<SelectedProject, keyof typeof projectSelection>): ProjectBasics {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    archivedAt: project.archivedAt?.toISOString() ?? null,
  };
}

function nullableText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function isUniqueViolation(error: unknown) {
  let current = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}

function sendValidationError(reply: FastifyReply, error: z.ZodError) {
  const fields = z.flattenError(error).fieldErrors;
  return reply.status(400).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "Review the highlighted project fields",
      fields,
    },
  } satisfies ApiErrorResponse);
}

function sendNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: {
      code: "PROJECT_NOT_FOUND",
      message: "Project not found",
    },
  } satisfies ApiErrorResponse);
}

function sendSlugConflict(reply: FastifyReply) {
  return reply.status(409).send({
    error: {
      code: "SLUG_CONFLICT",
      message: "A project with this slug already exists",
      fields: { slug: ["This slug is already in use"] },
    },
  } satisfies ApiErrorResponse);
}

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuthentication);

  app.get<{ Reply: ProjectListResponse | ApiErrorResponse }>("/projects", async (request, reply) => {
    const parsedQuery = projectListQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) return sendValidationError(reply, parsedQuery.error);

    const status = parsedQuery.data.status;
    const rows = await db
      .select(projectSelection)
      .from(projects)
      .where(eq(projects.status, status))
      .orderBy(
        status === "active" ? asc(projects.browserOrder) : desc(projects.archivedAt),
        desc(projects.updatedAt),
      );

    return { projects: rows.map(serializeProject) };
  });

  app.get<{ Params: { id: string }; Reply: ProjectResponse | ApiErrorResponse }>(
    "/projects/:id",
    async (request, reply) => {
      const parsedParams = projectIdSchema.safeParse(request.params);
      if (!parsedParams.success) return sendValidationError(reply, parsedParams.error);

      const [project] = await db
        .select(projectSelection)
        .from(projects)
        .where(eq(projects.id, parsedParams.data.id))
        .limit(1);

      if (!project) return sendNotFound(reply);
      return { project: serializeProject(project) };
    },
  );

  app.post<{ Body: unknown; Reply: ProjectResponse | ApiErrorResponse }>(
    "/projects",
    async (request, reply) => {
      const parsedBody = createProjectInputSchema.safeParse(request.body);
      if (!parsedBody.success) return sendValidationError(reply, parsedBody.error);

      try {
        const input = parsedBody.data;
        const [project] = await db
          .insert(projects)
          .values({
            ...input,
            location: nullableText(input.location),
            area: nullableText(input.area),
            year: nullableText(input.year),
          })
          .returning(projectSelection);

        return reply.status(201).send({ project: serializeProject(project) });
      } catch (error) {
        if (isUniqueViolation(error)) return sendSlugConflict(reply);
        throw error;
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: unknown;
    Reply: ProjectResponse | ApiErrorResponse;
  }>("/projects/:id", async (request, reply) => {
    const parsedParams = projectIdSchema.safeParse(request.params);
    if (!parsedParams.success) return sendValidationError(reply, parsedParams.error);

    const parsedBody = updateProjectBasicsInputSchema.safeParse(request.body);
    if (!parsedBody.success) return sendValidationError(reply, parsedBody.error);

    const input = parsedBody.data;
    const update = {
      ...input,
      ...(input.location !== undefined ? { location: nullableText(input.location) } : {}),
      ...(input.area !== undefined ? { area: nullableText(input.area) } : {}),
      ...(input.year !== undefined ? { year: nullableText(input.year) } : {}),
      updatedAt: new Date(),
    };

    try {
      const [project] = await db
        .update(projects)
        .set(update)
        .where(eq(projects.id, parsedParams.data.id))
        .returning(projectSelection);

      if (!project) return sendNotFound(reply);
      return { project: serializeProject(project) };
    } catch (error) {
      if (isUniqueViolation(error)) return sendSlugConflict(reply);
      throw error;
    }
  });

  app.post<{ Params: { id: string }; Reply: ProjectResponse | ApiErrorResponse }>(
    "/projects/:id/archive",
    async (request, reply) => {
      const parsedParams = projectIdSchema.safeParse(request.params);
      if (!parsedParams.success) return sendValidationError(reply, parsedParams.error);

      const now = new Date();
      const [project] = await db
        .update(projects)
        .set({ status: "archived", archivedAt: now, updatedAt: now })
        .where(eq(projects.id, parsedParams.data.id))
        .returning(projectSelection);

      if (!project) return sendNotFound(reply);
      return { project: serializeProject(project) };
    },
  );

  app.post<{ Params: { id: string }; Reply: ProjectResponse | ApiErrorResponse }>(
    "/projects/:id/restore",
    async (request, reply) => {
      const parsedParams = projectIdSchema.safeParse(request.params);
      if (!parsedParams.success) return sendValidationError(reply, parsedParams.error);

      const [project] = await db
        .update(projects)
        .set({ status: "active", archivedAt: null, updatedAt: new Date() })
        .where(eq(projects.id, parsedParams.data.id))
        .returning(projectSelection);

      if (!project) return sendNotFound(reply);
      return { project: serializeProject(project) };
    },
  );

  app.delete<{ Params: { id: string }; Reply: ProjectDeleteResponse | ApiErrorResponse }>(
    "/projects/:id",
    async (request, reply) => {
      const parsedParams = projectIdSchema.safeParse(request.params);
      if (!parsedParams.success) return sendValidationError(reply, parsedParams.error);

      const [existing] = await db
        .select({ id: projects.id, status: projects.status })
        .from(projects)
        .where(eq(projects.id, parsedParams.data.id))
        .limit(1);
      if (!existing) return sendNotFound(reply);
      if (existing.status !== "archived") {
        return reply.status(409).send({
          error: {
            code: "PROJECT_NOT_ARCHIVED",
            message: "Archive this project before deleting it permanently",
          },
        });
      }

      const [deleted] = await db
        .delete(projects)
        .where(and(eq(projects.id, existing.id), eq(projects.status, "archived")))
        .returning({ id: projects.id });
      if (!deleted) {
        return reply.status(409).send({
          error: {
            code: "PROJECT_NOT_ARCHIVED",
            message: "Archive this project before deleting it permanently",
          },
        });
      }
      return { deleted };
    },
  );
};
