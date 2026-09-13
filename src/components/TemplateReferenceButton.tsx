import type { TemplateType } from "@shared/schemas/project";

export const templateReferenceRequestEvent = "studio-k2:template-reference-request";

export function TemplateReferenceButton({ template }: { template: TemplateType }) {
  return (
    <button
      className="template-reference-button"
      type="button"
      data-template={template}
      onClick={() => window.dispatchEvent(new CustomEvent(templateReferenceRequestEvent, { detail: { template } }))}
    >
      View Template Reference ↗
    </button>
  );
}
