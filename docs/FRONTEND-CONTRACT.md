# Studio K2 Admin frontend contract handoff

This is a snapshot of the locked frontend contract for the separate Admin/CMS repository. The frontend uses controlled, fixed templates. The Admin supplies validated content and explicit media; it does not construct freeform pages.

Source of truth:

- Project types and adapters: `src/types/project.ts`
- Authoritative public registry and project configs: `src/data/projectsData.ts`
- Responsive media: `src/types/responsiveMedia.ts`
- Horizontal stories: `src/components/horizontal/types.ts`
- Gallery items: `src/components/project/gallery/projectGalleryTypes.ts`
- Template 1 bespoke identifiers: `src/components/project/template-one/bespoke/templateOneBespokeTypes.ts`
- Homepage Frame 3: `src/components/home/homeMedia.ts`
- Homepage Spotlight: `src/components/home/project-spotlight/spotlightTypes.ts` and `spotlightConfig.ts`
- Contact/site content: `src/config/contactConfig.ts` and `src/components/footer/footerTypes.ts`

## Project registry and common fields

`STUDIO_PROJECT_REGISTRY: ProjectRegistryEntry[]` is the authority for public listing, detail lookup, Spotlight validation, and ProjectNavigation.

```ts
type ProjectCategory = 'built' | 'unbuilt';
type ProjectLifecycle = 'active' | 'archived';
type ProjectTemplate = 'template-1' | 'template-2' | 'template-3' | 'template-4';

interface ProjectRegistryEntry {
  id: string;
  lifecycle: ProjectLifecycle;
  browser: ProjectBrowserConfig;
  templateType: ProjectTemplate;
  projectConfig: ProjectConfig;
}
```

There is no draft state. Public routes, `/projects`, Spotlight, and ProjectNavigation must ignore `archived` records. The future Admin operations are Archive, Restore, and deliberate permanent delete.

`templateType` must match the `projectConfig.template` discriminator. `ProjectConfig` is the exact union `TemplateOneProjectConfig | TemplateTwoProjectConfig | TemplateThreeProjectConfig | TemplateFourProjectConfig`.

Each project config contains `id`, `slug`, `title: [string, string]`, `squareFootage`, `squareFootageLabel`, its literal `template`, `theme`, optional `footer`, optional `seo`, and its template-specific `sections`. Templates 2–4 also currently contain optional top-level `accentColor`; Template 1 does not.

### Browser/listing fields

```ts
interface ProjectBrowserConfig {
  title: string;
  slug: string;
  category: ProjectCategory;
  image: {
    src: string;
    alt: string;
    focalPosition?: 'left' | 'center' | 'right';
  };
  location?: string;
  area?: string;
  areaLabel?: string;
  year?: string;
  order: number;
}
```

`browser.image` is the explicit listing/WebGL image. It is independent of the project Hero, Homepage Spotlight, Gallery, and SEO social image. `normalizeProjectListing()` derives the slider-facing `ProjectListingItem`; the Admin must not persist that derived adapter as a competing project dataset.

## Responsive media and Hero

```ts
interface ResponsiveMedia {
  src: string;
  alt: string;
  focalPosition?: string;
  mobile?: {
    src: string;
    alt?: string;
    focalPosition?: string;
  };
}
```

`ExplicitMediaSlot` extends `ResponsiveMedia`. Desktop `src` and `alt` are canonical. A nonempty `mobile.src` overrides them on mobile; otherwise `resolveResponsiveMedia()` returns desktop media. Missing mobile alt/focal position inherits the desktop value.

Every project Hero has this exact section shape:

```ts
hero: {
  enabled: boolean;
  media: ExplicitMediaSlot;
  title?: [string, string];
  squareFootage?: string;
  squareFootageLabel?: string;
}
```

Hero media is project-owned. It must not populate or alter browser, Spotlight, Gallery, or SEO fields. No media path may be inferred by folder scanning or filename convention.

An absent optional media slot produces no media DOM, reserved space, trigger, or scroll distance. An absent mobile override is different: it falls back to desktop media.

## Project theme and compact footer

```ts
interface ProjectThemeConfig {
  horizontalBackgroundColor: string;
  horizontalTextColor: string;
}

type ProjectFooterTheme = 'accent' | 'black' | 'white';

interface ProjectFooterConfig {
  variant: 'compact';
  theme?: ProjectFooterTheme;
}
```

