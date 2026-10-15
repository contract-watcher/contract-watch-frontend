import { apiRequest } from "@/api/client";

export interface Contract {
  createdAt: string;
  description: null | string;
  id: string;
  integrationId: string;
  latestVersion: null | number;
  name: string;
  slug: string;
  updatedAt: string;
}

export type ContractFieldType = "Array" | "Boolean" | "Number" | "Object" | "String";

export interface ContractPayload {
  description?: string;
  name: string;
  slug: string;
}

export interface ContractRule {
  fieldName: string;
  nullable: boolean;
  required: boolean;
  type: ContractFieldType;
}

export interface ContractVersion {
  comment: null | string;
  contractId: string;
  createdAt: string;
  id: string;
  publishedAt: null | string;
  rules: ContractRule[];
  version: number;
}

export interface CreateContractVersionPayload {
  comment?: string;
  rules: ContractRule[];
}

export function createContract(
  integrationId: string,
  payload: ContractPayload,
  accessToken: null | string,
): Promise<Contract> {
  return apiRequest<Contract>(`/api/integrations/${integrationId}/contracts`, {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function createContractVersion(
  contractId: string,
  payload: CreateContractVersionPayload,
  accessToken: null | string,
): Promise<ContractVersion> {
  return apiRequest<ContractVersion>(`/api/contracts/${contractId}/versions`, {
    accessToken,
    body: payload,
    method: "POST",
  });
}

export function getContracts(integrationId: string, accessToken: null | string): Promise<Contract[]> {
  return apiRequest<Contract[]>(`/api/integrations/${integrationId}/contracts`, { accessToken });
}

export function getContractVersions(contractId: string, accessToken: null | string): Promise<ContractVersion[]> {
  return apiRequest<ContractVersion[]>(`/api/contracts/${contractId}/versions`, { accessToken });
}

export function publishContractVersion(
  contractId: string,
  version: number,
  accessToken: null | string,
): Promise<ContractVersion> {
  return apiRequest<ContractVersion>(`/api/contracts/${contractId}/versions/${version}/publish`, {
    accessToken,
    method: "POST",
  });
}
