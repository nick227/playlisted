import { Navigate, useSearchParams } from "react-router-dom";

import { SpatialLibraryBrowser } from "@/components/library/SpatialLibraryBrowser";
import { usePageMeta } from "@/hooks/usePageMeta";
import { genrePath } from "@/lib/browsePaths";

export function LibraryPage() {
  const [params] = useSearchParams();
  const genre = params.get("genre")?.trim();

  usePageMeta({ title: "Library", description: "Browse artists, recordings, and playlists." });

  if (genre) {
    return <Navigate to={genrePath(genre)} replace />;
  }

  return <SpatialLibraryBrowser />;
}
