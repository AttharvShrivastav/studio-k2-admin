import { z } from "zod";

export const spotlightFocalPositions = ["left", "center", "right"] as const;
export const spotlightFocalPositionSchema = z.enum(spotlightFocalPositions);
const contentText = (maximum = 2_000) => z.string().trim().min(1, "This field is required").max(maximum);
const imageSource = z.string().trim().min(1, "Upload an image").max(2_048);

export const homepageImageSchema = z.object({
  src: imageSource,
  alt: z.string().trim().max(240),
}).strict();

export const homepageResponsiveMediaSchema = z.object({
  src: imageSource,
  alt: z.string().trim().max(240),
  focalPosition: spotlightFocalPositionSchema,
  mobile: z.object({
    src: imageSource,
    alt: z.string().trim().max(240).optional(),
    focalPosition: spotlightFocalPositionSchema.optional(),
  }).strict().optional(),
}).strict();

export const homepageHorizontalJourneySchema = z.object({
  designStatement: z.object({
    heading: z.object({
      line1: contentText(160),
      line2First: contentText(160),
      line2Second: contentText(160),
      line3: contentText(160),
      line4: contentText(160),
      line5: contentText(160),
    }).strict(),
    bodyCopy: contentText(2_000),
    landscapeImage: homepageImageSchema,
    interiorImages: z.tuple([homepageImageSchema, homepageImageSchema]),
  }).strict(),
  pauseStatement: z.object({
    heading: z.object({
      line1: contentText(160),
      line2First: contentText(160),
      line2Second: contentText(160),
      line3First: contentText(160),
      line3Second: contentText(160),
      line4First: contentText(160),
      line4Second: contentText(160),
    }).strict(),
    bodyCopy: contentText(2_000),
  }).strict(),
  studioStatement: z.object({
    heading: z.object({
      line1First: contentText(160),
      line1Second: contentText(160),
      line1Third: contentText(160),
      line2First: contentText(160),
      line2Second: contentText(160),
      line3First: contentText(160),
      line3Second: contentText(160),
      line3Third: contentText(160),
      line4First: contentText(160),
      line4Second: contentText(160),
      line5First: contentText(160),
      line5Second: contentText(160),
      line5Third: contentText(160),
      line6First: contentText(160),
      line6Second: contentText(160),
    }).strict(),
    mainImage: homepageImageSchema,
    foundersImage: homepageImageSchema,
    processImage: homepageImageSchema,
  }).strict(),
  projectsIntroduction: z.object({
    heading: z.object({
      line1: contentText(160),
      line2First: contentText(160),
      line2Second: contentText(160),
      line3: contentText(160),
      line4First: contentText(160),
      line4Second: contentText(160),
      line5: contentText(160),
    }).strict(),
    bodyCopy: contentText(2_000),
  }).strict(),
}).strict();

export const homepageFrameThreeSchema = z.object({
  images: z.tuple([homepageResponsiveMediaSchema, homepageResponsiveMediaSchema]),
}).strict();

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

export const homepageConfigDraftSchema = z.object({
  horizontalJourney: homepageHorizontalJourneySchema,
  frame3: homepageFrameThreeSchema,
  spotlight: homepageSpotlightConfigDraftSchema,
}).strict();

export const homepageConfigSchema = z.object({
  horizontalJourney: homepageHorizontalJourneySchema,
  frame3: homepageFrameThreeSchema,
  spotlight: homepageSpotlightConfigSchema,
}).strict();

export function createEmptyHomepageSpotlightConfig(): HomepageSpotlightConfigDraft {
  const slot = () => ({
    projectId: "",
    desktop: { src: "", alt: "", focalPosition: "center" as const },
  });
  return { slots: [slot(), slot(), slot(), slot()] };
}

