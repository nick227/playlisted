import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthField } from "@/components/auth/AuthField";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { readOAuthSession } from "@/lib/googleAuth";
import { panelPathForRole } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login, completeOAuthSession, getErrorMessage } = useAuth();

  usePageMeta({ title: "Log in" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryFrom = searchParams.get("from");
  const from = (location.state as { from?: string } | null)?.from ?? (queryFrom?.startsWith("/") ? queryFrom : "/");

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");
    if (oauthError) {
      setError(oauthError);
      navigate("/login", { replace: true, state: { from } });
      return;
    }

    const oauthSession = searchParams.get("oauthSession");
    if (!oauthSession) return;

    try {
      const signedInUser = completeOAuthSession(readOAuthSession(oauthSession));
      const destination = from !== "/" ? from : panelPathForRole(signedInUser.role) ?? "/";
      navigate(destination, { replace: true });
    } catch {
      setError("Google sign-in could not be completed. Please try again.");
      navigate("/login", { replace: true, state: { from } });
    }
  }, [completeOAuthSession, from, navigate, searchParams]);

  if (status === "authenticated") {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedInUser = await login({ email: email.trim(), password });
      const destination = from !== "/" ? from : panelPathForRole(signedInUser.role) ?? "/";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-white py-3.5 text-base font-bold text-black transition hover:scale-[1.01] hover:bg-white/95 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      <div className="mt-8">
        <GoogleAuthButton mode="login" returnTo={from} />
      </div>

      <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
        New here?{" "}
        <Link to="/register" className="font-semibold text-white hover:underline">
          Create your account
        </Link>
      </p>

    </div>
  );
}
