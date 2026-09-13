import { useState } from "react";
import type { TemplateType } from "@shared/schemas/project";
import { createTemplateReference } from "@/lib/contact-api";

export function TemplateReferenceButton({ template }: { template: TemplateType }) {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState(false);

  async function handleOpen() {
    setIsOpening(true);
    setError(false);
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = await createTemplateReference(template);
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      tab?.close();
      setError(true);
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <span className="template-reference-action">
      <button className="template-reference-button" type="button" data-template={template} onClick={handleOpen} disabled={isOpening}>
        {isOpening ? "Opening reference…" : "View Template Reference ↗"}
      </button>
      {error && <span className="field-error" role="alert">Reference could not be opened.</span>}
    </span>
  );
}
