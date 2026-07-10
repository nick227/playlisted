import type { AuthResponse } from "@playlisted/client-sdk";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export function startGoogleAuth(mode: "login" | "register", returnTo?: string) {
  const target = new URL("/api/v1/auth/google", getApiOrigin());
  target.searchParams.set("mode", mode);
  target.searchParams.set("webOrigin", window.location.origin);
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    target.searchParams.set("returnTo", returnTo);
  }
  window.location.assign(target.toString());
}

export function readOAuthSession(value: string): AuthResponse {
  const binary = window.atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as AuthResponse;
}

function getApiOrigin() {
  if (!apiBaseUrl) return window.location.origin;
  return new URL(apiBaseUrl, window.location.origin).origin;
}
