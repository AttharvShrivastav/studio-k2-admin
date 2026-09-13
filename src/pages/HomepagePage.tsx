import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useFormContext, useWatch, type Path } from "react-hook-form";
import {
  homepageSpotlightConfigSchema,
  spotlightFocalPositions,
  type HomepageSpotlightConfig,
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

function SpotlightMediaField({ slot, mobile = false }: { slot: SlotIndex; mobile?: boolean }) {
  const { control, register, setValue, formState: { errors } } = useFormContext<HomepageSpotlightConfig>();
  const base = `slots.${slot}.${mobile ? "mobile" : "desktop"}` as const;
  const media = useWatch({ control, name: base });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const srcError = fieldError(errors, `${base}.src`);

  async function upload(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    setUploadError("");
    try {
      const [file] = await uploadImages([files[0]]);
      setValue(base, {
        src: file.url,
        alt: media?.alt ?? "",
        focalPosition: media?.focalPosition ?? "center",
      }, { shouldDirty: true, shouldValidate: true });
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
            <button type="button" className="quiet-button" onClick={() => setValue(base, undefined, { shouldDirty: true, shouldValidate: true })}>
              Remove
            </button>
          )}
        </div>
        {srcError && <p className="field-error">{srcError}</p>}
        {(!mobile || media?.src) && (
          <>
            <div className="field-group">
              <label htmlFor={`${base}-alt`}>Alt text</label>
              <input id={`${base}-alt`} {...register(`${base}.alt` as Path<HomepageSpotlightConfig>)} />
            </div>
            <fieldset className="spotlight-focal-field">
              <legend>Focal position</legend>
              <div className="spotlight-focal-options">
                {spotlightFocalPositions.map((position) => (
                  <label key={position}>
                    <input type="radio" value={position} {...register(`${base}.focalPosition` as Path<HomepageSpotlightConfig>)} />
                    <span>{position[0].toUpperCase() + position.slice(1)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
      </div>
    </div>
  );
}

function SpotlightSlot({ index, projects }: { index: SlotIndex; projects: ProjectBasics[] }) {
  const { control, register, formState: { errors } } = useFormContext<HomepageSpotlightConfig>();
  const projectId = useWatch({ control, name: `slots.${index}.projectId` });
  const selectedProjectIsActive = projects.some((project) => project.id === projectId);
  const projectError = fieldError(errors, `slots.${index}.projectId`);

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
          <select id={`spotlight-${index}-project`} aria-invalid={Boolean(projectError || (projectId && !selectedProjectIsActive))} {...register(`slots.${index}.projectId`)}>
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
            <SpotlightMediaField slot={index} />
          </div>
          <div>
            <p className="eyebrow">Mobile image — optional</p>
            <p className="field-hint">Uses the desktop Spotlight image when empty.</p>
            <SpotlightMediaField slot={index} mobile />
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageSpotlightForm({ initial, projects }: { initial: HomepageSpotlightConfig; projects: ProjectBasics[] }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const methods = useForm<HomepageSpotlightConfig>({
    resolver: zodResolver(homepageSpotlightConfigSchema),
    defaultValues: initial,
  });
  const { handleSubmit, reset, formState: { isDirty } } = methods;
  const save = useMutation({
    mutationFn: saveHomepageSpotlight,
    onSuccess: (spotlight) => {
      queryClient.setQueryData(["homepage-spotlight"], spotlight);
      reset(spotlight as HomepageSpotlightConfig);
      setSaved(true);
    },
  });

  function submit(values: HomepageSpotlightConfig) {
    setSaved(false);
    const normalized = {
      slots: values.slots.map(({ mobile, ...slot }) => mobile?.src ? { ...slot, mobile } : slot),
    } as HomepageSpotlightConfig;
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
        {[0, 1, 2, 3].map((index) => <SpotlightSlot key={index} index={index as SlotIndex} projects={projects} />)}
        <div className="homepage-save-bar">
          <span className={isDirty ? "is-dirty" : ""}>{isDirty ? "Unsaved changes" : saved ? "Changes saved" : "All changes saved"}</span>
          {save.isError && <p className="form-error" role="alert">{save.error instanceof Error ? save.error.message : "Homepage Spotlight could not be saved."}</p>}
          <button className="primary-button" type="submit" disabled={save.isPending || !isDirty}>
            {save.isPending ? "Saving…" : "Save Spotlight"}<span aria-hidden="true">↗</span>
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
  const initial = useMemo(() => spotlight.data as HomepageSpotlightConfig | undefined, [spotlight.data]);

  return (
    <main className="content-page homepage-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Homepage</p>
          <h1>Project Spotlight</h1>
          <p>Curate the four projects presented in the Homepage Spotlight.</p>
        </div>
      </header>
      {pending && <PageLoading label="Loading Homepage Spotlight" />}
      {failed && <PageError message="Homepage Spotlight could not be loaded." />}
      {initial && projects.data && <HomepageSpotlightForm initial={initial} projects={projects.data} />}
    </main>
  );
}
