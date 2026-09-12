import type { HealthResponse } from "@shared/types/api";

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("The API is not available");
  }

  return response.json() as Promise<HealthResponse>;
}
