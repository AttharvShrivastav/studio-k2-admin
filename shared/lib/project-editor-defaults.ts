import type { TemplateType } from "../schemas/project.js";
import type { BrowserImageConfig, FooterConfig, GalleryConfig, HeroConfig, SeoConfig, TemplateConfig, ThemeConfig } from "../schemas/project-editor.js";

export const emptyMedia = () => ({ src: "", alt: "", focalPosition: "center" });
export const createBrowserImage = (): BrowserImageConfig => ({ src: "", alt: "", focalPosition: "center" });
export const createHeroConfig = (): HeroConfig => ({ enabled: false, media: emptyMedia(), title: ["", ""], squareFootage: "", squareFootageLabel: "" });
export const createThemeConfig = (): ThemeConfig => ({ horizontalBackgroundColor: "", horizontalTextColor: "" });
export const createGalleryConfig = (): GalleryConfig => ({ enabled: false, titleLines: ["", ""], images: [] });
export const createFooterConfig = (): FooterConfig => ({ variant: "compact", theme: "black" });
export const createSeoConfig = (): SeoConfig => ({ title: "", description: "", socialImage: "" });

const intro = () => ({ enabled: false, headingLines: [], bodyCopy: "" });
const horizontalTwelve = () => ({ enabled: false, images: [], frame1Heading: ["", "", ""] as [string, string, string], frame1Body: "", frame2PrimaryMedia: emptyMedia(), frame2SecondaryMedia: emptyMedia(), frame3Heading1: "", frame3Heading2A: "", frame3Heading2B: "", frame3Heading3: "", frame3Heading4A: "", frame3Heading4B: "", frame3Body: "", frame3Media: emptyMedia(), trailingImages: null });
const drawingTwelve = () => ({ enabled: false, drawingAreaLabel: "", drawingTitle: "", drawingDescription: "", media: emptyMedia(), accentColor: "" });

export const createTemplateFourFrames = (): Extract<TemplateConfig, { template: "template-4" }>["sections"]["horizontalStory"]["content"]["frames"] => [
  { type: "editorial", headingLines: [], body: "", shiftLineIndex: 2, shiftAmountPx: 58 },
  { type: "imageScene", primaryImage: "", primaryImageAlt: "", primaryImageFocal: "center", secondaryImage: "", secondaryImageAlt: "", secondaryImageFocal: "center", preEntranceOffsetVw: -18, secondaryOverlayWidthVw: 44, secondaryOverlayHeightSvh: 36 },
  { type: "editorialImage", headingLine1: "", headingLine2A: "", headingLine2B: "", headingLine3: "", headingLine4A: "", headingLine4B: "", body: "", image: "", imageAlt: "", imageFocal: "center", overlapVw: 30, imageWidthVw: 100, shiftAmountPx: 56 },
];

export function createTemplateConfig(template: TemplateType): TemplateConfig {
  if (template === "template-1") return { template, sections: {
    statement: { enabled: false, lines: [] },
    story: { enabled: false, headingLines: ["", "", ""], bodyCopy: "", primaryMedia: emptyMedia(), secondMedia: emptyMedia() },
    bespoke: { enabled: false, module: "none", framePath: "", frameCount: 0 },
    feature: { enabled: false, headingLines: ["", "", ""], bodyCopy: "", media: emptyMedia() },
    horizontalStory: horizontalTwelve(),
    drawing: { enabled: false, headingLines: [], bodyCopy: "", media: emptyMedia() },
  }};
  if (template === "template-2") return { template, sections: { intro: { enabled: false, headingLines: ["", "", ""], bodyCopy: "" }, horizontalStory: horizontalTwelve(), narrative: { enabled: false, headingLines: [], bodyCopy: "", images: [] }, drawing: drawingTwelve() }};
  if (template === "template-3") return { template, sections: {
    intro: { enabled: false, headingLines: ["", "", ""], bodyCopy: "" },
    bespoke: { enabled: false, module: "", variant: "editorial", showEditorialIntro: false, framePath: "", frameCount: 0 },
    horizontalStory: { enabled: false, accentColor: "", textColor: "", frame2HeadingLine1: "", frame2HeadingLine2A: "", frame2HeadingLine2B: "", frame2HeadingLine3: "", frame2Heading4A: "", frame2Heading4B: "", frame2Body: "", frame4Heading1: "", frame4Heading2A: "", frame4Heading2B: "", frame4Heading3: "", frame4Heading4A: "", frame4Heading4B: "", frame4Body: "" },
    drawing: { enabled: false, drawing: "", drawingAlt: "", accentColor: "", headingLines: ["", "", ""], bodyCopy: "" },
  }};
  return { template, sections: { intro: intro(), horizontalStory: { enabled: false, content: { accentColor: "", textColor: "", frames: createTemplateFourFrames(), gallery: null } }, narrative: { enabled: false, headingLines: [], bodyCopy: "", images: [] }, drawing: drawingTwelve() }};
}

export function isEmptyStoredConfig(value: unknown): boolean {
  return !value || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);
}

  const meaningful = (entry: unknown): boolean => Array.isArray(entry) ? entry.some(meaningful) : entry && typeof entry === "object" ? Object.values(entry).some(meaningful) : Boolean(entry);
export function hasMeaningfulTemplateConfig(value: unknown): boolean {
  if (isEmptyStoredConfig(value)) return false;
  const sections = (value as { sections?: Record<string, unknown> }).sections;
  if (!sections) return true;
  return Object.values(sections).some((section) => {
    if (!section || typeof section !== "object") return false;
    const content = { ...(section as Record<string, unknown>) };
    return meaningful(content);
    return meaningful(content);
  });
}
