import type { ContactSubmissionStatus, SiteSettingsInput } from "@shared/schemas/contact";
import type {
  ContactSubmission,
  ContactSubmissionListItem,
  ContactSubmissionListResponse,
  ContactSubmissionResponse,
  PublicSiteSettings,
  SiteSettingsResponse,
} from "@shared/types/contact";
import type { TemplateType } from "@shared/schemas/project";
import { ApiRequestError } from "./projects-api";

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string; code?: string } } | null;
    throw new ApiRequestError(
      payload?.error?.message ?? "The request could not be completed",
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
    );
  }
  return response.json() as Promise<T>;
}

export async function listEnquiries(): Promise<ContactSubmissionListItem[]> {
  return (await requestJson<ContactSubmissionListResponse>("/api/admin/contact-enquiries")).enquiries;
}

export async function getEnquiry(id: string): Promise<ContactSubmission> {
  return (await requestJson<ContactSubmissionResponse>(`/api/admin/contact-enquiries/${id}`)).enquiry;
}

export async function setEnquiryStatus(id: string, status: ContactSubmissionStatus): Promise<ContactSubmission> {
  return (await requestJson<ContactSubmissionResponse>(`/api/admin/contact-enquiries/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })).enquiry;
}

export async function getSiteSettings(): Promise<PublicSiteSettings> {
  return (await requestJson<SiteSettingsResponse>("/api/admin/site-settings")).settings;
}

export async function saveSiteSettings(input: SiteSettingsInput): Promise<PublicSiteSettings> {
  return (await requestJson<SiteSettingsResponse>("/api/admin/site-settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  })).settings;
}

export async function createTemplateReference(template: TemplateType): Promise<string> {
  return (await requestJson<{ url: string }>(`/api/admin/template-reference/${template}`, {
    method: "POST",
  })).url;
}
