import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageError, PageLoading } from "@/components/PageState";
import { getEnquiry, listEnquiries, setEnquiryStatus } from "@/lib/contact-api";

function formatReceived(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ContactEnquiriesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!selectedId && list.data?.[0]) setSelectedId(list.data[0].id);
  }, [list.data, selectedId]);

  return (
    <main className="content-page enquiries-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Contact enquiries</p>
          <h1>Studio inbox</h1>
          <p>Messages submitted through the public Studio K2 contact form.</p>
        </div>
      </header>

      {list.isPending && <PageLoading label="Loading enquiries" />}
      {list.isError && <PageError message="Enquiries could not be loaded." />}
      {list.isSuccess && list.data.length === 0 && (
        <section className="empty-state"><span>00</span><h2>No enquiries yet.</h2><p>New contact submissions will appear here.</p></section>
      )}
      {list.isSuccess && list.data.length > 0 && (
        <div className="enquiry-shell">
          <div className="enquiry-list" aria-label="Contact enquiries">
            {list.data.map((item) => (
              <button
                className={`enquiry-list-item${selectedId === item.id ? " is-selected" : ""}`}
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={`enquiry-status${item.status === "new" ? " is-new" : ""}`}>{item.status}</span>
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
                    <span className={`enquiry-status${enquiry.data.status === "new" ? " is-new" : ""}`}>{enquiry.data.status}</span>
                    <h2>{enquiry.data.name}</h2>
                    <a href={`mailto:${enquiry.data.email}`}>{enquiry.data.email}</a>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={status.isPending}
                    onClick={() => status.mutate({ id: enquiry.data.id, next: enquiry.data.status === "new" ? "read" : "new" })}
                  >
                    Mark as {enquiry.data.status === "new" ? "Read" : "Unread"}
                  </button>
                </header>
                <time dateTime={enquiry.data.createdAt}>{formatReceived(enquiry.data.createdAt)}</time>
                <div className="enquiry-message">{enquiry.data.message}</div>
                {status.isError && <p className="form-error">The enquiry status could not be changed.</p>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
