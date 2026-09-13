import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { templateTypeSchema } from "../../shared/schemas/project.js";
import type { ApiErrorResponse } from "../../shared/types/project.js";
import { requireAuthentication } from "../auth/guard.js";
import { env } from "../lib/env.js";
import {
  createTemplateReferenceToken,
  verifyTemplateReferenceToken,
} from "../lib/template-reference.js";

const templateParamsSchema = z.object({ templateType: templateTypeSchema }).strict();
const verifyInputSchema = z.object({
  templateType: templateTypeSchema,
  token: z.string().min(1).max(2_048),
}).strict();

export const adminTemplateReferenceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuthentication);

  app.post<{ Params: { templateType: string } }>("/template-reference/:templateType", async (request, reply) => {
    const params = templateParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        error: { code: "INVALID_TEMPLATE_TYPE", message: "Template type is invalid" },
      } satisfies ApiErrorResponse);
    }

    const authorization = createTemplateReferenceToken(params.data.templateType);
    const url = new URL(`/${params.data.templateType}`, env.PUBLIC_SITE_ORIGIN);
    url.searchParams.set("access", authorization.token);
    return { url: url.toString(), expiresAt: new Date(authorization.expiresAt).toISOString() };
  });
};

export const publicTemplateReferenceRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown }>("/template-reference/verify", async (request, reply) => {
    const input = verifyInputSchema.safeParse(request.body);
    if (!input.success) return reply.status(400).send({ valid: false });
    return {
      valid: verifyTemplateReferenceToken(input.data.templateType, input.data.token),
    };
  });
};
