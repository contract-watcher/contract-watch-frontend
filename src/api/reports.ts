import { apiRequest } from "@/api/client";

export interface ReportDetails {
  contractId: string;
  contractName: null | string;
  contractSlug: null | string;
  contractVersion: number;
  receivedAt: string;
  reportId: string;
  status: ReportStatus;
  violationCount: number;
  violations: ReportViolation[];
}

export interface ReportListItem {
  contractId: string;
  contractName: null | string;
  contractSlug: null | string;
  contractVersion: number;
  receivedAt: string;
  reportId: string;
  status: ReportStatus;
  violationCount: number;
}

export type ReportStatus = "Failed" | "Passed";

export interface ReportViolation {
  actualType: null | string;
  expectedType: null | string;
  fieldName: string;
  groupId: null | string;
  type: ViolationType;
}

export interface ReportsPage {
  items: ReportListItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface ReportsQuery {
  contractId?: string[];
  from?: string;
  limit?: number;
  offset?: number;
  status?: ReportStatus;
  to?: string;
}

export type ViolationType = "NullNotAllowed" | "RequiredFieldMissing" | "TypeMismatch";

export function getReport(integrationId: string, reportId: string, accessToken: null | string): Promise<ReportDetails> {
  return apiRequest<ReportDetails>(`/api/integrations/${integrationId}/reports/${reportId}`, { accessToken });
}

export function getReports(
  integrationId: string,
  query: ReportsQuery = {},
  accessToken: null | string,
): Promise<ReportsPage> {
  const params = new URLSearchParams();

  if (query.contractId) {
    for (const contractId of query.contractId) {
      params.append("contractId", contractId);
    }
  }
  if (query.from) {
    params.set("from", query.from);
  }
  if (query.to) {
    params.set("to", query.to);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.offset !== undefined) {
    params.set("offset", String(query.offset));
  }
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  return apiRequest<ReportsPage>(`/api/integrations/${integrationId}/reports${suffix}`, { accessToken });
}
