import { SpatialLibraryBrowser } from "@/components/library/SpatialLibraryBrowser";
import { usePageMeta } from "@/hooks/usePageMeta";

export function LibraryPage() {
  usePageMeta({ title: "Library", description: "Browse all songs and playlists." });
  return <SpatialLibraryBrowser />;
}
