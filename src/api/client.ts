const apiBaseUrl = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  readonly fieldErrors?: Record<string, string[]>;
  readonly status: number;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ProblemDetails {
  errors?: Record<string, string[]>;
  title?: string;
}

export interface ApiRequestOptions {
  accessToken?: null | string;
  body?: unknown;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
}

const unauthorizedState: { handler: (() => void) | null } = { handler: null };

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedState.handler = handler;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, accessToken } = options;
  const headers = buildHeaders(body, accessToken);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Не удалось связаться с сервером");
  }

  if (!response.ok) {
    if (accessToken && response.status === 401) {
      unauthorizedState.handler?.();
    }
    throw await createApiError(response);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

function buildHeaders(body: unknown, accessToken?: null | string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function createApiError(response: Response): Promise<ApiError> {
  const problem = await readProblemDetails(response);
  const message = problem?.title || `Ошибка запроса (${response.status})`;

  return new ApiError(response.status, message, problem?.errors);
}

async function readProblemDetails(response: Response): Promise<null | ProblemDetails> {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return null;
  }
}
