import { z } from "zod";

export const spotlightFocalPositions = ["left", "center", "right"] as const;
export const spotlightFocalPositionSchema = z.enum(spotlightFocalPositions);

const mediaShape = {
  src: z.string().trim().max(2_048),
  alt: z.string().trim().max(240),
  focalPosition: spotlightFocalPositionSchema,
};

export const homepageSpotlightMediaSchema = z.object(mediaShape).strict();
export const homepageSpotlightMobileMediaSchema = z.object(mediaShape).strict();

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

export type HomepageSpotlightConfigDraft = z.infer<typeof homepageSpotlightConfigDraftSchema>;
export type HomepageSpotlightConfig = z.infer<typeof homepageSpotlightConfigSchema>;
