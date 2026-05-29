import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="">
      <section className="flex flex-col flex-1 items-center justify-center bg-[var(--color-canvas)] px-6 py-12 lg:min-h-screen lg:px-16">
        
        <Link to="/" className="text-8xl font-bold tracking-tight text-white mb-8">
          Play<span className="text-[var(--color-brand)]">listed</span>
        </Link>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
