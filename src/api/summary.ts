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

export interface IntegrationSummaryQuery {
  from?: string;
  to?: string;
}

export function getIntegrationSummary(
  integrationId: string,
  query: IntegrationSummaryQuery = {},
  accessToken: null | string,
): Promise<IntegrationSummary> {
  const params = new URLSearchParams();

  if (query.from) {
    params.set("from", query.from);
  }
  if (query.to) {
    params.set("to", query.to);
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  return apiRequest<IntegrationSummary>(`/api/integrations/${integrationId}/summary${suffix}`, { accessToken });
}