Theme values feed project-scoped horizontal colors. Compact-footer `accent` uses `horizontalBackgroundColor` as background and `horizontalTextColor` as foreground. If footer theme is absent, `resolveProjectFooterTheme()` selects `accent` when both theme values are nonempty, otherwise `black`. Black and white use the locked palette in `src/components/footer/projectFooterTheme.ts`.

The Admin may select Accent, Black, or White. It must not configure arbitrary footer colors, layout, labels, or routes. Compact-footer Contact routes to `/contact`; Homepage full-footer Contact uses the separate flip interaction.

## Enable/disable rule

Each template owns its fixed section order. The Admin may expose only existing section `enabled` flags and declared content fields. Disabled means no DOM, height, ScrollTrigger, pin, pin spacing, timeline, or residue. Sections cannot be freely added or reordered.

## Template 1 — `template-1`

Type: `TemplateOneSectionsConfig`. Fixed order: Hero → Statement → Story → Bespoke → Feature → Horizontal Story → Drawing → Gallery → Navigation.

- `hero`: shared Hero fields above.
- `statement`: `enabled`, `lines: string[]`.
- `story`: `enabled`, `headingLines: [string, string, string]`, `bodyCopy`, `primaryMedia`, `secondMedia`.
- `bespoke`: `enabled`, `module: TemplateOneBespokeModule`.
- `feature`: `enabled`, `headingLines`, `bodyCopy`, `media`.
- `horizontalStory`: Template 1/2 structure below.
- `drawing`: `enabled`, `headingLines`, `bodyCopy`, `media`, optional `boxColor`.
- `gallery`: `ProjectGalleryConfig`.
- `navigation`: `enabled`, optional `headingLines`, renderer-facing `projects: NavProjectItem[]`.

`TemplateOneBespokeModule` currently allows `isometric | exploded-isometric | tower-expansion | scroll-video | scroll-video-option-1 | scroll-video-option-2 | none`.

## Template 2 — `template-2`

Type: `TemplateTwoSectionsConfig`. Fixed order: Hero → Intro → Horizontal Story → Narrative → Drawing → Gallery → Navigation.

- `hero`: shared Hero fields.
- `intro`: `enabled`, `headingLines`, `bodyCopy`.
- `horizontalStory`: Template 1/2 structure below.
- `narrative`: `enabled`, `headingLines`, `bodyCopy`, `images: NarrativeImageItem[]`.
- `drawing`: `enabled`, `drawingAreaLabel`, `drawingTitle`, `drawingDescription`, `media`, optional `accentColor`.
- `gallery`: `ProjectGalleryConfig`.
- `navigation`: `enabled`, optional `headingLines`, renderer-facing `projects`.

`NarrativeImageItem` in `src/data/templateTwoData.ts` contains `id`, `src`, `alt`, optional `focalPosition`, `depth: 'background' | 'middle' | 'foreground' | 'rear'`, and numeric `speed`.

## Template 3 — `template-3`

Type: `TemplateThreeSectionsConfig`. Fixed order: Hero → Intro → Bespoke → Horizontal Story → Drawing → Gallery → Navigation.

- `hero`: shared Hero fields.
- `intro`: `enabled`, `headingLines`, `bodyCopy`.
- `bespoke`: `enabled`; optional `module`, `variant: 'editorial' | 'fullscreen' | 'option-1' | 'option-2'`, `showEditorialIntro`, `framePath`, `frameCount`.
- `horizontalStory`: `enabled`; optional `accentColor`, `textColor`, `frame1Image`; `frame2HeadingLine1`, `frame2HeadingLine2A`, `frame2HeadingLine2B`, `frame2HeadingLine3`, `frame2Heading4A`, `frame2Heading4B`, `frame2Body`, `frame2Image`; `frame3Image`; `frame4Heading1`, `frame4Heading2A`, `frame4Heading2B`, `frame4Heading3`, `frame4Heading4A`, `frame4Heading4B`, `frame4Body`, `frame4Image`.
- `drawing`: `enabled`, `drawing`, optional `drawingAlt`, `accentColor`, `headingLines`, `bodyCopy`.
- `gallery`: `ProjectGalleryConfig`.
- `navigation`: `enabled`, optional `headingLines`, renderer-facing `projects`.

## Template 4 — `template-4`

Type: `TemplateFourSectionsConfig`. Canonical assembly: `HORIZON_PAVILION_CONFIG` in `src/data/templateFourConfig.ts`. Fixed order: Hero → Intro → Horizontal Story → Narrative/takeover → Drawing → Gallery → Navigation.

