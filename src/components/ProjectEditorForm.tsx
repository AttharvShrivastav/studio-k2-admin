import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm, useFormContext, useWatch, type Path } from "react-hook-form";
import { createTemplateConfig, createTemplateFourFrames } from "@shared/lib/project-editor-defaults";
import { bespokeModules, browserFocalPositions, narrativeDepths, projectEditorInputSchema, type HorizontalFrame, type ProjectEditorInput } from "@shared/schemas/project-editor";
import { projectCategories, templateTypes, type TemplateType } from "@shared/schemas/project";
import type { ProjectEditorData } from "@shared/types/project-editor";
import { uploadImages, uploadSequence } from "@/lib/projects-api";
import { formatCategory, formatTemplate } from "@/lib/project-format";

type FieldPath = Path<ProjectEditorInput>;
const path = (value: string) => value as FieldPath;
const editorSections = ["General", "Browser", "Hero", "Theme", "Template Content", "Gallery", "Footer", "SEO"] as const;

function Field({ label, name, description, type = "text", required }: { label: string; name: string; description?: string; type?: string; required?: boolean }) {
  const { register, formState: { errors } } = useFormContext<ProjectEditorInput>();
  const fieldError = useMemo(() => {
    let node: unknown = errors;
    for (const key of name.split(".")) node = node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined;
    return node && typeof node === "object" && "message" in node ? String((node as { message?: unknown }).message ?? "") : "";
  }, [errors, name]);
  return <div className="field-group"><label>{label}{required ? " *" : ""}</label><input type={type} aria-invalid={Boolean(fieldError)} {...register(path(name), type === "number" ? { valueAsNumber: true } : undefined)} />{description && <p className="field-hint">{description}</p>}{fieldError && <p className="field-error">{fieldError}</p>}</div>;
}

function TextArea({ label, name, description }: { label: string; name: string; description?: string }) {
  const { register } = useFormContext<ProjectEditorInput>();
  return <div className="field-group"><label>{label}</label><textarea rows={3} {...register(path(name))} />{description && <p className="field-hint">{description}</p>}</div>;
}

