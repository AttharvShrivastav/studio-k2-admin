import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import type { CreateProjectInput } from "@shared/schemas/project";
import { ProjectForm } from "@/components/ProjectForm";
import { ApiRequestError, createProject } from "@/lib/projects-api";

export function NewProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "active"] });
      navigate(`/projects/${project.id}`, { replace: true });
    },
  });

  async function handleCreate(input: CreateProjectInput) {
    await mutation.mutateAsync(input).catch(() => undefined);
  }

  const error = mutation.error;
  const errorMessage =
    error instanceof ApiRequestError && error.code === "SLUG_CONFLICT"
      ? "That slug is already used by another project."
      : error
        ? "The project could not be created. Please try again."
        : null;

  return (
    <main className="content-page form-page">
      <header className="page-header form-page-header">
        <div>
          <Link className="back-link" to="/projects">← Project index</Link>
          <p className="eyebrow">Add project</p>
          <h1>New project</h1>
          <p>Set the project identity and choose its content structure.</p>
        </div>
      </header>
      <ProjectForm
        submitLabel="Create project"
        isSaving={mutation.isPending}
        serverError={errorMessage}
        onSubmit={handleCreate}
      />
    </main>
  );
}
