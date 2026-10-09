import { apiRequest } from "@/api/client";

export interface CreateProjectPayload {
  name: string;
}

export interface Project {
  createdAt: string;
  id: string;
  name: string;
  updatedAt: string;
}

export function createProject(payload: CreateProjectPayload, accessToken: null | string): Promise<Project> {
  return apiRequest<Project>("/api/projects", { accessToken, body: payload, method: "POST" });
}

export function getProject(projectId: string, accessToken: null | string): Promise<Project> {
  return apiRequest<Project>(`/api/projects/${projectId}`, { accessToken });
}

export function getProjects(accessToken: null | string): Promise<Project[]> {
  return apiRequest<Project[]>("/api/projects", { accessToken });
}
