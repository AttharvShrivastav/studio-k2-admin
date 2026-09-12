import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageError, PageLoading } from "@/components/PageState";
import { listProjects, restoreProject } from "@/lib/projects-api";
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
                    <button
                      className="restore-button"
                      type="button"
                      onClick={() => restoreMutation.mutate(project.id)}
                      disabled={restoreMutation.isPending}
                    >
                      Restore
                    </button>
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
