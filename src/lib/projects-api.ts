import type {
  CreateProjectInput,
  ProjectStatus,
  UpdateProjectBasicsInput,
} from "@shared/schemas/project";
import type {
  ApiErrorResponse,
  ProjectBasics,
  ProjectListResponse,
  ProjectResponse,
} from "@shared/types/project";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

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
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new ApiRequestError(
      payload?.error.message ?? "The request could not be completed",
      response.status,
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.fields,
    );
  }

  return response.json() as Promise<T>;
}

export async function listProjects(status: ProjectStatus): Promise<ProjectBasics[]> {
  const response = await requestJson<ProjectListResponse>(`/api/admin/projects?status=${status}`);
  return response.projects;
}

export async function getProject(id: string): Promise<ProjectBasics> {
  const response = await requestJson<ProjectResponse>(`/api/admin/projects/${id}`);
  return response.project;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectBasics> {
  const response = await requestJson<ProjectResponse>("/api/admin/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.project;
}

export async function updateProject(
  id: string,
  input: UpdateProjectBasicsInput,
): Promise<ProjectBasics> {
  const response = await requestJson<ProjectResponse>(`/api/admin/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.project;
}

export async function archiveProject(id: string): Promise<ProjectBasics> {
  const response = await requestJson<ProjectResponse>(`/api/admin/projects/${id}/archive`, {
    method: "POST",
  });
  return response.project;
}

export async function restoreProject(id: string): Promise<ProjectBasics> {
  const response = await requestJson<ProjectResponse>(`/api/admin/projects/${id}/restore`, {
    method: "POST",
  });
  return response.project;
}
