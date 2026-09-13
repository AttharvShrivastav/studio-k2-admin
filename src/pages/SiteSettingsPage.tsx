import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageError, PageLoading } from "@/components/PageState";
import { getSiteSettings, saveSiteSettings } from "@/lib/contact-api";

export function SiteSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings });
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const save = useMutation({
    mutationFn: saveSiteSettings,
    onSuccess: (value) => queryClient.setQueryData(["site-settings"], value),
  });

  useEffect(() => {
    if (settings.data) {
      setAddress(settings.data.address);
      setEmail(settings.data.email);
    }
  }, [settings.data]);

  return (
    <main className="content-page settings-page">
      <header className="page-header">
        <div><p className="eyebrow">Site settings</p><h1>Site settings</h1><p>Shared contact details displayed on the public website.</p></div>
      </header>
      {settings.isPending && <PageLoading label="Loading site settings" />}
      {settings.isError && <PageError message="Site settings could not be loaded." />}
      {settings.isSuccess && (
        <form className="settings-form" onSubmit={(event) => { event.preventDefault(); save.mutate({ address, email }); }}>
          <div className="field-group">
            <label htmlFor="site-address">Address</label>
            <textarea id="site-address" rows={6} maxLength={2000} required value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="site-email">Email Address</label>
            <input id="site-email" type="email" maxLength={320} required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {save.isError && <p className="form-error">Settings could not be saved. Review the fields and try again.</p>}
          {save.isSuccess && <p className="save-confirmation" role="status">Changes saved.</p>}
          <button className="primary-button settings-save" type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Changes"}</button>
        </form>
      )}
    </main>
  );
}
