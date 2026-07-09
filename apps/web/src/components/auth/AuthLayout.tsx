import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="relative z-10 flex min-h-screen">
      <section className="mx-auto flex w-full max-w-2xl flex-col bg-[var(--color-canvas)]/80 px-6 py-12 lg:my-auto lg:max-h-[720px] lg:px-16">
        <Link to="/" className="mb-4 text-5xl font-bold tracking-tight text-white">
          Play<span className="text-[var(--color-brand)]">listed</span>
        </Link>

        <div className="w-full">
          <Outlet />
        </div>
      </section>
    </div>
  );
}