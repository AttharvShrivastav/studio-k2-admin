import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageError, PageLoading } from "@/components/PageState";
import { deleteArchivedProject, listProjects, restoreProject } from "@/lib/projects-api";
import { formatDate, formatTemplate } from "@/lib/project-format";

export function ArchivePage() {
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: ["projects", "archived"],
    queryFn: () => listProjects("archived"),
  });
  const restoreMutation = useMutation({
    mutationFn: restoreProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", "active"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", "archived"] }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteArchivedProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "archived"] });
    },
  });

  function confirmPermanentDelete(id: string, title: string) {
    const confirmation = window.prompt(
      `This permanently deletes “${title}” and cannot be undone. Uploaded files will remain on disk.\n\nType the project name exactly to continue:`,
    );
    if (confirmation === title) deleteMutation.mutate(id);
  }

  return (
    <main className="content-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Archive</p>
          <h1>Archived projects</h1>
          <p>Projects removed from the active website collection.</p>
        </div>
      </header>

      {restoreMutation.isError && <PageError message="The project could not be restored." />}
      {deleteMutation.isError && <PageError message="The archived project could not be permanently deleted." />}
      {projectsQuery.isPending && <PageLoading label="Loading archive" />}
      {projectsQuery.isError && <PageError message="The archive could not be loaded." />}

      {projectsQuery.isSuccess && projectsQuery.data.length === 0 && (
        <section className="empty-state">
          <span>00</span>
          <h2>The archive is empty.</h2>
          <p>Archived projects will remain safely available here for restoration.</p>
        </section>
      )}

      {projectsQuery.isSuccess && projectsQuery.data.length > 0 && (
        <div className="project-table-wrap archive-table">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Template</th>
                <th>Archived</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {projectsQuery.data.map((project) => (
                <tr key={project.id}>
                  <td data-label="Project">
                    <strong>{project.title}</strong>
                    <span className="table-subtitle">/{project.slug}</span>
                  </td>
                  <td data-label="Template">{formatTemplate(project.templateType)}</td>
                  <td data-label="Archived">{project.archivedAt ? formatDate(project.archivedAt) : "—"}</td>
                  <td className="table-actions">
                    <div className="archive-actions">
                      <button
                        className="restore-button"
                        type="button"
                        onClick={() => restoreMutation.mutate(project.id)}
                        disabled={restoreMutation.isPending || deleteMutation.isPending}
                      >
                        Restore
                      </button>
                      <button
                        className="text-danger-button"
                        type="button"
                        onClick={() => confirmPermanentDelete(project.id, project.title)}
                        disabled={restoreMutation.isPending || deleteMutation.isPending}
                      >
                        Delete permanently
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
