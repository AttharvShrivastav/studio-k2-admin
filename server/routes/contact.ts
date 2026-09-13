import { desc, eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import {
  contactSubmissionInputSchema,
  contactSubmissionStatusInputSchema,
} from "../../shared/schemas/contact.js";
import type {
  ContactSubmissionCreatedResponse,
  ContactSubmissionListResponse,
  ContactSubmissionResponse,
} from "../../shared/types/contact.js";
import type { ApiErrorResponse } from "../../shared/types/project.js";
import { requireAuthentication } from "../auth/guard.js";
import { db } from "../db/index.js";
import { contactSubmissions } from "../db/schema.js";

const enquiryIdSchema = z.object({ id: z.uuid() }).strict();

function serializeEnquiry(row: typeof contactSubmissions.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "Review the submitted contact details",
      fields: z.flattenError(error).fieldErrors,
    },
  } satisfies ApiErrorResponse);
}

function notFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: { code: "ENQUIRY_NOT_FOUND", message: "Enquiry not found" },
  } satisfies ApiErrorResponse);
}

export const publicContactRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown; Reply: ContactSubmissionCreatedResponse | ApiErrorResponse }>(
    "/contact",
    async (request, reply) => {
      const parsed = contactSubmissionInputSchema.safeParse(request.body);
      if (!parsed.success) return validationError(reply, parsed.error);

      try {
        await db.insert(contactSubmissions).values(parsed.data);
        return reply.status(201).send({ success: true });
      } catch (error) {
        request.log.error({ error }, "Unable to save contact submission");
        return reply.status(500).send({
          error: {
            code: "CONTACT_SUBMISSION_FAILED",
            message: "Your enquiry could not be submitted. Please try again.",
          },
        });
      }
    },
  );
};

export const contactEnquiryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuthentication);

  app.get<{ Reply: ContactSubmissionListResponse }>("/contact-enquiries", async () => {
    const rows = await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
    return {
      enquiries: rows.map((row) => {
        const { message, ...enquiry } = serializeEnquiry(row);
        return {
          ...enquiry,
          messagePreview: message.length > 120 ? `${message.slice(0, 117)}…` : message,
        };
      }),
    };
  });

  app.get<{ Params: { id: string }; Reply: ContactSubmissionResponse | ApiErrorResponse }>(
    "/contact-enquiries/:id",
    async (request, reply) => {
      const params = enquiryIdSchema.safeParse(request.params);
      if (!params.success) return validationError(reply, params.error);
      const [row] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, params.data.id)).limit(1);
      if (!row) return notFound(reply);
      return { enquiry: serializeEnquiry(row) };
    },
  );

  app.patch<{ Params: { id: string }; Body: unknown; Reply: ContactSubmissionResponse | ApiErrorResponse }>(
    "/contact-enquiries/:id/status",
    async (request, reply) => {
      const params = enquiryIdSchema.safeParse(request.params);
      if (!params.success) return validationError(reply, params.error);
      const input = contactSubmissionStatusInputSchema.safeParse(request.body);
      if (!input.success) return validationError(reply, input.error);
      const [row] = await db.update(contactSubmissions).set(input.data).where(eq(contactSubmissions.id, params.data.id)).returning();
      if (!row) return notFound(reply);
      return { enquiry: serializeEnquiry(row) };
    },
  );
};
