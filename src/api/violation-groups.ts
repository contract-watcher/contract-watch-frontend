import { apiRequest } from "@/api/client";

export type ViolationJsonType = "Array" | "Boolean" | "Number" | "Object" | "String";

export type ViolationKind = "NullNotAllowed" | "RequiredFieldMissing" | "TypeMismatch";

export interface ViolationGroup {
  actualType: null | ViolationJsonType;
  contractId: string;
  contractName: null | string;
  contractSlug: null | string;
  contractVersion: number;
  expectedType: null | ViolationJsonType;
  fieldName: string;
  firstSeenAt: string;
  groupId: string;
  lastSeenAt: string;
  occurrenceCount: number;
  type: ViolationKind;
}

export interface ViolationGroupsPage {
  items: ViolationGroup[];
  limit: number;
  offset: number;
  total: number;
}

export interface ViolationGroupsQuery {
  limit?: number;
  offset?: number;
}

export function getViolationGroup(
  integrationId: string,
  groupId: string,
  accessToken: null | string,
): Promise<ViolationGroup> {
  return apiRequest<ViolationGroup>(`/api/integrations/${integrationId}/violation-groups/${groupId}`, { accessToken });
}

export function getViolationGroups(
  integrationId: string,
  query: ViolationGroupsQuery = {},
  accessToken: null | string,
): Promise<ViolationGroupsPage> {
  const params = new URLSearchParams();

  if (query.offset !== undefined) {
    params.set("offset", String(query.offset));
  }
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  return apiRequest<ViolationGroupsPage>(`/api/integrations/${integrationId}/violation-groups${suffix}`, {
    accessToken,
  });
}
