import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageError, PageLoading } from "@/components/PageState";
import { authClient } from "@/lib/auth-client";
import { listEnquiries } from "@/lib/contact-api";

function formatReceived(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DashboardPage() {
  const { data: session } = authClient.useSession();
  const enquiries = useQuery({ queryKey: ["contact-enquiries"], queryFn: listEnquiries });
  const firstName = session?.user.name?.split(" ")[0] || "there";
  const unreadCount = enquiries.data?.filter((item) => item.status === "new").length ?? 0;
  const recent = enquiries.data?.slice(0, 5) ?? [];

  return (
    <main className="dashboard-page">
      <header className="dashboard-header enquiry-dashboard-header">
        <div><p className="eyebrow">Dashboard</p><h1>Good to see you, {firstName}.</h1><p>Your latest Studio K2 enquiries are below.</p></div>
        <div className="unread-summary"><span>Unread enquiries</span><strong>{unreadCount}</strong></div>
      </header>

      <section className="dashboard-enquiries" aria-labelledby="recent-enquiries-heading">
        <div className="section-heading-row"><div><p className="eyebrow">Inbox</p><h2 id="recent-enquiries-heading">Recent enquiries</h2></div><Link to="/contact-enquiries">View all enquiries →</Link></div>
        {enquiries.isPending && <PageLoading label="Loading recent enquiries" />}
        {enquiries.isError && <PageError message="Recent enquiries could not be loaded." />}
        {enquiries.isSuccess && recent.length === 0 && <div className="dashboard-empty"><p>No enquiries yet.</p></div>}
        {recent.length > 0 && <div className="dashboard-enquiry-list">{recent.map((item) => (
          <Link className={`dashboard-enquiry${item.status === "new" ? " is-unread" : ""}`} to={`/contact-enquiries?enquiry=${item.id}`} key={item.id}>
            <span className={`enquiry-status${item.status === "new" ? " is-new" : ""}`}>{item.status === "new" ? "Unread" : "Read"}</span>
            <div><strong>{item.name}</strong><span>{item.email}</span><p>{item.messagePreview}</p></div>
            <time dateTime={item.createdAt}>{formatReceived(item.createdAt)}</time>
          </Link>
        ))}</div>}
      </section>
    </main>
  );
}
