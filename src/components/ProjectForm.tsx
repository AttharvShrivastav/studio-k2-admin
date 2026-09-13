import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  createProjectInputSchema,
  projectCategories,
  templateTypes,
  type CreateProjectInput,
} from "@shared/schemas/project";
import type { ProjectBasics } from "@shared/types/project";
import { formatCategory, formatTemplate } from "@/lib/project-format";
import { TemplateReferenceButton } from "@/components/TemplateReferenceButton";

type ProjectFormProps = {
  initialProject?: ProjectBasics;
  submitLabel: string;
  isSaving: boolean;
  serverError?: string | null;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
};

export function ProjectForm({
  initialProject,
  submitLabel,
  isSaving,
  serverError,
  onSubmit,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectInputSchema),
    defaultValues: {
      title: initialProject?.title ?? "",
      slug: initialProject?.slug ?? "",
      category: initialProject?.category ?? "built",
      templateType: initialProject?.templateType ?? "template-1",
      location: initialProject?.location ?? "",
      area: initialProject?.area ?? "",
      year: initialProject?.year ?? "",
      browserOrder: initialProject?.browserOrder ?? 0,
    },
  });
  const selectedTemplate = watch("templateType");

  return (
    <form className="project-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="form-section">
        <div className="form-section-heading">
          <span>01</span>
          <div>
            <p className="eyebrow">General</p>
            <h2>Project identity</h2>
          </div>
        </div>

        <div className="form-fields">
          <div className="field-group">
            <label htmlFor="title">Project name</label>
            <input id="title" autoFocus aria-invalid={Boolean(errors.title)} {...register("title")} />
            {errors.title && <p className="field-error">{errors.title.message}</p>}
          </div>
          <div className="field-group">
            <label htmlFor="slug">Slug</label>
            <div className="slug-input">
              <span>/projects/</span>
              <input id="slug" aria-invalid={Boolean(errors.slug)} {...register("slug")} />
            </div>
            {errors.slug && <p className="field-error">{errors.slug.message}</p>}
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-heading">
          <span>02</span>
          <div>
            <p className="eyebrow">Structure</p>
            <h2>Type and template</h2>
          </div>
        </div>

        <div className="form-fields">
          <fieldset className="choice-fieldset">
            <legend>Type</legend>
            <div className="choice-row two-up">
              {projectCategories.map((category) => (
                <label className="choice-option" key={category}>
                  <input type="radio" value={category} {...register("category")} />
                  <span>{formatCategory(category)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-fieldset">
            <legend>Template</legend>
            <div className="choice-fieldset-reference"><TemplateReferenceButton template={selectedTemplate} /></div>
            <div className="choice-row four-up">
              {templateTypes.map((template) => (
                <label className="choice-option" key={template}>
                  <input type="radio" value={template} {...register("templateType")} />
                  <span>{formatTemplate(template)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="form-section form-section-last">
        <div className="form-section-heading">
          <span>03</span>
          <div>
            <p className="eyebrow">Listing details</p>
            <h2>Project information</h2>
          </div>
        </div>

        <div className="form-fields compact-grid">
          <div className="field-group">
            <label htmlFor="location">Location</label>
            <input id="location" {...register("location")} />
          </div>
          <div className="field-group">
            <label htmlFor="area">Area</label>
            <input id="area" {...register("area")} />
          </div>
          <div className="field-group">
            <label htmlFor="year">Year</label>
            <input id="year" placeholder="e.g. 2024–2026" {...register("year")} />
            {errors.year && <p className="field-error">{errors.year.message}</p>}
          </div>
          <div className="field-group">
            <label htmlFor="browserOrder">Browser order</label>
            <input
              id="browserOrder"
              type="number"
              min="0"
              step="1"
              aria-invalid={Boolean(errors.browserOrder)}
              {...register("browserOrder", { valueAsNumber: true })}
            />
            {errors.browserOrder && <p className="field-error">{errors.browserOrder.message}</p>}
          </div>
        </div>
      </section>

      <div className="form-actions">
        {serverError && <p className="form-error" role="alert">{serverError}</p>}
        <button className="primary-button form-submit" type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : submitLabel}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}
