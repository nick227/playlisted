import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import type { AuthUser } from "@playlisted/client-sdk";

import { Skeleton } from "@/components/feedback/Skeleton";
import { useAuth } from "@/providers/AuthProvider";

type UserRole = AuthUser["role"];

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
