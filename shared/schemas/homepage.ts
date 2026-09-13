import { z } from "zod";

export const spotlightFocalPositions = ["left", "center", "right"] as const;
export const spotlightFocalPositionSchema = z.enum(spotlightFocalPositions);

const mediaShape = {
  src: z.string().trim().max(2_048),
  alt: z.string().trim().max(240),
  focalPosition: spotlightFocalPositionSchema,
};

export const homepageSpotlightMediaSchema = z.object(mediaShape).strict();
export const homepageSpotlightMobileMediaSchema = z.object({
  src: z.string().trim().max(2_048),
  alt: z.string().trim().max(240).optional(),
  focalPosition: spotlightFocalPositionSchema.optional(),
}).strict();

export const homepageSpotlightSlotDraftSchema = z.object({
  projectId: z.string().trim(),
  desktop: homepageSpotlightMediaSchema,
  mobile: homepageSpotlightMobileMediaSchema.optional(),
}).strict();

export const homepageSpotlightConfigDraftSchema = z.object({
  slots: z.tuple([
    homepageSpotlightSlotDraftSchema,
    homepageSpotlightSlotDraftSchema,
    homepageSpotlightSlotDraftSchema,
    homepageSpotlightSlotDraftSchema,
  ]),
}).strict();

export const homepageSpotlightSlotSchema = homepageSpotlightSlotDraftSchema.extend({
  projectId: z.uuid("Select an active project"),
  desktop: homepageSpotlightMediaSchema.extend({
    src: z.string().trim().min(1, "Upload a desktop Spotlight image").max(2_048),
  }).strict(),
  mobile: homepageSpotlightMobileMediaSchema.extend({
    src: z.string().trim().min(1, "Upload a mobile Spotlight image").max(2_048),
  }).strict().optional(),
}).strict();

export const homepageSpotlightConfigSchema = z.object({
  slots: z.tuple([
    homepageSpotlightSlotSchema,
    homepageSpotlightSlotSchema,
    homepageSpotlightSlotSchema,
    homepageSpotlightSlotSchema,
  ]),
}).strict();

export function createEmptyHomepageSpotlightConfig(): HomepageSpotlightConfigDraft {
  const slot = () => ({
    projectId: "",
    desktop: { src: "", alt: "", focalPosition: "center" as const },
  });
  return { slots: [slot(), slot(), slot(), slot()] };
}

export function omitEmptySpotlightMobile(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const config = value as Record<string, unknown>;
  if (!Array.isArray(config.slots)) return value;

  return {
    ...config,
    slots: config.slots.map((slot) => {
      if (!slot || typeof slot !== "object" || Array.isArray(slot)) return slot;
      const record = slot as Record<string, unknown>;
      if (!("mobile" in record)) return slot;
      const mobile = record.mobile;
      const withoutMobile = () => Object.fromEntries(
        Object.entries(record).filter(([key]) => key !== "mobile"),
      );
      if (mobile === null || mobile === undefined) return withoutMobile();
      if (typeof mobile !== "object" || Array.isArray(mobile)) return slot;
      const src = (mobile as Record<string, unknown>).src;
      if (typeof src === "string" && src.trim()) return slot;
      return withoutMobile();
    }),
  };
}

export type HomepageSpotlightConfigDraft = z.infer<typeof homepageSpotlightConfigDraftSchema>;
export type HomepageSpotlightConfig = z.infer<typeof homepageSpotlightConfigSchema>;
