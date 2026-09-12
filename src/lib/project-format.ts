import type { ProjectCategory, TemplateType } from "@shared/schemas/project";

export function formatCategory(category: ProjectCategory) {
  return category === "built" ? "Built" : "Unbuilt";
}

export function formatTemplate(template: TemplateType) {
  return template.replace("template-", "Template ");
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
