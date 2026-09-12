import { z } from "zod";
import { createProjectInputSchema } from "./project.js";

const shortText = z.string().trim().max(240);
const bodyText = z.string().trim().max(12_000);
const mediaSourceSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/") ||
      value.startsWith("https://") ||
      value.startsWith("http://"),
    "Use an uploaded path or an HTTP(S) URL",
  );
const focalPositionSchema = z.string().trim().max(80).optional();
const linePairSchema = z.tuple([shortText, shortText]);
const lineTripleSchema = z.tuple([shortText, shortText, shortText]);
const headingLinesSchema = z.array(shortText).max(8);
const cssColorSchema = z
  .string()
  .trim()
  .max(80)
  .refine(
    (value) =>
      value === "" ||
      /^#[\da-f]{3,8}$/i.test(value) ||
      /^(?:rgb|rgba|hsl|hsla)\([^;{}]+\)$/.test(value) ||
      /^var\(--[\w-]+\)$/.test(value) ||
      /^[a-z]+$/i.test(value),
    "Enter a valid CSS color",
  );

export const browserFocalPositions = ["left", "center", "right"] as const;
export const narrativeDepths = ["background", "middle", "foreground", "rear"] as const;
export const bespokeModules = [
  "isometric",
  "exploded-isometric",
  "tower-expansion",
  "scroll-video",
  "scroll-video-option-1",
  "scroll-video-option-2",
  "none",
] as const;

export const browserImageSchema = z
  .object({
    src: mediaSourceSchema,
    alt: shortText,
    focalPosition: z.enum(browserFocalPositions).optional(),
  })
  .strict();

const mobileMediaSchema = z
  .object({
    src: mediaSourceSchema,
    alt: shortText.optional(),
    focalPosition: focalPositionSchema,
  })
  .strict();

export const responsiveMediaSchema = z
  .object({
    src: mediaSourceSchema,
    alt: shortText,
    focalPosition: focalPositionSchema,
    mobile: mobileMediaSchema.optional(),
  })
  .strict();

export const heroConfigSchema = z
  .object({
    enabled: z.boolean(),
    media: responsiveMediaSchema,
    title: linePairSchema.optional(),
    squareFootage: shortText.optional(),
    squareFootageLabel: shortText.optional(),
  })
  .strict()
  .superRefine((hero, context) => {
    if (hero.enabled && !hero.media.src) {
      context.addIssue({
        code: "custom",
        path: ["media", "src"],
        message: "Desktop image is required when Hero is enabled",
      });
    }
  });

export const themeConfigSchema = z
  .object({
    horizontalBackgroundColor: cssColorSchema,
    horizontalTextColor: cssColorSchema,
  })
  .strict();

export const narrativeImageSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    src: mediaSourceSchema,
    alt: shortText,
    focalPosition: focalPositionSchema,
    depth: z.enum(narrativeDepths),
    speed: z.number().finite().min(0).max(2),
  })
  .strict();

export const galleryImageSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    src: mediaSourceSchema,
    alt: shortText.optional(),
    caption: shortText.optional(),
    thumbnailSrc: mediaSourceSchema.optional(),
    category: shortText.optional(),
    focalPosition: focalPositionSchema,
  })
  .strict();

export const galleryConfigSchema = z
  .object({
    enabled: z.boolean(),
    titleLines: linePairSchema.optional(),
    images: z.array(galleryImageSchema).max(9),
    expandedImages: z.array(galleryImageSchema).max(60).optional(),
  })
  .strict()
  .superRefine((gallery, context) => {
    if (gallery.enabled && ![3, 6, 9].includes(gallery.images.length)) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Enabled galleries require exactly 3, 6, or 9 visible images",
      });
    }
    if (gallery.enabled && gallery.images.some((image) => !image.src)) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Every visible gallery image requires a source",
      });
    }
    if (gallery.expandedImages) {
      const missing = gallery.images.some(
        (visible) =>
          !gallery.expandedImages?.some(
            (expanded) => expanded.id === visible.id || expanded.src === visible.src,
          ),
      );
      if (missing) {
        context.addIssue({
          code: "custom",
          path: ["expandedImages"],
          message: "Every visible image must also exist in the expanded collection",
        });
      }
    }
  });

export const footerConfigSchema = z
  .object({
    variant: z.literal("compact"),
    theme: z.enum(["accent", "black", "white"]).optional(),
  })
  .strict();

export const seoConfigSchema = z
  .object({
    title: shortText.optional(),
    description: z.string().trim().max(320).optional(),
    socialImage: mediaSourceSchema.optional(),
  })
  .strict();

const introSchema = z
  .object({ enabled: z.boolean(), headingLines: headingLinesSchema, bodyCopy: bodyText })
  .strict();

const horizontalStoryTwelveSchema = z
  .object({
    enabled: z.boolean(),
    images: z.array(z.union([mediaSourceSchema, responsiveMediaSchema])).optional(),
    frame1Heading: lineTripleSchema,
    frame1Body: bodyText,
    frame2PrimaryMedia: responsiveMediaSchema.optional(),
    frame2SecondaryMedia: responsiveMediaSchema.optional(),
    frame3Heading1: shortText.optional(),
    frame3Heading2A: shortText.optional(),
    frame3Heading2B: shortText.optional(),
    frame3Heading3: shortText.optional(),
    frame3Heading4A: shortText.optional(),
    frame3Heading4B: shortText.optional(),
    frame3Body: bodyText.optional(),
    frame3Media: responsiveMediaSchema.optional(),
    trailingImages: z.null().optional(),
    scrollMultiplier: z.number().positive().max(20).optional(),
  })
  .strict();

