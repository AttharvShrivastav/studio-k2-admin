import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { siteSettingsInputSchema } from "../../shared/schemas/contact.js";
import type { SiteSettingsResponse } from "../../shared/types/contact.js";
import type { ApiErrorResponse } from "../../shared/types/project.js";
import { requireAuthentication } from "../auth/guard.js";
import { db } from "../db/index.js";
import { siteSettings } from "../db/schema.js";

async function readSettings() {
  const [settings] = await db.select({ address: siteSettings.address, email: siteSettings.email, contactBackground: siteSettings.contactBackground }).from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  return settings;
}

export const publicSiteSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: SiteSettingsResponse["settings"] | ApiErrorResponse }>("/site-settings", async (_request, reply) => {
    const settings = await readSettings();
    if (!settings) return reply.status(503).send({ error: { code: "SITE_SETTINGS_UNAVAILABLE", message: "Site settings are unavailable" } });
    return settings;
  });
};

export const siteSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuthentication);

  app.get<{ Reply: SiteSettingsResponse | ApiErrorResponse }>("/site-settings", async (_request, reply) => {
    const settings = await readSettings();
    if (!settings) return reply.status(503).send({ error: { code: "SITE_SETTINGS_UNAVAILABLE", message: "Site settings are unavailable" } });
    return { settings };
  });

  app.patch<{ Body: unknown; Reply: SiteSettingsResponse | ApiErrorResponse }>("/site-settings", async (request, reply) => {
    const parsed = siteSettingsInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Review the site settings",
          fields: z.flattenError(parsed.error).fieldErrors,
        },
      });
    }
    const [settings] = await db.insert(siteSettings).values({ id: 1, ...parsed.data }).onConflictDoUpdate({ target: siteSettings.id, set: parsed.data }).returning({ address: siteSettings.address, email: siteSettings.email, contactBackground: siteSettings.contactBackground });
    return { settings };
  });
};
