import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type { AuthTokens } from "@/api/auth";

import {
  decodeEmailFromToken,
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  register as registerRequest,
} from "@/api/auth";

const storageKey = "cw.auth.session";

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const session = ref<AuthSession | null>(loadSession());
  let restorePromise: null | Promise<void> = null;
  let refreshPromise: null | Promise<void> = null;

  const accessToken = computed(() => session.value?.accessToken ?? null);
  const isAuthenticated = computed(() => session.value !== null);
  const userEmail = computed(() => (session.value ? decodeEmailFromToken(session.value.accessToken) : ""));

  function setSession(next: AuthSession | null): void {
    session.value = next;
    if (next) {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } else {
      localStorage.removeItem(storageKey);
    }
  }

  function applyTokens(tokens: AuthTokens): void {
    setSession({
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    });
  }

  async function runRefresh(): Promise<void> {
    const current = session.value;
    if (!current) {
      return;
    }

    try {
      const tokens = await refreshRequest(current.refreshToken);
      applyTokens(tokens);
    } catch {
      setSession(null);
    }
  }

  async function refresh(): Promise<void> {
    refreshPromise ??= runRefresh();
    try {
      await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const tokens = await loginRequest({ email, password });
    applyTokens(tokens);
  }

  async function register(name: string, email: string, password: string): Promise<void> {
    const tokens = await registerRequest({ email, name, password });
    applyTokens(tokens);
  }

  function logout(): void {
    const current = session.value;
    setSession(null);
    if (!current) {
      return;
    }
    void logoutRequest(current.refreshToken).catch(() => {});
  }

  async function restoreSession(): Promise<void> {
    restorePromise ??= session.value ? refresh() : Promise.resolve();
    await restorePromise;
  }

  return {
    accessToken,
    isAuthenticated,
    login,
    logout,
    refresh,
    register,
    restoreSession,
    session,
    userEmail,
  };
});
