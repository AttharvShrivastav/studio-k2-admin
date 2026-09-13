import type { HomepageSpotlightConfig } from "@shared/schemas/homepage";
import type { HomepageAdminResponse } from "@shared/types/homepage";
import type { ApiErrorResponse } from "@shared/types/project";
import { ApiRequestError } from "./projects-api";

async function request<T>(options?: RequestInit): Promise<T> {
  const response = await fetch("/api/admin/homepage", {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new ApiRequestError(
      payload?.error.message ?? "Homepage Spotlight could not be saved",
      response.status,
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.fields,
    );
  }

  return response.json() as Promise<T>;
}

export async function getHomepageSpotlight() {
  return (await request<HomepageAdminResponse>()).spotlight;
}

export async function saveHomepageSpotlight(input: HomepageSpotlightConfig) {
  return (
    await request<HomepageAdminResponse>({
      method: "PATCH",
      body: JSON.stringify(input),
    })
  ).spotlight;
}