- `hero`: shared Hero fields.
- `intro`: `enabled`, `headingLines`, `bodyCopy`.
- `horizontalStory`: `enabled`, `content: HorizontalStoryConfig`.
- `narrative`: `enabled`, `headingLines`, `bodyCopy`, `images: any[]`, optional `takeoverImage: { src, alt?, focalPosition? }`. The canonical config currently supplies `NarrativeImageItem[]`; do not invent a broader Admin structure from the frontend's `any[]` declaration.
- `drawing`: `enabled`, `drawingAreaLabel`, `drawingTitle`, `drawingDescription`, `media`, optional `accentColor`.
- `gallery`: `ProjectGalleryConfig`.
- `navigation`: `enabled`, optional `headingLines`, renderer-facing `projects`.

## Horizontal-story structures

Templates 1 and 2 store:

```ts
{
  enabled: boolean;
  images?: (string | ExplicitMediaSlot)[];
  frame1Heading: [string, string, string];
  frame1Body: string;
  frame2PrimaryMedia?: ExplicitMediaSlot;
  frame2SecondaryMedia?: ExplicitMediaSlot;
  frame3Heading1?: string;
  frame3Heading2A?: string;
  frame3Heading2B?: string;
  frame3Heading3?: string;
  frame3Heading4A?: string;
  frame3Heading4B?: string;
  frame3Body?: string;
  frame3Media?: ExplicitMediaSlot;
  trailingImages?: HorizontalGalleryItem[] | null;
  scrollMultiplier?: number;
}
```

`buildHorizontalStoryConfig()` converts this to `HorizontalStoryConfig`. `images` is retained compatibility input; current configs also provide named media slots. `HorizontalGalleryItem` contains `id`, `src`, `alt`, optional focal position, width, and reveal direction.

Template 3 has its dedicated four-frame structure listed above. Template 4 stores the shared structure directly:

```ts
interface HorizontalStoryConfig {
  accentColor?: string;
  textColor?: string;
  frames: HorizontalFrame[];
  gallery?: HorizontalGalleryImage[] | null;
  endHold?: number;
  scrollMultiplier?: number;
}
```

`HorizontalFrame` is the union of `EditorialFrameConfig`, `ImageSceneFrameConfig`, `EditorialImageFrameConfig`, and `IntrinsicImageFrameConfig` in `src/components/horizontal/types.ts`. Frame order and renderer geometry are template-owned. Interaction mode, offsets, overlaps, widths, reveal directions, end hold, and scroll multiplier are not free Admin design controls.

Horizontal stories have no Gallery CTA/button-label field. The Admin must not expose a “View Gallery” field. Trailing horizontal images and the later project Gallery are separate.

## Gallery contract

```ts
interface ProjectGalleryConfig {
  enabled: boolean;
  titleLines?: [string, string];
  images: ProjectGalleryImage[];
  expandedImages?: ProjectGalleryImage[];
}

interface ProjectGalleryImage {
  id: string;
  src: string;
  alt?: string;
  caption?: string;
  thumbnailSrc?: string;
  category?: string;
  focalPosition?: string;
}
```

When enabled, visible `images` must contain exactly 3, 6, or 9 records. `expandedImages` may contain more explicit records. Every visible image must also occur in the expanded collection by matching `id` or `src`. If expanded images are omitted, the visible collection is the lightbox collection. Gallery/lightbox behavior remains frontend-owned.

## ProjectNavigation requirements

The Admin supplies stable project `id`, lifecycle, browser slug/title/image/category, and `browser.order`. `getProjectNavigationForSlug()` derives one nearest previous and up to two nearest next active projects, circularly, preferring the same `built | unbuilt` category and supplementing from the other category. It excludes the current project, archived records, duplicates, and fake destinations. With fewer than three unique non-current active projects, it returns only the available records.

`NavProjectItem` contains `id`, `title`, `slug`, `image`, and optional `focalPosition`, `plaqueColor`, and `relation`. Although template navigation sections currently contain `projects: NavProjectItem[]`, this is renderer-facing derived data. The Admin must not author a separate navigation order or destination list.

## SEO contract

```ts
interface ProjectSeoConfig {
  title?: string;
  description?: string;
  socialImage?: string;
}
```

`resolveProjectSocialImage()` applies metadata-only fallback: explicit social image → desktop project Hero → browser image. This fallback must never fill a visible media slot. Document-head integration remains Admin/backend work.

## Homepage Frame 3

`HOME_FRAME_THREE_MEDIA` is exactly `[ResponsiveMedia, ResponsiveMedia]`:

