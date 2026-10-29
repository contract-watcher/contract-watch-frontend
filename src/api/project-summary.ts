import { apiRequest } from "@/api/client";

export interface ProjectSummaryItem {
  failedReports: number;
  integrationId: string;
  lastReceivedAt: null | string;
  name: string;
  passedReports: number;
  slug: string;
  totalReports: number;
}

export interface ProjectSummaryPage {
  items: ProjectSummaryItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface ProjectSummaryQuery {
  from?: string;
  integrationId?: string[];
  limit?: number;
  offset?: number;
  onlyFailed?: boolean;
  to?: string;
}

export function getProjectIntegrationSummaries(
  projectId: string,
  query: ProjectSummaryQuery = {},
  accessToken: null | string,
): Promise<ProjectSummaryPage> {
  const params = new URLSearchParams();

  if (query.from) {
    params.set("from", query.from);
  }
  if (query.to) {
    params.set("to", query.to);
  }
  if (query.onlyFailed) {
    params.set("onlyFailed", "true");
  }
  if (query.integrationId) {
    for (const integrationId of query.integrationId) {
      params.append("integrationId", integrationId);
    }
  }
  if (query.offset !== undefined) {
    params.set("offset", String(query.offset));
  }
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  return apiRequest<ProjectSummaryPage>(`/api/projects/${projectId}/integration-summaries${suffix}`, {
    accessToken,
  });
}
