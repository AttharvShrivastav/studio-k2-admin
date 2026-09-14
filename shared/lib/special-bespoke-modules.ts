import type { TemplateConfig } from "../schemas/project-editor.js";

export type SpecialTemplateOneBespokeModule =
  | "exploded-isometric"
  | "tower-expansion";

const SPECIAL_MODULE_BY_SLUG: Readonly<
  Record<string, SpecialTemplateOneBespokeModule>
> = {
  "canopy-house": "exploded-isometric",
  "plot-49": "tower-expansion",
};

export const SPECIAL_BESPOKE_LABELS: Readonly<
  Record<SpecialTemplateOneBespokeModule, string>
> = {
  "exploded-isometric": "Exploded Isometric",
  "tower-expansion": "Tower Expansion",
};

function configuredSpecialModule(
  config: unknown,
): SpecialTemplateOneBespokeModule | undefined {
  if (!config || typeof config !== "object") return undefined;
  const template = config as {
    template?: unknown;
    sections?: { bespoke?: { module?: unknown } };
  };
  if (template.template !== "template-1") return undefined;
  const module = template.sections?.bespoke?.module;
  return module === "exploded-isometric" || module === "tower-expansion"
    ? module
    : undefined;
}

export function getSpecialBespokeLabel(
  module: unknown,
): string | undefined {
  return module === "exploded-isometric" || module === "tower-expansion"
    ? SPECIAL_BESPOKE_LABELS[module]
    : undefined;
}

/**
 * Special Studio K2 renderers are developer-assigned. Existing assignments win,
 * while known slugs receive their assignment when their Template 1 config is new.
 */
export function preserveSpecialBespokeModule(
  config: TemplateConfig,
  slug: string,
  previousConfig?: unknown,
): TemplateConfig {
  if (config.template !== "template-1") return config;

  const module =
    configuredSpecialModule(previousConfig) ??
    configuredSpecialModule(config) ??
    SPECIAL_MODULE_BY_SLUG[slug];

  if (!module) return config;

  return {
    ...config,
    sections: {
      ...config.sections,
      bespoke: {
        ...config.sections.bespoke,
        module,
      },
    },
  };
}
