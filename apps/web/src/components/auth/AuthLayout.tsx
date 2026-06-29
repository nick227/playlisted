import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="">
      <section className="flex flex-col flex-1 px-6 py-12 lg:min-h-screen lg:px-16 mx-auto max-w-2xl align-center justify-center">
        
        <Link to="/" className="text-5xl font-bold tracking-tight text-white mb-8">
          Play<span className="text-[var(--color-brand)]">listed</span>
        </Link>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
