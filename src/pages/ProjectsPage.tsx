import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageError, PageLoading } from "@/components/PageState";
import { archiveProject, listProjects } from "@/lib/projects-api";
import { formatCategory, formatDate, formatTemplate } from "@/lib/project-format";

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: ["projects", "active"],
    queryFn: () => listProjects("active"),
  });
  const archiveMutation = useMutation({
    mutationFn: archiveProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", "active"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", "archived"] }),
      ]);
    },
  });

  function confirmArchive(id: string, title: string) {
    if (window.confirm(`Archive “${title}”? It can be restored from Archive.`)) {
      archiveMutation.mutate(id);
    }
  }

  return (
    <main className="content-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>Project index</h1>
          <p>Manage the work presented across the Studio K2 website.</p>
        </div>
        <Link className="primary-link" to="/projects/new">
          Add project <span aria-hidden="true">＋</span>
        </Link>
      </header>

      {archiveMutation.isError && (
        <PageError message="The project could not be archived. Please try again." />
      )}

      {projectsQuery.isPending && <PageLoading label="Loading projects" />}
      {projectsQuery.isError && <PageError message="Projects could not be loaded." />}

      {projectsQuery.isSuccess && projectsQuery.data.length === 0 && (
        <section className="empty-state">
          <span>00</span>
          <h2>No active projects yet.</h2>
          <p>Create the first project to begin shaping the Studio K2 project index.</p>
          <Link to="/projects/new">Add project</Link>
        </section>
      )}

      {projectsQuery.isSuccess && projectsQuery.data.length > 0 && (
        <div className="project-table-wrap">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Category</th>
                <th>Template</th>
                <th>Status</th>
                <th>Location</th>
                <th>Updated</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {projectsQuery.data.map((project) => (
                <tr key={project.id}>
                  <td data-label="Project">
                    <Link className="project-title-link" to={`/projects/${project.id}`}>
                      <strong>{project.title}</strong>
                      <span>/{project.slug}</span>
                    </Link>
                  </td>
                  <td data-label="Category">{formatCategory(project.category)}</td>
                  <td data-label="Template">{formatTemplate(project.templateType)}</td>
                  <td data-label="Status"><span className="status-label is-active">Active</span></td>
                  <td data-label="Location">{project.location || "—"}</td>
                  <td data-label="Updated">{formatDate(project.updatedAt)}</td>
                  <td className="table-actions">
                    <Link to={`/projects/${project.id}`}>Edit</Link>
                    <button
                      type="button"
                      onClick={() => confirmArchive(project.id, project.title)}
                      disabled={archiveMutation.isPending}
                    >
                      Archive
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