function LineEditor({ label, name, fixedCount, max = 8, lastLineHint }: { label: string; name: string; fixedCount?: number; max?: number; lastLineHint?: string }) {
  const { control } = useFormContext<ProjectEditorInput>();
  return <Controller control={control} name={path(name)} render={({ field }) => {
    const current = Array.isArray(field.value) ? field.value.map((value) => String(value ?? "")) : [];
    const lines = fixedCount ? Array.from({ length: fixedCount }, (_, index) => current[index] ?? "") : current;
    const update = (next: string[]) => field.onChange(fixedCount ? next.slice(0, fixedCount) : next.slice(0, max));
    const move = (index: number, offset: number) => { const target = index + offset; if (target < 0 || target >= lines.length) return; const next = [...lines]; [next[index], next[target]] = [next[target], next[index]]; update(next); };
    return <fieldset className="line-editor"><legend>{label}</legend><div className="line-editor-list">{lines.map((value, index) => <div className="line-editor-row" key={index}><label htmlFor={`${name}-${index}`}>Line {index + 1}</label><input id={`${name}-${index}`} value={value} onBlur={field.onBlur} onChange={(event) => { const next = [...lines]; next[index] = event.target.value; update(next); }} />{!fixedCount && <div className="line-editor-actions"><button type="button" aria-label={`Move line ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" aria-label={`Move line ${index + 1} down`} disabled={index === lines.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" onClick={() => update(lines.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>}</div>)}</div>{lastLineHint && <p className="field-hint line-hint">{lastLineHint}</p>}{!fixedCount && lines.length < max && <button className="line-add-button" type="button" onClick={() => update([...lines, ""])}>+ Add line</button>}</fieldset>;
  }} />;
}

function AnimatedHeadingComposer({ paths, title = "Animated heading" }: { paths: { line1: string; line2First: string; line2Second: string; line3: string; line4First: string; line4Second: string }; title?: string }) {
  return <fieldset className="heading-composer"><legend>{title}</legend><Field label="Line 1" name={paths.line1} /><div className="phrase-row"><Field label="Line 2 — First phrase" name={paths.line2First} /><Field label="Line 2 — Second phrase" name={paths.line2Second} /></div><p className="field-hint phrase-hint">Both phrases appear together on the same animated line.</p><Field label="Line 3" name={paths.line3} /><div className="phrase-row"><Field label="Line 4 — First phrase" name={paths.line4First} /><Field label="Line 4 — Second phrase" name={paths.line4Second} /></div><p className="field-hint phrase-hint">Both phrases appear together on the same animated line.</p></fieldset>;
}

function Scene({ number, title, hint, children }: { number: number; title: string; hint?: string; children: React.ReactNode }) {
  return <section className="frame-group"><header className="frame-heading"><div><p className="eyebrow">Scene {number}</p><h4>{title}</h4></div>{hint && <span>{hint}</span>}</header>{children}</section>;
}

function SectionToggle({ label, name, description, children }: { label: string; name: string; description?: string; children: React.ReactNode }) {
  const { register } = useFormContext<ProjectEditorInput>();
  const enabled = useWatch<ProjectEditorInput>({ name: path(name) }) as boolean;
  const sectionId = `template-section-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <section id={sectionId} className={`editor-subsection ${enabled ? "is-enabled" : "is-disabled"}`}><header><div><p className="eyebrow">Template section</p><h3>{label}</h3>{description && <p>{description}</p>}</div><label className="toggle"><input type="checkbox" {...register(path(name))} /><span>Section enabled</span></label></header>{!enabled && <p className="preserved-note">Content is preserved while this section is hidden.</p>}<div className="editor-subsection-content" hidden={!enabled}>{children}</div></section>;
}

function MediaField({ label, base, optional = false, fallbackText }: { label: string; base: string; optional?: boolean; fallbackText?: string }) {
  const { setValue } = useFormContext<ProjectEditorInput>();
  const media = useWatch<ProjectEditorInput>({ name: path(base) }) as { src?: string; alt?: string; focalPosition?: string } | undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function choose(files: FileList | null) {
    if (!files?.[0]) return;
    setBusy(true); setError("");
    try { const [saved] = await uploadImages([files[0]]); setValue(path(`${base}.src`), saved.url as never, { shouldDirty: true, shouldValidate: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  function remove() { setValue(path(base), optional ? undefined as never : { src: "", alt: "", focalPosition: "center" } as never, { shouldDirty: true, shouldValidate: true }); }
  return <div className="media-field"><div className="media-preview">{media?.src ? <img src={media.src} alt={media.alt ?? ""} /> : <span>{optional ? "Optional image" : "No image uploaded"}</span>}</div><div className="media-fields"><div className="media-heading"><strong>{label}</strong><div><label className="upload-button">{busy ? "Uploading…" : media?.src ? "Replace image" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void choose(event.target.files)} /></label>{media?.src && <button type="button" className="quiet-button" onClick={remove}>Remove</button>}</div></div>{fallbackText && <p className="field-hint">{fallbackText}</p>}<Field label="Image URL" name={`${base}.src`} /><Field label="Alt text" name={`${base}.alt`} /><FocalPositionControl name={`${base}.focalPosition`} />{error && <p className="field-error">{error}</p>}</div></div>;
}

function ImageUrlField({ label, name, altName }: { label: string; name: string; altName?: string }) {
  const { setValue } = useFormContext<ProjectEditorInput>();
  const value = String(useWatch<ProjectEditorInput>({ name: path(name) }) ?? "");
  const [busy, setBusy] = useState(false);
  async function choose(files: FileList | null) { if (!files?.[0]) return; setBusy(true); try { const [saved] = await uploadImages([files[0]]); setValue(path(name), saved.url as never, { shouldDirty: true, shouldValidate: true }); } finally { setBusy(false); } }
  return <div className="media-field"><div className="media-preview">{value ? <img src={value} alt="" /> : <span>No image uploaded</span>}</div><div className="media-fields"><div className="media-heading"><strong>{label}</strong><div><label className="upload-button">{busy ? "Uploading…" : value ? "Replace image" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void choose(event.target.files)} /></label>{value && <button type="button" className="quiet-button" onClick={() => setValue(path(name), "" as never, { shouldDirty: true })}>Remove</button>}</div></div><Field label="Image URL" name={name} />{altName && <Field label="Alt text" name={altName} />}</div></div>;
}

function FocalPositionControl({ name, label = "Focal position", optional = true }: { name: string; label?: string; optional?: boolean }) {
  const { register } = useFormContext<ProjectEditorInput>();
  const current = String(useWatch<ProjectEditorInput>({ name: path(name) }) ?? "");
  const custom = current && !browserFocalPositions.includes(current as (typeof browserFocalPositions)[number]);
  return <div className="field-group"><label>{label}</label><select {...register(path(name))}>{optional && <option value="">Use default</option>}{custom && <option value={current}>{current}</option>}{browserFocalPositions.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div>;
}

function FocalSelect({ label, name }: { label: string; name: string }) {
  return <FocalPositionControl label={label} name={name} />;
}

function TemplateFourHorizontalStory({ base }: { base: string }) {
  const { setValue } = useFormContext<ProjectEditorInput>();
  const frames = (useWatch<ProjectEditorInput>({ name: path(`${base}.content.frames`) }) ?? []) as HorizontalFrame[];
  if (!frames.length) {
    return <div className="editor-note"><p>This project has no horizontal frames yet. Initialize the locked Template 4 sequence to edit its CMS-owned content.</p><button className="quiet-button" type="button" onClick={() => setValue(path(`${base}.content.frames`), createTemplateFourFrames() as never, { shouldDirty: true, shouldValidate: true })}>Initialize locked frames</button></div>;
  }
  return <div className="horizontal-frame-list">{frames.map((frame, index) => {
    const frameBase = `${base}.content.frames.${index}`;
    const headingPaths = { line1: `${frameBase}.headingLine1`, line2First: `${frameBase}.headingLine2A`, line2Second: `${frameBase}.headingLine2B`, line3: `${frameBase}.headingLine3`, line4First: `${frameBase}.headingLine4A`, line4Second: `${frameBase}.headingLine4B` };
    if (frame.type === "editorial") return <Scene number={index + 1} title="Editorial text" hint="Position fixed by the design" key={frame.id ?? `${frame.type}-${index}`}><LineEditor label="Opening heading" name={`${frameBase}.headingLines`} /><TextArea label="Body copy" name={`${frameBase}.body`} /><AnimatedHeadingComposer paths={headingPaths} /></Scene>;
    if (frame.type === "imageScene") return <Scene number={index + 1} title="Image composition" hint="Position fixed by the design" key={frame.id ?? `${frame.type}-${index}`}><div className="media-grid"><div><ImageUrlField label="Primary image" name={`${frameBase}.primaryImage`} altName={`${frameBase}.primaryImageAlt`} /><FocalSelect label="Primary image focal position" name={`${frameBase}.primaryImageFocal`} /></div><div><ImageUrlField label="Secondary image — optional" name={`${frameBase}.secondaryImage`} altName={`${frameBase}.secondaryImageAlt`} /><FocalSelect label="Secondary image focal position" name={`${frameBase}.secondaryImageFocal`} /></div></div></Scene>;
    if (frame.type === "editorialImage") return <Scene number={index + 1} title="Editorial text and image" hint="Position fixed by the design" key={frame.id ?? `${frame.type}-${index}`}><AnimatedHeadingComposer paths={headingPaths} /><TextArea label="Body copy" name={`${frameBase}.body`} /><ImageUrlField label="Scene image" name={`${frameBase}.image`} altName={`${frameBase}.imageAlt`} /><FocalSelect label="Scene image focal position" name={`${frameBase}.imageFocal`} /></Scene>;
    return <Scene number={index + 1} title="Full image" hint="Position fixed by the design" key={frame.id ?? `${frame.type}-${index}`}><ImageUrlField label="Scene image" name={`${frameBase}.src`} altName={`${frameBase}.alt`} /><div className="compact-grid"><FocalSelect label="Image focal position" name={`${frameBase}.focalPosition`} /><Field label="Caption" name={`${frameBase}.caption`} /></div></Scene>;
  })}</div>;
}

function IntroFields({ base, fixedHeading = false }: { base: string; fixedHeading?: boolean }) { return <><LineEditor label="Heading" name={`${base}.headingLines`} fixedCount={fixedHeading ? 3 : undefined} lastLineHint={fixedHeading ? "This line has its own movement in the project animation." : undefined} /><TextArea label="Body copy" name={`${base}.bodyCopy`} /></>; }
function HorizontalTwelve({ base, additionalImages = false }: { base: string; additionalImages?: boolean }) {
  return <div className="scene-list"><Scene number={1} title="Opening editorial"><LineEditor label="Heading" name={`${base}.frame1Heading`} fixedCount={3} /><TextArea label="Body copy" name={`${base}.frame1Body`} /></Scene><Scene number={2} title="Image composition"><div className="media-grid"><MediaField label="Primary image" base={`${base}.frame2PrimaryMedia`} /><MediaField label="Secondary image" base={`${base}.frame2SecondaryMedia`} /></div></Scene><Scene number={3} title="Editorial text and image"><AnimatedHeadingComposer paths={{ line1: `${base}.frame3Heading1`, line2First: `${base}.frame3Heading2A`, line2Second: `${base}.frame3Heading2B`, line3: `${base}.frame3Heading3`, line4First: `${base}.frame3Heading4A`, line4Second: `${base}.frame3Heading4B` }} /><TextArea label="Body copy" name={`${base}.frame3Body`} /><MediaField label="Final horizontal image" base={`${base}.frame3Media`} />{additionalImages && <TrailingImagesEditor base={base} />}</Scene></div>;
}

type TrailingImage = { id: string; src: string; alt: string; focalPosition?: "left" | "center" | "right"; widthVw?: number; revealDirection?: "left-to-right" | "right-to-left" | "bottom-to-top" };

function TrailingImagesEditor({ base }: { base: string }) {
  const { setValue } = useFormContext<ProjectEditorInput>();
  const watched = useWatch<ProjectEditorInput>({ name: path(`${base}.trailingImages`) }) as TrailingImage[] | null | undefined;
  const images = watched ?? [];
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const update = (next: TrailingImage[]) => setValue(path(`${base}.trailingImages`), (next.length ? next : null) as never, { shouldDirty: true, shouldValidate: true });
  async function choose(index: number, files: FileList | null) {
    if (!files?.[0] || index > images.length) return;
    setBusy(index); setError("");
    try {
      const [saved] = await uploadImages([files[0]]);
      const next = [...images];
      next[index] = images[index] ? { ...images[index], src: saved.url } : { id: crypto.randomUUID(), src: saved.url, alt: "", focalPosition: "center" };
      update(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed"); }
    finally { setBusy(null); }
  }
  return <section className="additional-media"><header><div><p className="eyebrow">Additional horizontal images</p><h5>Optional</h5></div></header><p>The project can continue with up to four additional images after the final Scene 3 image.</p><div className="additional-media-list">{Array.from({ length: 4 }, (_, index) => {
    const image = images[index];
    const available = index <= images.length;
    return <article className="additional-media-slot" key={index}><div className="media-heading"><strong>Additional image {index + 1}</strong><div><label className={`upload-button ${available ? "" : "is-disabled"}`}>{busy === index ? "Uploading…" : image ? "Replace" : "Upload"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!available || busy !== null} onChange={(event) => void choose(index, event.target.files)} /></label>{image && <button type="button" className="quiet-button" onClick={() => update(images.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div></div>{image ? <div className="additional-media-body"><div className="media-preview"><img src={image.src} alt={image.alt} /></div><div className="media-fields"><Field label="Alt text" name={`${base}.trailingImages.${index}.alt`} /><FocalPositionControl name={`${base}.trailingImages.${index}.focalPosition`} /></div></div> : <p className="field-hint">{available ? "No image selected." : "Add the previous image first to preserve display order."}</p>}</article>;
  })}</div>{error && <p className="field-error">{error}</p>}</section>;
}
function DrawingTwelve({ base }: { base: string }) { return <><div className="compact-grid"><Field label="Area label" name={`${base}.drawingAreaLabel`} /><Field label="Title" name={`${base}.drawingTitle`} /><Field label="Accent color" name={`${base}.accentColor`} /></div><TextArea label="Description" name={`${base}.drawingDescription`} /><MediaField label="Drawing media" base={`${base}.media`} /></>; }

function Narrative({ base }: { base: string }) {
  const { register, setValue } = useFormContext<ProjectEditorInput>();
  const images = (useWatch<ProjectEditorInput>({ name: path(`${base}.images`) }) ?? []) as Array<{ id: string; src: string; alt: string; focalPosition?: string; depth: string; speed: number }>;
  async function add(files: FileList | null) { if (!files?.length) return; const uploaded = await uploadImages(Array.from(files)); const next = [...images, ...uploaded.map((file) => ({ id: crypto.randomUUID(), src: file.url, alt: "", focalPosition: "center", depth: "middle", speed: 1 }))]; setValue(path(`${base}.images`), next as never, { shouldDirty: true, shouldValidate: true }); }
  function remove(index: number) { const next = images.filter((_, itemIndex) => itemIndex !== index); setValue(path(`${base}.images`), next as never, { shouldDirty: true, shouldValidate: true }); }
  function move(index: number, offset: number) { const next = [...images]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setValue(path(`${base}.images`), next as never, { shouldDirty: true }); }
  return <><LineEditor label="Heading" name={`${base}.headingLines`} /><TextArea label="Body copy" name={`${base}.bodyCopy`} /><label className="upload-button">Upload narrative images<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void add(event.target.files)} /></label><div className="collection-list">{images.map((image, index) => <article key={image.id} className="collection-item"><img src={image.src} alt="" /><div className="collection-fields"><Field label="Alt text" name={`${base}.images.${index}.alt`} /><FocalPositionControl name={`${base}.images.${index}.focalPosition`} /><div className="compact-grid"><div className="field-group"><label>Depth</label><select {...register(path(`${base}.images.${index}.depth`))}>{narrativeDepths.map((depth) => <option key={depth}>{depth}</option>)}</select></div><Field label="Speed" name={`${base}.images.${index}.speed`} type="number" /></div></div><div className="collection-actions"><button type="button" onClick={() => move(index, -1)}>↑</button><button type="button" onClick={() => move(index, 1)}>↓</button><button type="button" onClick={() => remove(index)}>Remove</button></div></article>)}</div></>;
}

type NarrativeImage = { id: string; src: string; alt: string; focalPosition?: string; depth: "background" | "middle" | "foreground" | "rear"; speed: number };

function TemplateFourNarrative({ base }: { base: string }) {
  const { setValue } = useFormContext<ProjectEditorInput>();
  const images = (useWatch<ProjectEditorInput>({ name: path(`${base}.images`) }) ?? []) as NarrativeImage[];
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const defaults = [{ depth: "rear", speed: 0.85 }, { depth: "rear", speed: 1.05 }] as const;

  async function choose(index: number, files: FileList | null) {
    if (!files?.[0]) return;
    setBusy(index); setError("");
    try {
      const [saved] = await uploadImages([files[0]]);
      const next = [...images];
      next[index] = images[index]
        ? { ...images[index], src: saved.url }
        : { id: crypto.randomUUID(), src: saved.url, alt: "", focalPosition: "center", ...defaults[index] };
      setValue(path(`${base}.images`), next as never, { shouldDirty: true, shouldValidate: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  function remove(index: number) {
    setValue(path(`${base}.images`), images.filter((_, itemIndex) => itemIndex !== index) as never, { shouldDirty: true, shouldValidate: true });
  }

  return <>
    <LineEditor label="Heading" name={`${base}.headingLines`} />
    <TextArea label="Body copy" name={`${base}.bodyCopy`} />
    <div className="additional-media-list">{[0, 1].map((index) => {
      const image = images[index];
      const available = index <= images.length;
      return <article className="additional-media-slot" key={index}>
        <div className="media-heading"><strong>Narrative image {index + 1}</strong><div>
          <label className={`upload-button ${available ? "" : "is-disabled"}`}>{busy === index ? "Uploading…" : image ? "Replace image" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!available || busy !== null} onChange={(event) => void choose(index, event.target.files)} /></label>
          {image && <button type="button" className="quiet-button" onClick={() => remove(index)}>Remove</button>}
        </div></div>
        {image ? <div className="additional-media-body"><div className="media-preview"><img src={image.src} alt={image.alt} /></div><div className="media-fields"><Field label="Alt text" name={`${base}.images.${index}.alt`} /><FocalPositionControl name={`${base}.images.${index}.focalPosition`} /></div></div> : <p className="field-hint">{available ? "No image selected." : "Add Narrative image 1 first."}</p>}
      </article>;
    })}</div>
    {error && <p className="field-error">{error}</p>}
  </>;
}

function TemplateContent({ template }: { template: TemplateType }) {
  const base = "templateConfig.sections";
  const { register } = useFormContext<ProjectEditorInput>();
  const sectionNames = template === "template-1" ? ["Statement", "Story", "Bespoke", "Feature", "Horizontal Story", "Drawing"] : template === "template-2" ? ["Intro", "Horizontal Story", "Narrative", "Drawing"] : template === "template-3" ? ["Intro", "Bespoke / Scroll sequence", "Horizontal Story", "Drawing"] : ["Intro", "Horizontal Story", "Narrative", "Drawing"];
  const sectionNav = <nav className="template-section-nav" aria-label="Template sections">{sectionNames.map((label) => <button type="button" key={label} onClick={() => document.getElementById(`template-section-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{label}</button>)}</nav>;
  if (template === "template-1") return <>{sectionNav}<SectionToggle label="Statement" description="The opening statement presented as individual lines." name={`${base}.statement.enabled`}><LineEditor label="Statement" name={`${base}.statement.lines`} /></SectionToggle><SectionToggle label="Story" description="Project introduction, supporting copy, and paired imagery." name={`${base}.story.enabled`}><LineEditor label="Heading" name={`${base}.story.headingLines`} fixedCount={3} /><TextArea label="Body copy" name={`${base}.story.bodyCopy`} /><div className="media-grid"><MediaField label="Primary image" base={`${base}.story.primaryMedia`} /><MediaField label="Secondary image" base={`${base}.story.secondMedia`} /></div></SectionToggle><SectionToggle label="Bespoke" description="Select the established visual module used for this project." name={`${base}.bespoke.enabled`}><div className="field-group"><label>Visual module</label><select {...register(path(`${base}.bespoke.module`))}>{bespokeModules.map((module) => <option key={module}>{module}</option>)}</select><p className="field-hint">Existing isometric compositions remain controlled by the website design.</p></div></SectionToggle><SectionToggle label="Feature" description="A focused editorial moment with supporting media." name={`${base}.feature.enabled`}><LineEditor label="Heading" name={`${base}.feature.headingLines`} fixedCount={3} lastLineHint="This line has its own movement in the project animation." /><TextArea label="Body copy" name={`${base}.feature.bodyCopy`} /><MediaField label="Feature image" base={`${base}.feature.media`} /></SectionToggle><SectionToggle label="Horizontal Story" description="A three-scene sequence combining editorial copy and imagery." name={`${base}.horizontalStory.enabled`}><HorizontalTwelve base={`${base}.horizontalStory`} additionalImages /></SectionToggle><SectionToggle label="Drawing" description="Project drawing and descriptive copy. Its color follows the project theme." name={`${base}.drawing.enabled`}><LineEditor label="Heading" name={`${base}.drawing.headingLines`} /><TextArea label="Body copy" name={`${base}.drawing.bodyCopy`} /><MediaField label="Drawing image" base={`${base}.drawing.media`} /></SectionToggle></>;
  if (template === "template-2") return <>{sectionNav}<SectionToggle label="Intro" description="Opening heading and project introduction." name={`${base}.intro.enabled`}><IntroFields base={`${base}.intro`} fixedHeading /></SectionToggle><SectionToggle label="Horizontal Story" description="A three-scene sequence combining editorial copy and imagery." name={`${base}.horizontalStory.enabled`}><HorizontalTwelve base={`${base}.horizontalStory`} /></SectionToggle><SectionToggle label="Narrative" description="Editorial copy accompanied by layered project imagery." name={`${base}.narrative.enabled`}><Narrative base={`${base}.narrative`} /></SectionToggle><SectionToggle label="Drawing" description="Project drawing and its supporting description." name={`${base}.drawing.enabled`}><DrawingTwelve base={`${base}.drawing`} /></SectionToggle></>;
  if (template === "template-3") return <>
    {sectionNav}
    <SectionToggle label="Intro" description="Opening heading and project introduction." name={`${base}.intro.enabled`}><IntroFields base={`${base}.intro`} fixedHeading /></SectionToggle>
    <SequenceSection base={`${base}.bespoke`} />
    <SectionToggle label="Horizontal Story" description="Four visual scenes with editorial moments in scenes two and four." name={`${base}.horizontalStory.enabled`}>
      <p className="section-intro">Colors follow the project Theme.</p>
      <Scene number={1} title="Opening image"><ImageUrlField label="Opening image" name={`${base}.horizontalStory.frame1Image`} /></Scene>
      <Scene number={2} title="Editorial text and image"><AnimatedHeadingComposer paths={{ line1: `${base}.horizontalStory.frame2HeadingLine1`, line2First: `${base}.horizontalStory.frame2HeadingLine2A`, line2Second: `${base}.horizontalStory.frame2HeadingLine2B`, line3: `${base}.horizontalStory.frame2HeadingLine3`, line4First: `${base}.horizontalStory.frame2Heading4A`, line4Second: `${base}.horizontalStory.frame2Heading4B` }} /><TextArea label="Body copy" name={`${base}.horizontalStory.frame2Body`} /><ImageUrlField label="Scene image" name={`${base}.horizontalStory.frame2Image`} /></Scene>
      <Scene number={3} title="Interlude image"><ImageUrlField label="Scene image" name={`${base}.horizontalStory.frame3Image`} /></Scene>
      <Scene number={4} title="Editorial text and image"><AnimatedHeadingComposer paths={{ line1: `${base}.horizontalStory.frame4Heading1`, line2First: `${base}.horizontalStory.frame4Heading2A`, line2Second: `${base}.horizontalStory.frame4Heading2B`, line3: `${base}.horizontalStory.frame4Heading3`, line4First: `${base}.horizontalStory.frame4Heading4A`, line4Second: `${base}.horizontalStory.frame4Heading4B` }} /><TextArea label="Body copy" name={`${base}.horizontalStory.frame4Body`} /><ImageUrlField label="Scene image" name={`${base}.horizontalStory.frame4Image`} /></Scene>
    </SectionToggle>
    <SectionToggle label="Drawing" description="Project drawing and its supporting editorial copy. Its color follows the project Theme." name={`${base}.drawing.enabled`}><LineEditor label="Heading" name={`${base}.drawing.headingLines`} fixedCount={3} /><TextArea label="Body copy" name={`${base}.drawing.bodyCopy`} /><ImageUrlField label="Drawing image" name={`${base}.drawing.drawing`} altName={`${base}.drawing.drawingAlt`} /></SectionToggle>
  </>;
  return <>{sectionNav}<SectionToggle label="Intro" description="Opening heading and project introduction." name={`${base}.intro.enabled`}><IntroFields base={`${base}.intro`} /></SectionToggle><SectionToggle label="Horizontal Story" description="A fixed sequence of editorial and image scenes." name={`${base}.horizontalStory.enabled`}><p className="section-intro">Scene order and presentation are set by the website design. Edit only the content and media below.</p><TemplateFourHorizontalStory base={`${base}.horizontalStory`} /></SectionToggle><SectionToggle label="Narrative" description="Editorial copy accompanied by layered imagery." name={`${base}.narrative.enabled`}><TemplateFourNarrative base={`${base}.narrative`} /><MediaField label="Takeover image — optional" base={`${base}.narrative.takeoverImage`} optional /></SectionToggle><SectionToggle label="Drawing" description="Project drawing and its supporting description." name={`${base}.drawing.enabled`}><DrawingTwelve base={`${base}.drawing`} /></SectionToggle></>;
}

function SequenceSection({ base }: { base: string }) {
  const { setValue } = useFormContext<ProjectEditorInput>();
  const frameCount = Number(useWatch<ProjectEditorInput>({ name: path(`${base}.frameCount`) }) ?? 0);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function upload(files: FileList | null) { if (!files?.length) return; setBusy(true); setMessage(""); try { const result = await uploadSequence(Array.from(files)); setValue(path(`${base}.framePath`), result.framePath as never, { shouldDirty: true }); setValue(path(`${base}.frameCount`), result.frameCount as never, { shouldDirty: true }); setMessage(`${result.frameCount} contiguous frames validated.`); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Sequence upload failed"); } finally { setBusy(false); } }
  return <SectionToggle label="Scroll Sequence" description="The established image sequence used in this project." name={`${base}.enabled`}><div className="collection-toolbar"><div><strong>Sequence frames</strong><p>Upload a complete, consecutively numbered sequence.</p></div><label className="upload-button">{busy ? "Validating frames…" : frameCount ? "Replace sequence" : "Upload sequence"}<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void upload(event.target.files)} /></label></div><div className="derived-value"><span>Derived frame count</span><strong>{frameCount}</strong></div>{message && <p className="field-hint">{message}</p>}</SectionToggle>;
}

function GalleryEditor({ showTitle = true }: { showTitle?: boolean }) {
  const { register, setValue } = useFormContext<ProjectEditorInput>();
  const images = (useWatch<ProjectEditorInput>({ name: "galleryConfig.images" }) ?? []) as Array<{ id: string; src: string; alt?: string; caption?: string; focalPosition?: string }>;
  const expanded = useWatch<ProjectEditorInput>({ name: "galleryConfig.expandedImages" }) as typeof images | undefined;
  async function add(files: FileList | null, expandedOnly = false) { if (!files?.length) return; const uploaded = await uploadImages(Array.from(files)); const additions = uploaded.map((file) => ({ id: crypto.randomUUID(), src: file.url, alt: "", caption: "", focalPosition: "center" })); if (expandedOnly) setValue("galleryConfig.expandedImages", [...(expanded ?? images), ...additions], { shouldDirty: true, shouldValidate: true }); else { const next = [...images, ...additions].slice(0, 9); setValue("galleryConfig.images", next, { shouldDirty: true, shouldValidate: true }); if (expanded) setValue("galleryConfig.expandedImages", [...expanded, ...additions], { shouldDirty: true, shouldValidate: true }); } }
  function update(next: typeof images) { setValue("galleryConfig.images", next, { shouldDirty: true, shouldValidate: true }); if (expanded) { const additions = next.filter((visible) => !expanded.some((item) => item.id === visible.id || item.src === visible.src)); setValue("galleryConfig.expandedImages", [...expanded, ...additions], { shouldDirty: true }); } }
  function move(index: number, offset: number) { const next = [...images]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; update(next); }
  function updateExpanded(next: typeof images) { setValue("galleryConfig.expandedImages", next, { shouldDirty: true, shouldValidate: true }); }
  function moveExpanded(index: number, offset: number) { if (!expanded) return; const next = [...expanded]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; updateExpanded(next); }
  return <>
    <label className="toggle"><input type="checkbox" {...register("galleryConfig.enabled")} /><span>Gallery enabled</span></label>
    {showTitle && <LineEditor label="Gallery title" name="galleryConfig.titleLines" fixedCount={2} />}
    <div className="collection-toolbar"><div><strong>Visible gallery images</strong><p>{images.length} selected · enabled galleries require 3, 6, or 9</p></div><label className="upload-button">Upload images<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void add(event.target.files)} /></label></div>
    <div className="collection-list">{images.map((image, index) => <article key={image.id} className="collection-item"><img src={image.src} alt="" /><div className="collection-fields"><Field label="Alt text" name={`galleryConfig.images.${index}.alt`} /><Field label="Caption" name={`galleryConfig.images.${index}.caption`} /><Field label="Focal position" name={`galleryConfig.images.${index}.focalPosition`} /></div><div className="collection-actions"><button type="button" onClick={() => move(index,-1)}>↑</button><button type="button" onClick={() => move(index,1)}>↓</button><button type="button" onClick={() => update(images.filter((_, item) => item !== index))}>Remove</button></div></article>)}</div>
    <div className="expanded-control"><label className="toggle"><input type="checkbox" checked={Boolean(expanded)} onChange={(event) => setValue("galleryConfig.expandedImages", event.target.checked ? [...images] : undefined, { shouldDirty: true, shouldValidate: true })} /><span>Use a larger lightbox collection</span></label>{expanded && <><p className="field-hint">Visible images are kept in this collection automatically and cannot be removed here.</p><label className="upload-button">Add lightbox-only images<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void add(event.target.files, true)} /></label><div className="collection-list">{expanded.map((image, index) => { const visible = images.some((item) => item.id === image.id || item.src === image.src); return <article key={image.id} className="collection-item"><img src={image.src} alt="" /><div className="collection-fields"><Field label="Alt text" name={`galleryConfig.expandedImages.${index}.alt`} /><Field label="Caption" name={`galleryConfig.expandedImages.${index}.caption`} /><Field label="Focal position" name={`galleryConfig.expandedImages.${index}.focalPosition`} /></div><div className="collection-actions"><button type="button" onClick={() => moveExpanded(index,-1)}>↑</button><button type="button" onClick={() => moveExpanded(index,1)}>↓</button><button type="button" disabled={visible} onClick={() => updateExpanded(expanded.filter((_, item) => item !== index))}>Remove</button></div></article>; })}</div></>}</div>
  </>;
}

export function ProjectEditorForm({ initial, onSave, saving, serverError }: { initial: ProjectEditorData; onSave: (input: ProjectEditorInput) => Promise<void>; saving: boolean; serverError?: string }) {
  const [active, setActive] = useState<(typeof editorSections)[number]>("General");
  const [saved, setSaved] = useState(false);
  const methods = useForm<ProjectEditorInput>({ resolver: zodResolver(projectEditorInputSchema), defaultValues: { general: initial.general, browserImage: initial.browserImage, hero: initial.hero, themeConfig: initial.themeConfig, templateConfig: initial.templateConfig, galleryConfig: initial.galleryConfig, footerConfig: initial.footerConfig, seoConfig: initial.seoConfig, confirmTemplateReset: false } });
  const { register, handleSubmit, reset, setValue, formState: { isDirty, errors } } = methods;
  const template = useWatch({ control: methods.control, name: "general.templateType" });
  useEffect(() => { const beforeUnload = (event: BeforeUnloadEvent) => { if (isDirty) event.preventDefault(); }; window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload); }, [isDirty]);
  async function submit(input: ProjectEditorInput) {
    setSaved(false);
    let next = input;
    if (input.templateConfig.template === "template-1" || input.templateConfig.template === "template-2") {
      next = { ...next, galleryConfig: { enabled: input.galleryConfig.enabled, images: input.galleryConfig.images, expandedImages: input.galleryConfig.expandedImages } };
    }
    if (input.templateConfig.template === "template-1") {
      const drawing = input.templateConfig.sections.drawing;
      next = { ...next, templateConfig: { ...input.templateConfig, sections: { ...input.templateConfig.sections, drawing: { enabled: drawing.enabled, headingLines: drawing.headingLines, bodyCopy: drawing.bodyCopy, media: drawing.media } } } };
    }
    if (input.templateConfig.template === "template-3") {
      const { horizontalStory, drawing } = input.templateConfig.sections;
      next = { ...next, templateConfig: { ...input.templateConfig, sections: { ...input.templateConfig.sections,
        horizontalStory: { ...horizontalStory, accentColor: input.themeConfig.horizontalBackgroundColor, textColor: input.themeConfig.horizontalTextColor },
        drawing: { ...drawing, accentColor: input.themeConfig.horizontalBackgroundColor },
      } } };
    }
    await onSave(next);
    reset({ ...next, confirmTemplateReset: false });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }
  function switchTemplate(next: TemplateType) { if (next === template) return; const needsWarning = initial.templateHasContent || methods.formState.dirtyFields.templateConfig; if (needsWarning && !window.confirm("Changing the template will reset all template-specific content. General, Browser, Hero, Theme, Gallery, Footer, and SEO will be preserved. Continue?")) return; setValue("general.templateType", next, { shouldDirty: true }); setValue("templateConfig", createTemplateConfig(next), { shouldDirty: true }); setValue("confirmTemplateReset", true, { shouldDirty: true }); }
  const firstError = Object.keys(errors)[0];
  return <FormProvider {...methods}><form className="editor-layout" onSubmit={handleSubmit(submit)} noValidate><aside className="editor-nav">{editorSections.map((section) => <button type="button" className={active === section ? "is-current" : ""} key={section} onClick={() => setActive(section)}>{section}</button>)}</aside><div className="editor-workspace"><div className="editor-savebar"><div>{isDirty ? <span className="dirty-status">Unsaved changes</span> : <span className="saved-status">{saved ? "Saved" : "All changes saved"}</span>}</div><button className="primary-button" type="submit" disabled={saving || !isDirty}>{saving ? "Saving…" : "Save project"}</button></div>{serverError && <p className="form-error" role="alert">{serverError}</p>}{firstError && <p className="form-error" role="alert">Review the {firstError === "templateConfig" ? "Template Content" : firstError} section.</p>}
  <section className="editor-panel" hidden={active !== "General"}><p className="eyebrow">General</p><h2>Project identity</h2><div className="compact-grid"><Field label="Project name" name="general.title" required /><Field label="Slug" name="general.slug" required /><div className="field-group"><label>Built / Unbuilt</label><select {...register("general.category")}>{projectCategories.map((value) => <option key={value} value={value}>{formatCategory(value)}</option>)}</select></div><div className="field-group"><label>Template</label><select value={template} onChange={(event) => switchTemplate(event.target.value as TemplateType)}>{templateTypes.map((value) => <option key={value} value={value}>{formatTemplate(value)}</option>)}</select></div><Field label="Location" name="general.location" /><Field label="Area" name="general.area" /><Field label="Year" name="general.year" /><Field label="Browser order" name="general.browserOrder" type="number" /></div></section>
  <section className="editor-panel" hidden={active !== "Browser"}><p className="eyebrow">Browser</p><h2>Project listing</h2><p className="section-intro">Independent media used by the public project browser.</p><MediaField label="Browser image" base="browserImage" /></section>
  <section className="editor-panel" hidden={active !== "Hero"}><p className="eyebrow">Hero</p><h2>Opening media</h2><label className="toggle"><input type="checkbox" {...register("hero.enabled")} /><span>Hero enabled</span></label><div className="media-grid"><MediaField label="Desktop image" base="hero.media" /><MediaField label="Mobile image — optional" base="hero.media.mobile" optional fallbackText="Optional. Uses the desktop image when empty." /></div><LineEditor label="Hero title" name="hero.title" fixedCount={2} /><div className="compact-grid"><Field label="Square footage" name="hero.squareFootage" /><Field label="Square footage label" name="hero.squareFootageLabel" /></div></section>
  <section className="editor-panel" hidden={active !== "Theme"}><p className="eyebrow">Theme</p><h2>Project colors</h2><div className="color-grid"><ColorField label="Project accent / background" name="themeConfig.horizontalBackgroundColor" /><ColorField label="Project text / foreground" name="themeConfig.horizontalTextColor" /></div></section>
  <section className="editor-panel" hidden={active !== "Template Content"}><p className="eyebrow">{formatTemplate(template)}</p><h2>Template content</h2><p className="section-intro">Section order and animation behavior remain owned by the frontend.</p><TemplateContent template={template} /></section>
  <section className="editor-panel" hidden={active !== "Gallery"}><p className="eyebrow">Gallery</p><h2>Project gallery</h2><GalleryEditor showTitle={template !== "template-1" && template !== "template-2"} /></section>
  <section className="editor-panel" hidden={active !== "Footer"}><p className="eyebrow">Footer</p><h2>Project footer style</h2><input type="hidden" {...register("footerConfig.variant")} /><div className="choice-row three-up">{(["accent","black","white"] as const).map((value) => <label className="choice-option" key={value}><input type="radio" value={value} {...register("footerConfig.theme")} /><span>{value[0].toUpperCase()+value.slice(1)}</span></label>)}</div></section>
  <section className="editor-panel" hidden={active !== "SEO"}><p className="eyebrow">SEO</p><h2>Search and sharing</h2><Field label="SEO title" name="seoConfig.title" /><TextArea label="Meta description" name="seoConfig.description" /><ImageUrlField label="Social image — optional" name="seoConfig.socialImage" /></section>
  </div></form></FormProvider>;
}

function ColorField({ label, name }: { label: string; name: string }) {
  const { setValue, watch } = useFormContext<ProjectEditorInput>();
  const value = String(watch(path(name)) ?? "");
  const picker = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return <div className="color-field"><input type="color" value={picker} onChange={(event) => setValue(path(name), event.target.value as never, { shouldDirty: true, shouldValidate: true })} /><Field label={label} name={name} /></div>;
}
