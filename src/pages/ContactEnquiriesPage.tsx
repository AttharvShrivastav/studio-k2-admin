import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PageError, PageLoading } from "@/components/PageState";
import { deleteEnquiry, getEnquiry, listEnquiries, setEnquiryStatus } from "@/lib/contact-api";

function formatReceived(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ContactEnquiriesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("enquiry"));
  const [filter, setFilter] = useState<"all" | "new" | "read">("all");
  const list = useQuery({ queryKey: ["contact-enquiries"], queryFn: listEnquiries });
  const enquiry = useQuery({
    queryKey: ["contact-enquiries", selectedId],
    queryFn: () => getEnquiry(selectedId!),
    enabled: selectedId !== null,
  });
  const status = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "new" | "read" }) => setEnquiryStatus(id, next),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["contact-enquiries", updated.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["contact-enquiries"] });
    },
  });
  const remove = useMutation({
    mutationFn: deleteEnquiry,
    onSuccess: async (_, deletedId) => {
      queryClient.removeQueries({ queryKey: ["contact-enquiries", deletedId] });
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ["contact-enquiries"] });
    },
  });
  const filtered = (list.data ?? []).filter((item) => filter === "all" || item.status === filter);

  useEffect(() => {
    if ((!selectedId || !filtered.some((item) => item.id === selectedId)) && filtered[0]) setSelectedId(filtered[0].id);
    if (filtered.length === 0 && selectedId) setSelectedId(null);
  }, [filtered, selectedId]);

  return (
    <main className="content-page enquiries-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Contact enquiries</p>
          <h1>Studio inbox</h1>
          <p>Messages submitted through the public Studio K2 contact form.</p>
        </div>
      </header>

      <div className="enquiry-filter" role="group" aria-label="Filter enquiries">
        {([['all', 'All'], ['new', 'Unread'], ['read', 'Read']] as const).map(([value, label]) => <button type="button" className={filter === value ? "is-active" : ""} aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}
      </div>

      {list.isPending && <PageLoading label="Loading enquiries" />}
      {list.isError && <PageError message="Enquiries could not be loaded." />}
      {list.isSuccess && list.data.length === 0 && (
        <section className="empty-state"><span>00</span><h2>No enquiries yet.</h2><p>New contact submissions will appear here.</p></section>
      )}
      {list.isSuccess && list.data.length > 0 && filtered.length === 0 && (
        <section className="empty-state compact-empty"><span>00</span><h2>No {filter === "new" ? "unread" : "read"} enquiries.</h2></section>
      )}
      {list.isSuccess && filtered.length > 0 && (
        <div className="enquiry-shell">
          <div className="enquiry-list" aria-label="Contact enquiries">
            {filtered.map((item) => (
              <button
                className={`enquiry-list-item${selectedId === item.id ? " is-selected" : ""}${item.status === "new" ? " is-unread" : ""}`}
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={`enquiry-status${item.status === "new" ? " is-new" : ""}`}>{item.status === "new" ? "Unread" : "Read"}</span>
                <strong>{item.name}</strong>
                <span>{item.email}</span>
                <p>{item.messagePreview}</p>
                <time dateTime={item.createdAt}>{formatReceived(item.createdAt)}</time>
              </button>
            ))}
          </div>
          <section className="enquiry-detail" aria-live="polite">
            {enquiry.isPending && <PageLoading label="Opening enquiry" />}
            {enquiry.isError && <PageError message="This enquiry could not be loaded." />}
            {enquiry.data && (
              <>
                <header>
                  <div>
                    <span className={`enquiry-status${enquiry.data.status === "new" ? " is-new" : ""}`}>{enquiry.data.status === "new" ? "Unread" : "Read"}</span>
                    <h2>{enquiry.data.name}</h2>
                    <a href={`mailto:${enquiry.data.email}`}>{enquiry.data.email}</a>
                  </div>
                  <div className="enquiry-actions"><button
                      className="secondary-button"
                      type="button"
                      disabled={status.isPending || remove.isPending}
                      onClick={() => status.mutate({ id: enquiry.data.id, next: enquiry.data.status === "new" ? "read" : "new" })}
                    >Mark as {enquiry.data.status === "new" ? "Read" : "Unread"}</button><button className="text-danger-button" type="button" disabled={status.isPending || remove.isPending} onClick={() => { if (window.confirm(`Delete the enquiry from ${enquiry.data.name}? This cannot be undone.`)) remove.mutate(enquiry.data.id); }}>{remove.isPending ? "Deleting…" : "Delete enquiry"}</button></div>
                </header>
                <time dateTime={enquiry.data.createdAt}>{formatReceived(enquiry.data.createdAt)}</time>
                <div className="enquiry-message">{enquiry.data.message}</div>
                {status.isError && <p className="form-error">The enquiry status could not be changed.</p>}
                {remove.isError && <p className="form-error">The enquiry could not be deleted.</p>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
