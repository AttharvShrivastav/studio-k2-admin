import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useFormContext, useWatch, type Path } from "react-hook-form";
import {
  homepageConfigSchema,
  spotlightFocalPositions,
  type HomepageConfig,
} from "@shared/schemas/homepage";
import type { ProjectBasics } from "@shared/types/project";
import { PageError, PageLoading } from "@/components/PageState";
import { getHomepageSpotlight, saveHomepageSpotlight } from "@/lib/homepage-api";
import { formatCategory } from "@/lib/project-format";
import { listProjects, uploadImages } from "@/lib/projects-api";

type SlotIndex = 0 | 1 | 2 | 3;

function fieldError(errors: unknown, path: string) {
  let current = errors;
  for (const part of path.split(".")) {
    current = current && typeof current === "object"
      ? (current as Record<string, unknown>)[part]
      : undefined;
  }
  return current && typeof current === "object" && "message" in current
    ? String((current as { message?: unknown }).message ?? "")
    : "";
}

function HomepageMediaField({ base, mobile = false, showFocal = false }: { base: string; mobile?: boolean; showFocal?: boolean }) {
  const { control, register, setValue, formState: { errors } } = useFormContext<HomepageConfig>();
  const media = useWatch({ control, name: base as Path<HomepageConfig> }) as { src?: string; alt?: string; focalPosition?: "left" | "center" | "right"; mobile?: unknown } | undefined;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const srcError = fieldError(errors, `${base}.src`);

  async function upload(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    setUploadError("");
    try {
      const [file] = await uploadImages([files[0]]);
      setValue(base as Path<HomepageConfig>, {
        ...media,
        src: file.url,
        alt: media?.alt ?? "",
        ...(showFocal ? { focalPosition: media?.focalPosition ?? "center" } : {}),
      } as never, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="spotlight-media-field">
      <div className="spotlight-media-preview">
        {media?.src ? <img src={media.src} alt={media.alt ?? ""} /> : <span>{mobile ? "Optional mobile image" : "No image uploaded"}</span>}
      </div>
      <div className="spotlight-media-controls">
        <div className="spotlight-media-actions">
          <label className="upload-button">
            {uploading ? "Uploading…" : media?.src ? "Replace image" : "Upload image"}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void upload(event.target.files)} />
          </label>
          {mobile && media?.src && (
            <button type="button" className="quiet-button" onClick={() => setValue(base as Path<HomepageConfig>, undefined as never, { shouldDirty: true, shouldValidate: true })}>
              Remove
            </button>
          )}
        </div>
        {srcError && <p className="field-error">{srcError}</p>}
        {(!mobile || media?.src) && (
          <>
            <div className="field-group">
              <label htmlFor={`${base}-alt`}>Alt text</label>
              <input id={`${base}-alt`} {...register(`${base}.alt` as Path<HomepageConfig>)} />
            </div>
            {showFocal && <fieldset className="spotlight-focal-field">
              <legend>Focal position</legend>
              <div className="spotlight-focal-options">
                {spotlightFocalPositions.map((position) => (
                  <label key={position}>
                    <input type="radio" value={position} {...register(`${base}.focalPosition` as Path<HomepageConfig>)} />
                    <span>{position[0].toUpperCase() + position.slice(1)}</span>
                  </label>
                ))}
              </div>
            </fieldset>}
          </>
        )}
        {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
      </div>
    </div>
  );
}

function ContentCopy({ label, name }: { label: string; name: Path<HomepageConfig> }) {
  const { register, formState: { errors } } = useFormContext<HomepageConfig>();
  const error = fieldError(errors, name);
  return <div className="field-group"><label>{label}</label><textarea rows={4} aria-invalid={Boolean(error)} {...register(name)} />{error && <p className="field-error">{error}</p>}</div>;
}

type HeadingRow = {
  label: string;
  fields: Array<{ label?: string; name: Path<HomepageConfig> }>;
};

function headingLabel(label: string) {
  const match = label.match(/^(.*?)(\s\([^()]+\))$/);
  return match ? <>{match[1]}<span className="authoring-cue">{match[2]}</span></> : label;
}

function HeadingComposer({ rows }: { rows: HeadingRow[] }) {
  const { register, formState: { errors } } = useFormContext<HomepageConfig>();

  return (
    <fieldset className="homepage-heading-composer">
      <legend>Heading</legend>
      <div className="homepage-heading-rows">
        {rows.map((row) => (
          <div className="homepage-heading-row" key={row.label}>
            <p className="homepage-heading-row-label">{headingLabel(row.label)}</p>
            <div className={`homepage-heading-row-fields${row.fields.length > 1 ? " is-phrase-row" : ""}`}>
              {row.fields.map((field) => {
                const error = fieldError(errors, field.name);
                const id = `homepage-${field.name.replaceAll(".", "-")}`;
                return (
                  <div className="field-group" key={field.name}>
                    {field.label && <label htmlFor={id}>{headingLabel(field.label)}</label>}
                    <input
                      id={id}
                      aria-label={field.label ? `${row.label} — ${field.label}` : row.label}
                      aria-invalid={Boolean(error)}
                      {...register(field.name)}
                    />
                    {error && <p className="field-error">{error}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function HorizontalJourneyEditor() {
  return (
    <section className="homepage-editor-section">
      <header className="homepage-editor-heading"><p className="eyebrow">Horizontal journey</p><h2>Homepage story</h2><p>Content follows the established Homepage scene order and animation.</p></header>

      <article className="homepage-content-block">
        <div className="homepage-content-title"><span>01</span><div><p className="eyebrow">Opening statement</p><h3>Designing the space</h3></div></div>
        <div className="homepage-content-fields">
          <HeadingComposer rows={[
            { label: "Line 1", fields: [{ name: "horizontalJourney.designStatement.heading.line1" }] },
            { label: "Line 2", fields: [
              { label: "First phrase", name: "horizontalJourney.designStatement.heading.line2First" },
              { label: "Second phrase (Animated)", name: "horizontalJourney.designStatement.heading.line2Second" },
            ] },
            { label: "Line 3 (Shifts right)", fields: [{ name: "horizontalJourney.designStatement.heading.line3" }] },
            { label: "Line 4 (Shifts right)", fields: [{ name: "horizontalJourney.designStatement.heading.line4" }] },
            { label: "Line 5 (Shifts right)", fields: [{ name: "horizontalJourney.designStatement.heading.line5" }] },
          ]} />
          <ContentCopy label="Supporting copy" name="horizontalJourney.designStatement.bodyCopy" />
          <div className="homepage-media-grid">
            <div><p className="eyebrow">Landscape image</p><HomepageMediaField base="horizontalJourney.designStatement.landscapeImage" /></div>
            <div><p className="eyebrow">Interior image 1</p><HomepageMediaField base="horizontalJourney.designStatement.interiorImages.0" /></div>
            <div><p className="eyebrow">Interior image 2</p><HomepageMediaField base="horizontalJourney.designStatement.interiorImages.1" /></div>
          </div>
        </div>
      </article>

      <article className="homepage-content-block">
        <div className="homepage-content-title"><span>02</span><div><p className="eyebrow">Editorial statement</p><h3>Spaces that invite</h3></div></div>
        <div className="homepage-content-fields">
          <HeadingComposer rows={[
            { label: "Line 1", fields: [{ name: "horizontalJourney.pauseStatement.heading.line1" }] },
            { label: "Line 2", fields: [
              { label: "First phrase", name: "horizontalJourney.pauseStatement.heading.line2First" },
              { label: "Second phrase (Animated)", name: "horizontalJourney.pauseStatement.heading.line2Second" },
            ] },
            { label: "Line 3", fields: [
              { label: "First phrase", name: "horizontalJourney.pauseStatement.heading.line3First" },
              { label: "Second phrase", name: "horizontalJourney.pauseStatement.heading.line3Second" },
            ] },
            { label: "Line 4 (Shifts right)", fields: [
              { label: "First phrase (Different color)", name: "horizontalJourney.pauseStatement.heading.line4First" },
              { label: "Second phrase (Different color)", name: "horizontalJourney.pauseStatement.heading.line4Second" },
            ] },
          ]} />
          <ContentCopy label="Supporting copy" name="horizontalJourney.pauseStatement.bodyCopy" />
        </div>
      </article>

      <article className="homepage-content-block">
        <div className="homepage-content-title"><span>03</span><div><p className="eyebrow">Studio statement</p><h3>People behind the work</h3></div></div>
        <div className="homepage-content-fields">
          <HeadingComposer rows={[
            { label: "Line 1", fields: [
              { label: "First phrase", name: "horizontalJourney.studioStatement.heading.line1First" },
              { label: "Second phrase", name: "horizontalJourney.studioStatement.heading.line1Second" },
              { label: "Third phrase (Different color)", name: "horizontalJourney.studioStatement.heading.line1Third" },
            ] },
            { label: "Line 2", fields: [
              { label: "First phrase (Different color)", name: "horizontalJourney.studioStatement.heading.line2First" },
              { label: "Second phrase (Animated)", name: "horizontalJourney.studioStatement.heading.line2Second" },
            ] },
            { label: "Line 3", fields: [
              { label: "First phrase", name: "horizontalJourney.studioStatement.heading.line3First" },
              { label: "Second phrase (Animated)", name: "horizontalJourney.studioStatement.heading.line3Second" },
              { label: "Third phrase", name: "horizontalJourney.studioStatement.heading.line3Third" },
            ] },
            { label: "Line 4", fields: [
              { label: "First phrase", name: "horizontalJourney.studioStatement.heading.line4First" },
              { label: "Second phrase (Animated, Different color)", name: "horizontalJourney.studioStatement.heading.line4Second" },
            ] },
            { label: "Line 5", fields: [
              { label: "First phrase (Animated, Different color)", name: "horizontalJourney.studioStatement.heading.line5First" },
              { label: "Second phrase (Different color)", name: "horizontalJourney.studioStatement.heading.line5Second" },
              { label: "Third phrase", name: "horizontalJourney.studioStatement.heading.line5Third" },
            ] },
            { label: "Line 6", fields: [
              { label: "First phrase", name: "horizontalJourney.studioStatement.heading.line6First" },
              { label: "Second phrase", name: "horizontalJourney.studioStatement.heading.line6Second" },
            ] },
          ]} />
          <p className="field-hint">Phrases retain their established emphasis and reflow for the mobile composition.</p>
          <div className="homepage-media-grid">
            <div><p className="eyebrow">Studio image</p><HomepageMediaField base="horizontalJourney.studioStatement.mainImage" /></div>
            <div><p className="eyebrow">Founders image</p><HomepageMediaField base="horizontalJourney.studioStatement.foundersImage" /></div>
            <div><p className="eyebrow">Process image</p><HomepageMediaField base="horizontalJourney.studioStatement.processImage" /></div>
          </div>
        </div>
      </article>

      <article className="homepage-content-block">
        <div className="homepage-content-title"><span>04</span><div><p className="eyebrow">Projects introduction</p><h3>Visions that begin</h3></div></div>
        <div className="homepage-content-fields">
          <HeadingComposer rows={[
            { label: "Line 1", fields: [{ name: "horizontalJourney.projectsIntroduction.heading.line1" }] },
            { label: "Line 2", fields: [
              { label: "First phrase", name: "horizontalJourney.projectsIntroduction.heading.line2First" },
              { label: "Second phrase (Animated)", name: "horizontalJourney.projectsIntroduction.heading.line2Second" },
            ] },
            { label: "Line 3", fields: [{ name: "horizontalJourney.projectsIntroduction.heading.line3" }] },
            { label: "Line 4", fields: [
              { label: "First phrase", name: "horizontalJourney.projectsIntroduction.heading.line4First" },
              { label: "Second phrase (Shifts right)", name: "horizontalJourney.projectsIntroduction.heading.line4Second" },
            ] },
            { label: "Line 5", fields: [{ name: "horizontalJourney.projectsIntroduction.heading.line5" }] },
          ]} />
          <ContentCopy label="Supporting copy" name="horizontalJourney.projectsIntroduction.bodyCopy" />
        </div>
      </article>
    </section>
  );
}

function FrameThreeEditor() {
  return (
    <section className="homepage-editor-section">
      <header className="homepage-editor-heading"><p className="eyebrow">Frame 3</p><h2>Dual image transition</h2><p>Two images shown in the established Homepage transition.</p></header>
      <div className="frame-three-editor-grid">
        {([0, 1] as const).map((index) => (
          <article className="frame-three-image" key={index}>
            <p className="eyebrow">Image {String(index + 1).padStart(2, "0")}</p>
            <div><p className="media-label">Desktop image</p><HomepageMediaField base={`frame3.images.${index}`} showFocal /></div>
            <div><p className="media-label">Mobile image — optional</p><p className="field-hint">Uses the desktop image when empty.</p><HomepageMediaField base={`frame3.images.${index}.mobile`} mobile showFocal /></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SpotlightSlot({ index, projects }: { index: SlotIndex; projects: ProjectBasics[] }) {
  const { control, register, formState: { errors } } = useFormContext<HomepageConfig>();
  const projectId = useWatch({ control, name: `spotlight.slots.${index}.projectId` });
  const selectedProjectIsActive = projects.some((project) => project.id === projectId);
  const projectError = fieldError(errors, `spotlight.slots.${index}.projectId`);

  return (
    <section className="spotlight-slot">
      <header className="spotlight-slot-heading">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div>
          <p className="eyebrow">Spotlight {index + 1}</p>
          <h2>Featured project</h2>
        </div>
      </header>

      <div className="spotlight-slot-fields">
        <div className="field-group">
          <label htmlFor={`spotlight-${index}-project`}>Project</label>
          <select id={`spotlight-${index}-project`} aria-invalid={Boolean(projectError || (projectId && !selectedProjectIsActive))} {...register(`spotlight.slots.${index}.projectId`)}>
            <option value="">Select an active project</option>
            {projectId && !selectedProjectIsActive && <option value={projectId}>Unavailable project — choose a replacement</option>}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.title} · {formatCategory(project.category)}</option>
            ))}
          </select>
          {projectId && !selectedProjectIsActive && <p className="field-error">This project is archived or no longer available. Choose an active project.</p>}
          {projectError && <p className="field-error">{projectError}</p>}
        </div>

        <div className="spotlight-media-group">
          <div>
            <p className="eyebrow">Desktop Spotlight image</p>
            <HomepageMediaField base={`spotlight.slots.${index}.desktop`} showFocal />
          </div>
          <div>
            <p className="eyebrow">Mobile image — optional</p>
            <p className="field-hint">Uses the desktop Spotlight image when empty.</p>
            <HomepageMediaField base={`spotlight.slots.${index}.mobile`} mobile showFocal />
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageForm({ initial, projects }: { initial: HomepageConfig; projects: ProjectBasics[] }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const methods = useForm<HomepageConfig>({
    resolver: zodResolver(homepageConfigSchema),
    defaultValues: initial,
  });
  const { handleSubmit, reset, formState: { isDirty } } = methods;
  const save = useMutation({
    mutationFn: saveHomepageSpotlight,
    onSuccess: (spotlight) => {
      queryClient.setQueryData(["homepage-spotlight"], spotlight);
      reset(spotlight as HomepageConfig);
      setSaved(true);
    },
  });

  function submit(values: HomepageConfig) {
    setSaved(false);
    const normalized = {
      ...values,
      frame3: {
        images: values.frame3.images.map(({ mobile, ...image }) => mobile?.src ? { ...image, mobile } : image),
      },
      spotlight: {
        slots: values.spotlight.slots.map(({ mobile, ...slot }) => mobile?.src ? { ...slot, mobile } : slot),
      },
    } as HomepageConfig;
    save.mutate(normalized);
  }

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  return (
    <FormProvider {...methods}>
      <form className="homepage-spotlight-form" onSubmit={handleSubmit(submit)} noValidate>
        <HorizontalJourneyEditor />
        <FrameThreeEditor />
        <section className="homepage-editor-section homepage-spotlight-section">
          <header className="homepage-editor-heading"><p className="eyebrow">Project Spotlight</p><h2>Featured projects</h2><p>Four independently curated project moments, shown in this order.</p></header>
        {[0, 1, 2, 3].map((index) => <SpotlightSlot key={index} index={index as SlotIndex} projects={projects} />)}
        </section>
        <div className="homepage-save-bar">
          <span className={isDirty ? "is-dirty" : ""}>{isDirty ? "Unsaved changes" : saved ? "Changes saved" : "All changes saved"}</span>
          {save.isError && <p className="form-error" role="alert">{save.error instanceof Error ? save.error.message : "Homepage could not be saved."}</p>}
          <button className="primary-button" type="submit" disabled={save.isPending || !isDirty}>
            {save.isPending ? "Saving…" : "Save Homepage"}<span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

export function HomepagePage() {
  const spotlight = useQuery({ queryKey: ["homepage-spotlight"], queryFn: getHomepageSpotlight });
  const projects = useQuery({ queryKey: ["projects", "active"], queryFn: () => listProjects("active") });
  const pending = spotlight.isPending || projects.isPending;
  const failed = spotlight.isError || projects.isError;
  const initial = useMemo(() => spotlight.data as HomepageConfig | undefined, [spotlight.data]);

  return (
    <main className="content-page homepage-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Homepage</p>
          <h1>Homepage</h1>
          <p>Edit the authored Homepage journey, Frame 3 media, and Project Spotlight.</p>
        </div>
      </header>
      {pending && <PageLoading label="Loading Homepage" />}
      {failed && <PageError message="Homepage could not be loaded." />}
      {initial && projects.data && <HomepageForm initial={initial} projects={projects.data} />}
    </main>
  );
}
