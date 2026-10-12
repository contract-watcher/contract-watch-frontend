import { apiRequest } from "@/api/client";

export interface Integration {
  createdAt: string;
  description: null | string;
  id: string;
  name: string;
  projectId: string;
  slug: string;
  updatedAt: string;
}

export interface IntegrationPayload {
  description?: string;
  name: string;
  slug: string;
}

export function createIntegration(
  projectId: string,
  payload: IntegrationPayload,
  accessToken: null | string,
): Promise<Integration> {
  return apiRequest<Integration>(`/api/projects/${projectId}/integrations`, {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function deleteIntegration(projectId: string, integrationId: string, accessToken: null | string): Promise<void> {
  return apiRequest<void>(`/api/projects/${projectId}/integrations/${integrationId}`, {
    accessToken,
    method: "DELETE",
  });
}

export function getIntegration(
  projectId: string,
  integrationId: string,
  accessToken: null | string,
): Promise<Integration> {
  return apiRequest<Integration>(`/api/projects/${projectId}/integrations/${integrationId}`, { accessToken });
}

export function getIntegrations(projectId: string, accessToken: null | string): Promise<Integration[]> {
  return apiRequest<Integration[]>(`/api/projects/${projectId}/integrations`, { accessToken });
}

export function updateIntegration(
  projectId: string,
  integrationId: string,
  payload: IntegrationPayload,
  accessToken: null | string,
): Promise<Integration> {
  return apiRequest<Integration>(`/api/projects/${projectId}/integrations/${integrationId}`, {
    accessToken,
    body: payload,
    method: "PUT",
  });
}
