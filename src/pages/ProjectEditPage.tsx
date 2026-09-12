import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ProjectEditorInput } from "@shared/schemas/project-editor";
import { PageError, PageLoading } from "@/components/PageState";
import { ProjectEditorForm } from "@/components/ProjectEditorForm";
import { ApiRequestError, archiveProject, getProjectEditor, saveProjectEditor } from "@/lib/projects-api";
import { formatTemplate } from "@/lib/project-format";

export function ProjectEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["project-editor", id], queryFn: () => getProjectEditor(id), enabled: Boolean(id) });
  const save = useMutation({ mutationFn: (input: ProjectEditorInput) => saveProjectEditor(id, input), onSuccess: async (editor) => { queryClient.setQueryData(["project-editor", id], editor); await queryClient.invalidateQueries({ queryKey: ["projects"] }); } });
  const archive = useMutation({ mutationFn: () => archiveProject(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["projects"] }); navigate("/projects", { replace: true }); } });
  if (query.isPending) return <main className="content-page"><PageLoading label="Loading project editor" /></main>;
  if (query.isError) return <main className="content-page"><PageError message={query.error instanceof ApiRequestError ? query.error.message : "This project could not be loaded."} /></main>;
  const editor = query.data;
  const saveError = save.error instanceof ApiRequestError ? save.error.message : save.error ? "Changes could not be saved." : undefined;
  return <main className="content-page editor-page"><header className="project-edit-header"><div><Link className="back-link" to="/projects">← Project index</Link><p className="eyebrow">Project editor</p><h1>{editor.project.title}</h1><div className="project-meta-line"><span>{formatTemplate(editor.project.templateType)}</span><span className={`status-label ${editor.project.status === "active" ? "is-active" : ""}`}>{editor.project.status}</span></div></div>{editor.project.status === "active" && <button className="text-danger-button" type="button" onClick={() => { if (window.confirm(`Archive “${editor.project.title}”? It can be restored from Archive.`)) archive.mutate(); }} disabled={archive.isPending}>{archive.isPending ? "Archiving…" : "Archive project"}</button>}</header>{archive.isError && <PageError message="The project could not be archived." />}<ProjectEditorForm key={editor.project.updatedAt} initial={editor} saving={save.isPending} serverError={saveError} onSave={async (input) => { await save.mutateAsync(input); }} /></main>;
}
