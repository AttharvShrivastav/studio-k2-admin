import type { ContactSubmissionStatus } from "../schemas/contact.js";

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactSubmissionStatus;
  createdAt: string;
};

export type ContactSubmissionListItem = Omit<ContactSubmission, "message"> & {
  messagePreview: string;
};
export type ContactSubmissionListResponse = { enquiries: ContactSubmissionListItem[] };
export type ContactSubmissionResponse = { enquiry: ContactSubmission };
export type ContactSubmissionCreatedResponse = { success: true };
export type PublicSiteSettings = { address: string; email: string };
export type SiteSettingsResponse = { settings: PublicSiteSettings };
