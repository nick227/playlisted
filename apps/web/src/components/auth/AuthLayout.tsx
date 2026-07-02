import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="relative z-10 min-h-full">
      <section className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:min-h-screen lg:px-16 mx-auto max-w-2xl align-center">
        
        <Link to="/" className="text-5xl font-bold tracking-tight text-white mb-4">
          Play<span className="text-[var(--color-brand)]">listed</span>
        </Link>

        <div className="w-full">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
