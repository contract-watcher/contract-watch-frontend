import { apiRequest } from "@/api/client";

export interface ApiKey {
  createdAt: string;
  id: string;
  isRevoked: boolean;
  lastUsedAt: null | string;
  mask: string;
  name: string;
  revokedAt: null | string;
}

export interface CreateApiKeyPayload {
  name: string;
}

export interface CreatedApiKey {
  createdAt: string;
  id: string;
  key: string;
  mask: string;
  name: string;
}

export function createApiKey(
  integrationId: string,
  payload: CreateApiKeyPayload,
  accessToken: null | string,
): Promise<CreatedApiKey> {
  return apiRequest<CreatedApiKey>(`/api/integrations/${integrationId}/keys`, {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function getApiKeys(integrationId: string, accessToken: null | string): Promise<ApiKey[]> {
  return apiRequest<ApiKey[]>(`/api/integrations/${integrationId}/keys`, { accessToken });
}

export function revokeApiKey(integrationId: string, keyId: string, accessToken: null | string): Promise<void> {
  return apiRequest<void>(`/api/integrations/${integrationId}/keys/${keyId}/revoke`, {
    accessToken,
    method: "POST",
  });
}
