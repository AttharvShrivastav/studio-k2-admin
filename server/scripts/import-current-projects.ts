import { projectEditorInputSchema, type ProjectEditorInput } from "../../shared/schemas/project-editor.js";
import { createFooterConfig, createSeoConfig } from "../../shared/lib/project-editor-defaults.js";
import { closeDatabaseConnection, db } from "../db/index.js";
import { projects } from "../db/schema.js";

const approvedSlugs = ["canopy-house", "sanjay-agrawal-gg", "sanjay-agrawal"] as const;

type FrontendRegistryEntry = {
  lifecycle: "active" | "archived";
  templateType: "template-1" | "template-2" | "template-3" | "template-4";
  browser: {
    title: string;
    slug: string;
    category: "built" | "unbuilt";
    image: unknown;
    location?: string;
    area?: string;
    year?: string;
    order: number;
  };
  projectConfig: {
    template: string;
    theme?: unknown;
    footer?: unknown;
    seo?: unknown;
    sections: Record<string, unknown>;
  };
};

function mediaSource(value: unknown): unknown {
  if (typeof value === "string" || value === undefined) return value;
  if (value && typeof value === "object" && "src" in value) return (value as { src: unknown }).src;
  return value;
}

function templateContent(entry: FrontendRegistryEntry) {
  const sections = Object.fromEntries(
    Object.entries(entry.projectConfig.sections).filter(([key]) => !["hero", "gallery", "navigation"].includes(key)),
  );
  if (entry.templateType !== "template-3") return { template: entry.templateType, sections };

  const horizontal = sections.horizontalStory as Record<string, unknown>;
  return {
    template: "template-3" as const,
    sections: {
      ...sections,
      horizontalStory: {
        ...horizontal,
        frame1Image: mediaSource(horizontal.frame1Image),
        frame2Image: mediaSource(horizontal.frame2Image),
        frame3Image: mediaSource(horizontal.frame3Image),
        frame4Image: mediaSource(horizontal.frame4Image),
      },
    },
  };
}

function toEditorInput(entry: FrontendRegistryEntry): ProjectEditorInput {
  const candidate = {
    general: {
      title: entry.browser.title,
      slug: entry.browser.slug,
      category: entry.browser.category,
      templateType: entry.templateType,
      location: entry.browser.location ?? null,
      area: entry.browser.area ?? null,
      year: entry.browser.year ?? null,
      browserOrder: entry.browser.order,
    },
    browserImage: entry.browser.image,
    hero: entry.projectConfig.sections.hero,
    themeConfig: entry.projectConfig.theme,
    templateConfig: templateContent(entry),
    galleryConfig: entry.projectConfig.sections.gallery,
    footerConfig: entry.projectConfig.footer ?? createFooterConfig(),
    seoConfig: entry.projectConfig.seo ?? createSeoConfig(),
  };
  const parsed = projectEditorInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`${entry.browser.slug} does not satisfy the CMS project schema:\n${details}`);
  }
  return parsed.data;
}

async function main() {
  const frontendDataUrl = new URL("../../../frontend/src/data/projectsData.ts", import.meta.url);
  const frontend = await import(frontendDataUrl.href) as { STUDIO_PROJECT_REGISTRY: FrontendRegistryEntry[] };
  const entries = approvedSlugs.map((slug) => {
    const entry = frontend.STUDIO_PROJECT_REGISTRY.find((candidate) => candidate.lifecycle === "active" && candidate.browser.slug === slug);
    if (!entry) throw new Error(`Approved active frontend project is missing: ${slug}`);
    return entry;
  });
  const inputs = entries.map(toEditorInput);

  if (process.argv.includes("--dry-run")) {
    console.log(`Validated ${inputs.length} approved projects: ${inputs.map((input) => input.general.slug).join(", ")}`);
    return;
  }

  const results = await db.transaction(async (tx) => {
    const imported: string[] = [];
    const skipped: string[] = [];
    for (const input of inputs) {
      const [created] = await tx.insert(projects).values({
        title: input.general.title,
        slug: input.general.slug,
        category: input.general.category,
        status: "active",
        templateType: input.general.templateType,
        location: input.general.location ?? null,
        area: input.general.area ?? null,
        year: input.general.year ?? null,
        browserOrder: input.general.browserOrder,
        browserImage: input.browserImage,
        hero: input.hero,
        themeConfig: input.themeConfig,
        templateConfig: input.templateConfig,
        galleryConfig: input.galleryConfig,
        footerConfig: input.footerConfig,
        seoConfig: input.seoConfig,
      }).onConflictDoNothing({ target: projects.slug }).returning({ slug: projects.slug });
      if (created) imported.push(created.slug);
      else skipped.push(input.general.slug);
    }
    return { imported, skipped };
  });

  console.log(`Imported: ${results.imported.length ? results.imported.join(", ") : "none"}`);
  console.log(`Skipped existing: ${results.skipped.length ? results.skipped.join(", ") : "none"}`);
}

try {
  await main();
} finally {
  await closeDatabaseConnection();
}
