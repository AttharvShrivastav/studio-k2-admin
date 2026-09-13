import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicSiteSettings } from "@shared/types/contact";
import { PageError, PageLoading } from "@/components/PageState";
import { getSiteSettings, saveSiteSettings } from "@/lib/contact-api";
import { uploadImages } from "@/lib/projects-api";

export function SiteSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: getSiteSettings });
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [contactBackground, setContactBackground] = useState<PublicSiteSettings["contactBackground"]>({ src: "", alt: "", focalPosition: "center center" });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const save = useMutation({
    mutationFn: saveSiteSettings,
    onSuccess: (value) => queryClient.setQueryData(["site-settings"], value),
  });

  useEffect(() => {
    if (settings.data) {
      setAddress(settings.data.address);
      setEmail(settings.data.email);
      setContactBackground(settings.data.contactBackground);
    }
  }, [settings.data]);

  async function uploadBackground(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    setUploadError("");
    try {
      const [uploaded] = await uploadImages([files[0]]);
      setContactBackground((current) => ({ ...current, src: uploaded.url }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="content-page settings-page">
      <header className="page-header">
        <div><p className="eyebrow">Site settings</p><h1>Site settings</h1><p>Shared contact details displayed on the public website.</p></div>
      </header>
      {settings.isPending && <PageLoading label="Loading site settings" />}
      {settings.isError && <PageError message="Site settings could not be loaded." />}
      {settings.isSuccess && (
        <form className="settings-form" onSubmit={(event) => { event.preventDefault(); save.mutate({ address, email, contactBackground }); }}>
          <div className="field-group">
            <label htmlFor="site-address">Address</label>
            <textarea id="site-address" rows={6} maxLength={2000} required value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="site-email">Email Address</label>
            <input id="site-email" type="email" maxLength={320} required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <section className="settings-media-section">
            <div><p className="eyebrow">Contact page background</p><p>Background image used by the public Contact page.</p></div>
            <div className="settings-media-card">
              <div className="settings-media-preview">{contactBackground.src ? <img src={contactBackground.src} alt={contactBackground.alt} /> : <span>No image uploaded</span>}</div>
              <div className="settings-media-fields">
                <label className="upload-button">{uploading ? "Uploading…" : contactBackground.src ? "Replace image" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void uploadBackground(event.target.files)} /></label>
                <div className="field-group"><label htmlFor="contact-background-alt">Alt text</label><input id="contact-background-alt" maxLength={240} value={contactBackground.alt} onChange={(event) => setContactBackground((current) => ({ ...current, alt: event.target.value }))} /></div>
                <div className="field-group"><label htmlFor="contact-background-focal">Focal position</label><input id="contact-background-focal" maxLength={80} value={contactBackground.focalPosition ?? ""} onChange={(event) => setContactBackground((current) => ({ ...current, focalPosition: event.target.value || undefined }))} /></div>
                {uploadError && <p className="form-error">{uploadError}</p>}
              </div>
            </div>
          </section>
          {save.isError && <p className="form-error">Settings could not be saved. Review the fields and try again.</p>}
          {save.isSuccess && <p className="save-confirmation" role="status">Changes saved.</p>}
          <button className="primary-button settings-save" type="submit" disabled={save.isPending || uploading}>{save.isPending ? "Saving…" : "Save Changes"}</button>
        </form>
      )}
    </main>
  );
}
