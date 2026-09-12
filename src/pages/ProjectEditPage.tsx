import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CreateProjectInput } from "@shared/schemas/project";
import { PageError, PageLoading } from "@/components/PageState";
import { ProjectForm } from "@/components/ProjectForm";
import {
  ApiRequestError,
  archiveProject,
  getProject,
  updateProject,
} from "@/lib/projects-api";
import { formatTemplate } from "@/lib/project-format";

const futureSections = ["Browser", "Hero", "Template Content", "Gallery", "Footer", "SEO"];

export function ProjectEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: Boolean(id),
  });
  const updateMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => updateProject(id, input),
    onSuccess: async (project) => {
      queryClient.setQueryData(["project", id], project);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveProject(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/projects", { replace: true });
    },
  });

  async function handleUpdate(input: CreateProjectInput) {
    await updateMutation.mutateAsync(input).catch(() => undefined);
  }

  function handleArchive() {
    const title = projectQuery.data?.title ?? "this project";
    if (window.confirm(`Archive “${title}”? It can be restored from Archive.`)) {
      archiveMutation.mutate();
    }
  }

  const updateError = updateMutation.error;
  const errorMessage =
    updateError instanceof ApiRequestError && updateError.code === "SLUG_CONFLICT"
      ? "That slug is already used by another project."
      : updateError
        ? "Changes could not be saved. Please try again."
        : null;

  if (projectQuery.isPending) return <main className="content-page"><PageLoading label="Loading project" /></main>;
  if (projectQuery.isError) return <main className="content-page"><PageError message="This project could not be loaded." /></main>;

  const project = projectQuery.data;

  return (
    <main className="content-page form-page">
      <header className="project-edit-header">
        <div>
          <Link className="back-link" to="/projects">← Project index</Link>
          <p className="eyebrow">Project / General</p>
          <h1>{project.title}</h1>
          <div className="project-meta-line">
            <span>{formatTemplate(project.templateType)}</span>
            <span className={`status-label ${project.status === "active" ? "is-active" : ""}`}>
              {project.status}
            </span>
          </div>
        </div>
        {project.status === "active" && (
          <button
            className="text-danger-button"
            type="button"
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
          >
            {archiveMutation.isPending ? "Archiving…" : "Archive project"}
          </button>
        )}
      </header>

      <nav className="project-section-nav" aria-label="Project editor sections">
        <span className="is-current">General</span>
        {futureSections.map((section) => <span key={section}>{section}<small>Soon</small></span>)}
      </nav>

      {archiveMutation.isError && <PageError message="The project could not be archived." />}

      <ProjectForm
        initialProject={project}
        submitLabel="Save general details"
        isSaving={updateMutation.isPending}
        serverError={errorMessage}
        onSubmit={handleUpdate}
      />
    </main>
  );
}