export function createDefaultHomepageContent(): Pick<HomepageConfigDraft, "horizontalJourney" | "frame3"> {
  return {
    horizontalJourney: {
      designStatement: {
        heading: { line1: "DESIGNING", line2First: "THE", line2Second: "SPACE", line3: "BETWEEN", line4: "FUNCTION", line5: "AND FEELING" },
        bodyCopy: "We Believe Architecture Should Do More Than Provide Shelter. It Should Slow Time, Frame Meaningful Moments And Transform The Ordinary Rituals Of Life Into Experiences That Remain With Us.",
        landscapeImage: { src: "/assets/home/frame-01/frame-01-big.webp", alt: "Studio K2 Architecture Landscape and Form" },
        interiorImages: [
          { src: "/assets/home/frame-01/frame-01-small-01.webp", alt: "Studio K2 Architecture Interior Perspective 01" },
          { src: "/assets/home/frame-01/frame-01-small-02.webp", alt: "Studio K2 Architecture Interior Perspective 02" },
        ],
      },
      pauseStatement: {
        heading: { line1: "SPACES THAT INVITE", line2First: "US", line2Second: "TO PAUSE", line3First: "TO", line3Second: "BREATHE", line4First: "AND", line4Second: "DISCONNECT" },
        bodyCopy: "K2 Is An Architecture And Design Studio Creating Considered Spaces For Living, Working And Gathering. We Work With Light, Landscape, Material And Memory To Shape Places That Remain Relevant Long After They Are Completed.",
      },
      studioStatement: {
        heading: {
          line1First: "BEHIND EVERY SPACE", line1Second: "ARE", line1Third: "THE PEOPLE",
          line2First: "WHO IMAGINE IT.", line2Second: "PARESH KAPADE",
          line3First: "AND", line3Second: "SHITAL KAPADE", line3Third: "BRING",
          line4First: "TOGETHER", line4Second: "DISTINCT PERSPECTIVES,",
          line5First: "SHARED CURIOSITY", line5Second: "AND", line5Third: "A",
          line6First: "THOUGHTFUL", line6Second: "APPROACH TO DESIGN",
        },
        mainImage: { src: "/assets/home/people/studio-main.webp", alt: "Studio K2 Architecture & Studio Space with Terracotta Slat Wall" },
        foundersImage: { src: "/assets/home/people/founders-portrait.webp", alt: "Paresh Kapade & Shital Kapade — Studio K2 Founders" },
        processImage: { src: "/assets/home/people/studio-process.webp", alt: "Studio K2 Design Process and Material Selection" },
      },
      projectsIntroduction: {
        heading: { line1: "VISIONS THAT BEGIN", line2First: "WITH", line2Second: "A THOUGHT", line3: "TAKE SHAPE", line4First: "AND", line4Second: "BECOME", line5: "PLACES" },
        bodyCopy: "A Selection Of K2 Projects Shaped Through Context, Light, Material And The People They Are Designed For. Each One Begins With A Distinct Idea And Evolves Into A Place With Its Own Character, Purpose And Way Of Living.",
      },
    },
    frame3: {
      images: [
        { src: "/assets/home/frame-03/frame-03-large-01.webp", alt: "Studio K2 Architecture Background Shot 01", focalPosition: "center" },
        { src: "/assets/home/frame-03/frame-03-large-02.webp", alt: "Studio K2 Architecture Background Shot 02", focalPosition: "center" },
      ],
    },
  };
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

function withoutEmptyMobile(media: unknown): unknown {
  if (!media || typeof media !== "object" || Array.isArray(media)) return media;
  const record = media as Record<string, unknown>;
  if (!("mobile" in record)) return media;
  const mobile = record.mobile;
  if (mobile && typeof mobile === "object" && !Array.isArray(mobile)) {
    const src = (mobile as Record<string, unknown>).src;
    if (typeof src === "string" && src.trim()) return media;
  } else if (mobile !== null && mobile !== undefined) {
    return media;
  }
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== "mobile"));
}

export function omitEmptyHomepageMobile(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const config = value as Record<string, unknown>;
  if (!("horizontalJourney" in config) || !("frame3" in config) || !("spotlight" in config)) {
    return omitEmptySpotlightMobile(value);
  }
  const frame3 = config.frame3;
  const normalizedFrame3 = frame3 && typeof frame3 === "object" && !Array.isArray(frame3)
    ? {
        ...(frame3 as Record<string, unknown>),
        images: Array.isArray((frame3 as Record<string, unknown>).images)
          ? ((frame3 as Record<string, unknown>).images as unknown[]).map(withoutEmptyMobile)
          : (frame3 as Record<string, unknown>).images,
      }
    : frame3;
  return {
    ...config,
    frame3: normalizedFrame3,
    spotlight: omitEmptySpotlightMobile(config.spotlight),
  };
}

export type HomepageSpotlightConfigDraft = z.infer<typeof homepageSpotlightConfigDraftSchema>;
export type HomepageSpotlightConfig = z.infer<typeof homepageSpotlightConfigSchema>;
export type HomepageHorizontalJourney = z.infer<typeof homepageHorizontalJourneySchema>;
export type HomepageFrameThree = z.infer<typeof homepageFrameThreeSchema>;
export type HomepageConfigDraft = z.infer<typeof homepageConfigDraftSchema>;
export type HomepageConfig = z.infer<typeof homepageConfigSchema>;
export type HomepageStoredConfig = HomepageConfigDraft | HomepageSpotlightConfigDraft;
