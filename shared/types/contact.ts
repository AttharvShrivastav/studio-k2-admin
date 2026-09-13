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
export type ContactSubmissionDeleteResponse = { deleted: { id: string } };
export type ContactSubmissionCreatedResponse = { success: true };
export type PublicSiteSettings = {
  address: string;
  email: string;
  contactBackground: { src: string; alt: string; focalPosition?: string };
};
export type SiteSettingsResponse = { settings: PublicSiteSettings };
