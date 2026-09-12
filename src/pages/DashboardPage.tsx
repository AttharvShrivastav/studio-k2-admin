import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getHealth } from "@/lib/api";

const plannedModules = [
  { number: "01", title: "Projects", detail: "Project entries and case studies" },
  { number: "02", title: "Homepage", detail: "Curated landing-page content" },
  { number: "03", title: "Site Settings", detail: "Shared website information" },
  { number: "04", title: "Enquiries", detail: "Incoming contact submissions" },
];

export function DashboardPage() {
  const { data: session } = authClient.useSession();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const firstName = session?.user.name?.split(" ")[0] || "there";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Good to see you, {firstName}.</h1>
          <p>The Studio K2 administration foundation is ready.</p>
        </div>
        <div className="system-status" aria-live="polite">
          <span className={`status-dot ${health.isSuccess ? "is-online" : ""}`} />
          <span>{health.isSuccess ? "Systems operational" : health.isError ? "API unavailable" : "Checking systems"}</span>
        </div>
      </header>

      <section className="foundation-note">
        <div className="foundation-index">00</div>
        <div>
          <p className="eyebrow">Foundation complete</p>
          <h2>Your content workspace is ready for its first module.</h2>
          <p>
            Authentication, database connectivity, and the application shell are in place.
            Content tools will be introduced one at a time as their schemas are approved.
          </p>
        </div>
      </section>

      <section className="module-section" aria-labelledby="module-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Planned workspace</p>
            <h2 id="module-heading">Content areas</h2>
          </div>
          <span>Not yet enabled</span>
        </div>
        <div className="module-grid">
          {plannedModules.map((module) => (
            <article className="module-row" key={module.number}>
              <span>{module.number}</span>
              <div>
                <h3>{module.title}</h3>
                <p>{module.detail}</p>
              </div>
              <span className="module-mark" aria-hidden="true">—</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
