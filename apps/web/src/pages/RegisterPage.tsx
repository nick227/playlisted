import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthField } from "@/components/auth/AuthField";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { readOAuthSession } from "@/lib/googleAuth";
import { useAuth } from "@/providers/AuthProvider";
import { panelPathForRole } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, register, completeOAuthSession, getErrorMessage } = useAuth();

  usePageMeta({ title: "Sign up", description: "Create your free Playlisted account." });
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryFrom = searchParams.get("from");
  const from = queryFrom?.startsWith("/") ? queryFrom : "/";

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");
    if (oauthError) {
      setError(oauthError);
      navigate("/register", { replace: true });
      return;
    }

    const oauthSession = searchParams.get("oauthSession");
    if (!oauthSession) return;

    try {
      const newUser = completeOAuthSession(readOAuthSession(oauthSession));
      const destination = from !== "/" ? from : panelPathForRole(newUser.role) ?? "/";
      navigate(destination, { replace: true });
    } catch {
      setError("Google registration could not be completed. Please try again.");
      navigate("/register", { replace: true });
    }
  }, [completeOAuthSession, from, navigate, searchParams]);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const newUser = await register({
        email: email.trim(),
        displayName: displayName.trim(),
        password,
      });
      navigate(panelPathForRole(newUser.role) ?? "/", { replace: true });
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
          label="Display name"
          name="displayName"
          required
          maxLength={120}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nova Lane"
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <AuthField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
        />

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-gradient-to-r from-[var(--color-brand)] to-fuchsia-600 py-3.5 text-base font-bold text-white shadow-lg shadow-[var(--color-brand)]/25 transition hover:scale-[1.01] disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="mt-8">
        <GoogleAuthButton mode="register" returnTo={from} />
      </div>

      <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-white hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
