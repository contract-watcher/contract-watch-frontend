import type { ViolationGroup } from "@/api/violation-groups";

import { apiRequest } from "@/api/client";

export interface IntegrationSummary {
  failedReports: number;
  lastReceivedAt: null | string;
  latestViolationGroups: ViolationGroup[];
  passedReports: number;
  totalReports: number;
  violationGroupCount: number;
}

export function getIntegrationSummary(integrationId: string, accessToken: null | string): Promise<IntegrationSummary> {
  return apiRequest<IntegrationSummary>(`/api/integrations/${integrationId}/summary`, { accessToken });
}
