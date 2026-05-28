import type { AuthUser, LoginRequest, RegisterRequest } from "@playlisted/client-sdk";
import { PlaylistedApiError } from "@playlisted/client-sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import { clearSession, loadSession, saveSession } from "@/lib/authStorage";

type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (body: LoginRequest) => Promise<AuthUser>;
  register: (body: RegisterRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  getErrorMessage: (error: unknown) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(accessToken: string, expiresAt: string, user: AuthUser) {
  saveSession({ accessToken, expiresAt, user });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const authedApi = useMemo(() => {
    if (!accessToken) return api;
    return api.withOptions({
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }, [accessToken]);

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof PlaylistedApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Something went wrong. Please try again.";
  }, []);

  const refreshUser = useCallback(async () => {
    const session = loadSession();
    if (!session?.accessToken) {
      return null;
    }

    const { user: freshUser } = await api
      .withOptions({ headers: { Authorization: `Bearer ${session.accessToken}` } })
      .auth.me();

    setUser(freshUser);
    saveSession({
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      user: freshUser,
    });
    return freshUser;
  }, []);

  const logout = useCallback(async () => {
    if (accessToken) {
      try {
        await authedApi.auth.logout();
      } catch {
        // Clear local session even if revoke fails
      }
    }
    clearSession();
    setUser(null);
    setAccessToken(null);
    setStatus("guest");
  }, [accessToken, authedApi]);

  const login = useCallback(async (body: LoginRequest) => {
    const result = await api.auth.login(body);
    applySession(result.accessToken, result.expiresAt, result.user);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const register = useCallback(async (body: RegisterRequest) => {
    const result = await api.auth.register(body);
    applySession(result.accessToken, result.expiresAt, result.user);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      setStatus("guest");
      return;
    }

    setAccessToken(session.accessToken);
    setUser(session.user);

    api
      .withOptions({ headers: { Authorization: `Bearer ${session.accessToken}` } })
      .auth.me()
      .then(({ user: freshUser }) => {
        setUser(freshUser);
        saveSession({
          accessToken: session.accessToken,
          expiresAt: session.expiresAt,
          user: freshUser,
        });
        setStatus("authenticated");
      })
      .catch(() => {
        clearSession();
        setAccessToken(null);
        setUser(null);
        setStatus("guest");
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      register,
      logout,
      refreshUser,
      getErrorMessage,
    }),
    [status, user, accessToken, login, register, logout, refreshUser, getErrorMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
