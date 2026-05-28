import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthField } from "@/components/auth/AuthField";
import { panelPathForRole } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login, getErrorMessage } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

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
      <h2 className="text-3xl font-extrabold tracking-tight text-white">Welcome back</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Log in to manage uploads, playlists, and your artist tools.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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

      <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
        New here?{" "}
        <Link to="/register" className="font-semibold text-white hover:underline">
          Create your account
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-[var(--color-text-subtle)]">
        Dev seed: admin@playlisted.local / Playlisted123!
      </p>
    </div>
  );
}
