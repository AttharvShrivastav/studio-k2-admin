import type {
  ProjectCategory,
  ProjectStatus,
  TemplateType,
} from "../schemas/project.js";

export type ProjectBasics = {
  id: string;
  title: string;
  slug: string;
  category: ProjectCategory;
  status: ProjectStatus;
  templateType: TemplateType;
  location: string | null;
  area: string | null;
  year: string | null;
  browserOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ProjectListResponse = { projects: ProjectBasics[] };
export type ProjectResponse = { project: ProjectBasics };

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
};
