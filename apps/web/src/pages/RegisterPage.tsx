import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { AuthField } from "@/components/auth/AuthField";
import { useAuth } from "@/providers/AuthProvider";
import { panelPathForRole } from "@/lib/routes";

type AccountKind = "listener" | "artist";

export function RegisterPage() {
  const navigate = useNavigate();
  const { status, register, getErrorMessage } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountKind, setAccountKind] = useState<AccountKind>("listener");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        role: accountKind === "artist" ? "CREATOR" : "LISTENER",
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
      <h2 className="text-3xl font-extrabold tracking-tight text-white">Start your journey</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Free to join. Upload tracks, build playlists, and grow your audience.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountKind("listener")}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              accountKind === "listener"
                ? "border-[var(--color-brand)] bg-[var(--color-brand)]/15"
                : "border-[var(--color-border)] hover:border-white/20"
            }`}
          >
            <p className="text-sm font-bold text-white">Listener</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Save, follow, discover</p>
          </button>
          <button
            type="button"
            onClick={() => setAccountKind("artist")}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              accountKind === "artist"
                ? "border-[var(--color-brand)] bg-[var(--color-brand)]/15"
                : "border-[var(--color-border)] hover:border-white/20"
            }`}
          >
            <p className="text-sm font-bold text-white">Artist</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Upload & manage releases</p>
          </button>
        </div>

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

      <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-white hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
