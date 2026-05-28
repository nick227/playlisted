import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[#0a0d12] px-8 py-10 lg:min-h-screen lg:px-14 lg:py-14">
        <div
          className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[var(--color-brand)]/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-3xl"
          aria-hidden
        />
        <Link to="/" className="relative z-10 text-xl font-bold tracking-tight text-white">
          Music<span className="text-[var(--color-brand)]">Pop</span>
        </Link>
        <div className="relative z-10 my-12 max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-brand)]">
            Join the movement
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl">
            Upload. Curate.
            <br />
            <span className="bg-gradient-to-r from-white via-violet-200 to-[var(--color-brand)] bg-clip-text text-transparent">
              Get heard.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--color-text-muted)]">
            Real tracks, real cover art, and playlists that feel alive. Whether you&apos;re a listener or
            building your artist home base — this is where your catalog starts.
          </p>
        </div>
        <p className="relative z-10 text-xs text-[var(--color-text-subtle)]">
          © {new Date().getFullYear()} MusicPop
        </p>
      </section>
      <section className="flex flex-1 items-center justify-center bg-[var(--color-canvas)] px-6 py-12 lg:min-h-screen lg:px-16">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