1. Desktop Image 01 with optional Mobile Image 01.
2. Desktop Image 02 with optional Mobile Image 02.

The fixed animation is Image 01 → Image 02. Mobile renders only the two large images. It must not receive a small/middle/inset image. Order, wipe, timing, pinning, and geometry remain frontend-owned.

## Homepage Spotlight

`HomeSpotlightConfig` is a tuple of exactly four `HomeSpotlightProject` records:

```ts
interface HomeSpotlightProject {
  projectId: string;
  title: string;
  slug: string;
  image: string;
  mobile?: ResponsiveMedia['mobile'];
  focalPosition?: 'left' | 'center' | 'right';
  plaqueColor?: string;
}
```

The Admin supplies four independently curated positions, each referencing an active project and explicitly assigning a desktop Spotlight image plus optional mobile override. Tuple order is Spotlight order and is independent of browser order. The same active project may occupy multiple slots with different explicit media. `title` and `slug` must agree with the selected registry record. Never derive media from Hero, browser image, Gallery, or a project folder. Archiving a selected project must block publication until all four slots again reference active projects. Plaque styling and animation choreography remain frontend-owned.

## Site Settings and Contact

```ts
interface ContactPageConfig {
  backgroundImage: { src: string; alt: string; focalPosition?: string };
  panelColor?: string;
  contactPanelColor?: string;
  instagramHref?: string;
  whatsappHref?: string;
  twitterHref?: string;
  facebookHref?: string;
  contactContent: ContactContentConfig;
}

interface ContactContentConfig {
  addressHeading: [string, string];
  addressLines: string[];
  phone: string;
  email: string;
  inquiryHeading: [string, string];
  successTitle: string;
  successCopy: string;
  locationHref?: string;
}
```

The current frontend expects the architectural background and focal position, panel colors, address, phone, email, headings/copy, Instagram URL, WhatsApp URL, and optional location URL. Instagram and WhatsApp also feed the compact project footer. Current social URLs are placeholders and `locationHref` is unset.

`twitterHref` and `facebookHref` remain in the current type but are not rendered by the locked full footer. They are documented here for exactness; they should not become visible Admin controls without a coordinated frontend change.

Homepage full-footer Contact flips without routing. Navbar and compact-footer Contact route to `/contact`. This behavior, link labels/routes, form interaction, and success-state behavior remain frontend-owned. Backend form delivery is not implemented.

## Sequence/frame module

```ts
interface ProjectSequenceContract {
  framePath: string;
  frames: string[];
}
```

The Admin must accept explicitly uploaded numbered frames, validate consistent extension/padding and contiguous numbering, sort numerically, and derive frame count. Editors must not type frame count. The frozen Sanjay config currently contains `framePath` and `frameCount: 295`; the integration adapter must consume validated uploads without changing `TemplateOneScrollSequence` preload, canvas, pin, scrub, reverse, or playback choreography.

## Isometric Expansion

The existing `exploded-isometric` renderer is supported by `TemplateOneBespokeModule` and `TemplateOneBespokeSection.tsx`; Canopy House selects it. Its four layer assets, order, offsets, scale, timing, pinning, desktop calibration, and mobile behavior are hardcoded in `ExplodedIsometricView.tsx` and locked.

The Admin may preserve the existing module identifier. Creating new isometric compositions, uploading/reordering their layers, or editing their choreography is deferred and is not part of this contract.

## Frontend-owned; not CMS-editable

- Routes and URL composition; public active/archive filtering.
- Template section order, arbitrary section creation, renderer selection beyond the four identifiers, and unapproved bespoke modules.
- GSAP/ScrollTrigger timing, triggers, ends, pinning, scrub/reverse, holds, refresh/readiness, ScrollSmoother, and breakpoints.
- Horizontal interactions and geometry, overlaps, widths, reveal directions, `endHold`, and `scrollMultiplier` as design controls.
- Homepage Hero; Frame 3 wipe choreography; Spotlight strips, dwell, plaque, pin, and footer handoff.
- Gallery/lightbox behavior; ProjectNavigation derivation/layout; `/projects` WebGL and infinite-feed behavior.
- Footer layout, link behavior, routes, fixed black/white colors, and arbitrary footer colors.
- Sanjay sequence renderer/manual frame count and exploded-isometric assets/choreography.
- Generic UI labels and controls, including nav/footer labels, Gallery controls, ProjectNavigation relations, and form field labels.
- Horizontal-story Gallery CTA fields; no such field exists in the locked contract.

Any field beyond the exact declarations above requires a coordinated frontend contract change before the Admin emits it.