const drawingTwelveSchema = z
  .object({
    enabled: z.boolean(),
    drawingAreaLabel: shortText,
    drawingTitle: shortText,
    drawingDescription: bodyText,
    media: responsiveMediaSchema,
    accentColor: cssColorSchema.optional(),
  })
  .strict();

const templateOneSchema = z
  .object({
    template: z.literal("template-1"),
    sections: z
      .object({
        statement: z.object({ enabled: z.boolean(), lines: headingLinesSchema }).strict(),
        story: z
          .object({
            enabled: z.boolean(),
            headingLines: lineTripleSchema,
            bodyCopy: bodyText,
            primaryMedia: responsiveMediaSchema,
            secondMedia: responsiveMediaSchema,
          })
          .strict(),
        bespoke: z.object({ enabled: z.boolean(), module: z.enum(bespokeModules) }).strict(),
        feature: z
          .object({
            enabled: z.boolean(),
            headingLines: headingLinesSchema,
            bodyCopy: bodyText,
            media: responsiveMediaSchema,
          })
          .strict(),
        horizontalStory: horizontalStoryTwelveSchema,
        drawing: z
          .object({
            enabled: z.boolean(),
            headingLines: headingLinesSchema,
            bodyCopy: bodyText,
            media: responsiveMediaSchema,
            boxColor: cssColorSchema.optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const templateTwoSchema = z
  .object({
    template: z.literal("template-2"),
    sections: z
      .object({
        intro: introSchema,
        horizontalStory: horizontalStoryTwelveSchema,
        narrative: z
          .object({
            enabled: z.boolean(),
            headingLines: headingLinesSchema,
            bodyCopy: bodyText,
            images: z.array(narrativeImageSchema).max(24),
          })
          .strict(),
        drawing: drawingTwelveSchema,
      })
      .strict(),
  })
  .strict();

const templateThreeSchema = z
  .object({
    template: z.literal("template-3"),
    sections: z
      .object({
        intro: introSchema,
        bespoke: z
          .object({
            enabled: z.boolean(),
            module: shortText.optional(),
            variant: z.enum(["editorial", "fullscreen", "option-1", "option-2"]),
            showEditorialIntro: z.boolean(),
            framePath: mediaSourceSchema,
            frameCount: z.number().int().nonnegative(),
          })
          .strict(),
        horizontalStory: z
          .object({
            enabled: z.boolean(),
            accentColor: cssColorSchema.optional(),
            textColor: cssColorSchema.optional(),
            frame1Image: mediaSourceSchema.optional(),
            frame2HeadingLine1: shortText,
            frame2HeadingLine2A: shortText,
            frame2HeadingLine2B: shortText,
            frame2HeadingLine3: shortText,
            frame2Heading4A: shortText,
            frame2Heading4B: shortText,
            frame2Body: bodyText,
            frame2Image: mediaSourceSchema,
            frame3Image: mediaSourceSchema,
            frame4Heading1: shortText,
            frame4Heading2A: shortText,
            frame4Heading2B: shortText,
            frame4Heading3: shortText,
            frame4Heading4A: shortText,
            frame4Heading4B: shortText,
            frame4Body: bodyText,
            frame4Image: mediaSourceSchema,
          })
          .strict(),
        drawing: z
          .object({
            enabled: z.boolean(),
            drawing: mediaSourceSchema,
            drawingAlt: shortText.optional(),
            accentColor: cssColorSchema,
            headingLines: headingLinesSchema,
            bodyCopy: bodyText,
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const templateFourSchema = z
  .object({
    template: z.literal("template-4"),
    sections: z
      .object({
        intro: introSchema,
        horizontalStory: z
          .object({
            enabled: z.boolean(),
            content: z
              .object({
                accentColor: cssColorSchema.optional(),
                textColor: cssColorSchema.optional(),
                frames: z.array(z.never()).max(0),
                gallery: z.null().optional(),
              })
              .strict(),
          })
          .strict(),
        narrative: z
          .object({
            enabled: z.boolean(),
            headingLines: headingLinesSchema,
            bodyCopy: bodyText,
            images: z.array(narrativeImageSchema).max(24),
            takeoverImage: z
              .object({ src: mediaSourceSchema, alt: shortText.optional(), focalPosition: focalPositionSchema })
              .strict()
              .optional(),
          })
          .strict(),
        drawing: drawingTwelveSchema,
      })
      .strict(),
  })
  .strict();

export const templateConfigSchema = z.discriminatedUnion("template", [
  templateOneSchema,
  templateTwoSchema,
  templateThreeSchema,
  templateFourSchema,
]);

export const projectEditorInputSchema = z
  .object({
    general: createProjectInputSchema,
    browserImage: browserImageSchema,
    hero: heroConfigSchema,
    themeConfig: themeConfigSchema,
    templateConfig: templateConfigSchema,
    galleryConfig: galleryConfigSchema,
    footerConfig: footerConfigSchema,
    seoConfig: seoConfigSchema,
    confirmTemplateReset: z.boolean().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.general.templateType !== input.templateConfig.template) {
      context.addIssue({
        code: "custom",
        path: ["templateConfig", "template"],
        message: "Template content must match the selected template",
      });
    }
  });

export type BrowserImageConfig = z.infer<typeof browserImageSchema>;
export type ResponsiveMedia = z.infer<typeof responsiveMediaSchema>;
export type HeroConfig = z.infer<typeof heroConfigSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type NarrativeImageItem = z.infer<typeof narrativeImageSchema>;
export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type GalleryConfig = z.infer<typeof galleryConfigSchema>;
export type FooterConfig = z.infer<typeof footerConfigSchema>;
export type SeoConfig = z.infer<typeof seoConfigSchema>;
export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type ProjectEditorInput = z.infer<typeof projectEditorInputSchema>;
