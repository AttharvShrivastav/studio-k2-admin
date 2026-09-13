import { z } from "zod";

const normalizedText = (maximum: number) =>
  z.string().transform((value) => value.split(String.fromCharCode(0)).join("").trim()).pipe(z.string().min(1).max(maximum));

export const contactSubmissionInputSchema = z.object({
  name: normalizedText(160),
  email: z.string().trim().max(320).pipe(z.email()),
  message: normalizedText(4_000),
}).strict();

export const contactSubmissionStatusSchema = z.enum(["new", "read"]);

export const contactSubmissionStatusInputSchema = z.object({
  status: contactSubmissionStatusSchema,
}).strict();

export const siteSettingsInputSchema = z.object({
  address: normalizedText(2_000),
  email: z.string().trim().max(320).pipe(z.email()),
}).strict();

export type ContactSubmissionStatus = z.infer<typeof contactSubmissionStatusSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;
