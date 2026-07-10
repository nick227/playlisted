import { startGoogleAuth } from "@/lib/googleAuth";

type GoogleAuthButtonProps = {
  mode: "login" | "register";
  returnTo?: string;
};

export function GoogleAuthButton({ mode, returnTo }: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={() => startGoogleAuth(mode, returnTo)}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-[var(--color-border)] bg-white px-4 py-3.5 text-base font-bold text-black transition hover:scale-[1.01] hover:bg-white/95"
    >
      <span className="grid size-6 place-items-center rounded-full border border-black/10 text-sm font-extrabold">
        G
      </span>
      {mode === "register" ? "Sign up with Google" : "Continue with Google"}
    </button>
  );
}
