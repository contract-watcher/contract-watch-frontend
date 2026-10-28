import { apiRequest } from "@/api/client";

export interface Account {
  email: string;
  emailConfirmed: boolean;
}

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

export function confirmEmail(token: string): Promise<void> {
  return apiRequest<void>("/api/auth/email-confirmation/confirm", { body: { token }, method: "POST" });
}

export function getAccount(accessToken: null | string): Promise<Account> {
  return apiRequest<Account>("/api/auth/me", { accessToken });
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

export function requestEmailConfirmation(accessToken: null | string): Promise<void> {
  return apiRequest<void>("/api/auth/email-confirmation", { accessToken, method: "POST" });
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
