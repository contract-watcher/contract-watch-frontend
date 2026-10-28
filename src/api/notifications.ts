import { apiRequest } from "@/api/client";

export interface IntegrationNotificationSettings {
  emailEnabled: boolean;
  emailEnabledAt: null | string;
}

export interface UpdateNotificationSettingsPayload {
  emailEnabled: boolean;
}

export function getIntegrationNotifications(
  integrationId: string,
  accessToken: null | string,
): Promise<IntegrationNotificationSettings> {
  return apiRequest<IntegrationNotificationSettings>(`/api/integrations/${integrationId}/notifications`, {
    accessToken,
  });
}

export function updateIntegrationNotifications(
  integrationId: string,
  payload: UpdateNotificationSettingsPayload,
  accessToken: null | string,
): Promise<IntegrationNotificationSettings> {
  return apiRequest<IntegrationNotificationSettings>(`/api/integrations/${integrationId}/notifications`, {
    accessToken,
    body: payload,
    method: "PUT",
  });
}
