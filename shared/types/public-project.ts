import type {
  BrowserImageConfig,
  FooterConfig,
  GalleryConfig,
  HeroConfig,
  SeoConfig,
  TemplateConfig,
  ThemeConfig,
} from "../schemas/project-editor.js";
import type { ProjectCategory, TemplateType } from "../schemas/project.js";

export type PublicProject = {
  id: string;
  title: string;
  slug: string;
  category: ProjectCategory;
  templateType: TemplateType;
  location: string | null;
  area: string | null;
  year: string | null;
  browserOrder: number;
  browserImage: BrowserImageConfig;
  hero: HeroConfig;
  themeConfig: ThemeConfig;
  templateConfig: TemplateConfig;
  galleryConfig: GalleryConfig;
  footerConfig: FooterConfig;
  seoConfig: SeoConfig;
  updatedAt: string;
};

export type PublicProjectListResponse = { projects: PublicProject[] };
export type PublicProjectResponse = { project: PublicProject };
