import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { templateTypeSchema, type TemplateType } from "../../shared/schemas/project.js";
import { env } from "./env.js";

const payloadSchema = z.object({
  templateType: templateTypeSchema,
  expiresAt: z.number().int().positive(),
}).strict();

const tokenLifetimeMilliseconds = 10 * 60 * 1_000;
const signingContext = "studio-k2-template-reference:v1";

function signatureFor(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(signingContext)
    .update("\0")
    .update(payload)
    .digest("base64url");
}

export function createTemplateReferenceToken(templateType: TemplateType) {
  const expiresAt = Date.now() + tokenLifetimeMilliseconds;
  const payload = Buffer.from(JSON.stringify({ templateType, expiresAt }), "utf8").toString("base64url");
  return { token: `${payload}.${signatureFor(payload)}`, expiresAt };
}

export function verifyTemplateReferenceToken(templateType: TemplateType, token: string) {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return false;

  const expectedSignature = Buffer.from(signatureFor(payload));
  const candidateSignature = Buffer.from(suppliedSignature);
  if (
    expectedSignature.length !== candidateSignature.length ||
    !timingSafeEqual(expectedSignature, candidateSignature)
  ) {
    return false;
  }

  try {
    const parsed = payloadSchema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    return parsed.success && parsed.data.templateType === templateType && parsed.data.expiresAt > Date.now();
  } catch {
    return false;
  }
}
