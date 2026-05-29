import { PlaylistedApiError } from "@playlisted/client-sdk";
import { Link, useLocation } from "react-router-dom";

import { EmptyState } from "./EmptyState";

export function PlaylistAccessEmptyState({ error }: { error: unknown }) {
  const location = useLocation();

  if (error instanceof PlaylistedApiError && error.status === 401) {
    return (
      <EmptyState
        title="Sign in required"
        description="Log in to view this playlist."
        action={
          <Link
            to="/login"
            state={{ from: location.pathname }}
            className="inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Log in
          </Link>
        }
      />
    );
  }

  if (error instanceof PlaylistedApiError && error.status === 403) {
    return (
      <EmptyState
        title="Private playlist"
        description="You do not have access to this collection."
      />
    );
  }

  return (
    <EmptyState
      title="Playlist not found"
      description="This playlist may have been removed."
    />
  );
}
