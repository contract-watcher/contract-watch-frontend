import { apiRequest } from "@/api/client";

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

export function login(payload: LoginPayload): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/login", { method: "POST", body: payload });
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest<void>("/api/auth/logout", { method: "POST", body: { refreshToken } });
}

export function refresh(refreshToken: string): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/refresh", { method: "POST", body: { refreshToken } });
}

export function register(payload: RegisterPayload): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/api/auth/register", { method: "POST", body: payload });
}

export function decodeEmailFromToken(accessToken: string): string {
  try {
    const payload = accessToken.split(".", 2)[1];
    if (!payload) {
      return "";
    }

    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.codePointAt(0) ?? 0);
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { email?: string };

    return claims.email ?? "";
  } catch {
    return "";
  }
}
