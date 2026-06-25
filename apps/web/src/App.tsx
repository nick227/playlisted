import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import { RadioPlayerProvider } from "@/providers/RadioPlayerProvider";

const AuthLayout = lazy(() => import("@/components/auth/AuthLayout").then((mod) => ({ default: mod.AuthLayout })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((mod) => ({ default: mod.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((mod) => ({ default: mod.RegisterPage })));

const HomePage = lazy(() => import("@/pages/HomePage").then((mod) => ({ default: mod.HomePage })));
const SearchPage = lazy(() => import("@/pages/SearchPage").then((mod) => ({ default: mod.SearchPage })));
const RadioPage = lazy(() => import("@/pages/RadioPage").then((mod) => ({ default: mod.RadioPage })));
const CanonicalPlaylistPage = lazy(() =>
  import("@/pages/CanonicalPlaylistPage").then((mod) => ({ default: mod.CanonicalPlaylistPage })),
);
const PlaylistPage = lazy(() => import("@/pages/PlaylistPage").then((mod) => ({ default: mod.PlaylistPage })));
const MemberPage = lazy(() => import("@/pages/MemberPage").then((mod) => ({ default: mod.MemberPage })));
const LibraryPage = lazy(() => import("@/pages/LibraryPage").then((mod) => ({ default: mod.LibraryPage })));
const FavoritesPage = lazy(() => import("@/pages/FavoritesPage").then((mod) => ({ default: mod.FavoritesPage })));

const LibraryPlaylistsPage = lazy(() =>
  import("@/pages/library/LibraryBrowsePages").then((mod) => ({ default: mod.LibraryPlaylistsPage })),
);
const LibrarySongsPage = lazy(() =>
  import("@/pages/library/LibraryBrowsePages").then((mod) => ({ default: mod.LibrarySongsPage })),
);
const LibraryGenresPage = lazy(() =>
  import("@/pages/library/LibraryBrowsePages").then((mod) => ({ default: mod.LibraryGenresPage })),
);
const LibraryGenrePage = lazy(() =>
  import("@/pages/library/LibraryBrowsePages").then((mod) => ({ default: mod.LibraryGenrePage })),
);
const LibraryArtistsPage = lazy(() =>
  import("@/pages/library/LibraryBrowsePages").then((mod) => ({ default: mod.LibraryArtistsPage })),
);
const LibraryArtistRedirect = lazy(() =>
  import("@/pages/library/LibraryBrowsePages").then((mod) => ({ default: mod.LibraryArtistRedirect })),
);

const MusiciansPage = lazy(() => import("@/pages/site/SitePages").then((mod) => ({ default: mod.MusiciansPage })));
const DevelopersPage = lazy(() => import("@/pages/site/SitePages").then((mod) => ({ default: mod.DevelopersPage })));
const AdvertisingPage = lazy(() => import("@/pages/site/SitePages").then((mod) => ({ default: mod.AdvertisingPage })));
const CompanyPage = lazy(() => import("@/pages/site/SitePages").then((mod) => ({ default: mod.CompanyPage })));
const JobsPage = lazy(() => import("@/pages/site/SitePages").then((mod) => ({ default: mod.JobsPage })));
const MediaPage = lazy(() => import("@/pages/site/SitePages").then((mod) => ({ default: mod.MediaPage })));
const PrivacyPage = lazy(() => import("@/pages/site/PrivacyPage").then((mod) => ({ default: mod.PrivacyPage })));

const StudioPage = lazy(() => import("@/pages/StudioPage").then((mod) => ({ default: mod.StudioPage })));
const StudioCollectionsPage = lazy(() =>
  import("@/pages/studio/StudioCollectionsPage").then((mod) => ({ default: mod.StudioCollectionsPage })),
);
const StudioCollectionEditPage = lazy(() =>
  import("@/pages/studio/StudioCollectionEditPage").then((mod) => ({ default: mod.StudioCollectionEditPage })),
);
const StudioAnalyticsPage = lazy(() =>
  import("@/pages/studio/StudioAnalyticsPage").then((mod) => ({ default: mod.StudioAnalyticsPage })),
);
const StudioHistoryPage = lazy(() =>
  import("@/pages/studio/StudioHistoryPage").then((mod) => ({ default: mod.StudioHistoryPage })),
);
const StudioProfilePage = lazy(() =>
  import("@/pages/studio/StudioProfilePage").then((mod) => ({ default: mod.StudioProfilePage })),
);
const StudioLinksPage = lazy(() =>
  import("@/pages/studio/StudioLinksPage").then((mod) => ({ default: mod.StudioLinksPage })),
);
const StudioDeveloperPage = lazy(() =>
  import("@/pages/studio/StudioDeveloperPage").then((mod) => ({ default: mod.StudioDeveloperPage })),
);

const AdminPage = lazy(() => import("@/pages/AdminPage").then((mod) => ({ default: mod.AdminPage })));
const AdminDashboardPage = lazy(() =>
  import("@/pages/admin/AdminDashboardPage").then((mod) => ({ default: mod.AdminDashboardPage })),
);
const AdminTrafficPage = lazy(() =>
  import("@/pages/admin/AdminTrafficPage").then((mod) => ({ default: mod.AdminTrafficPage })),
);
const AdminSongsPage = lazy(() =>
  import("@/pages/admin/AdminSongsPage").then((mod) => ({ default: mod.AdminSongsPage })),
);
const AdminPlaylistsPage = lazy(() =>
  import("@/pages/admin/AdminPlaylistsPage").then((mod) => ({ default: mod.AdminPlaylistsPage })),
);
const AdminUsersPage = lazy(() =>
  import("@/pages/admin/AdminUsersPage").then((mod) => ({ default: mod.AdminUsersPage })),
);
const AdminHomepagePage = lazy(() =>
  import("@/pages/admin/AdminHomepagePage").then((mod) => ({ default: mod.AdminHomepagePage })),
);
const AdminTagsPage = lazy(() =>
  import("@/pages/admin/AdminTagsPage").then((mod) => ({ default: mod.AdminTagsPage })),
);
const AdminApiKeysPage = lazy(() =>
  import("@/pages/admin/AdminApiKeysPage").then((mod) => ({ default: mod.AdminApiKeysPage })),
);
const AdminRadioPage = lazy(() =>
  import("@/pages/admin/AdminRadioPage").then((mod) => ({ default: mod.AdminRadioPage })),
);

function LegacyProfileRedirect() {
  const { username } = useParams<{ username?: string }>();
  return <Navigate to={`/@/${encodeURIComponent(username ?? "")}`} replace />;
}

function MainRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/radio" element={<RadioPage />} />
        <Route path="/@:username" element={<LegacyProfileRedirect />} />
        <Route path="/@/:username/:slug" element={<CanonicalPlaylistPage />} />
        <Route path="/playlists" element={<LibraryPlaylistsPage />} />
        <Route path="/playlists/:playlistId" element={<PlaylistPage />} />
        <Route path="/@/:username" element={<MemberPage />} />
        <Route path="/members/:userId" element={<MemberPage />} />
        <Route path="/explore" element={<Navigate to="/" replace />} />
        <Route path="/trending" element={<Navigate to="/" replace />} />
        <Route path="/musicians" element={<MusiciansPage />} />
        <Route path="/developers" element={<DevelopersPage />} />
        <Route path="/advertising" element={<AdvertisingPage />} />
        <Route path="/company" element={<CompanyPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/library/favorites" element={<Navigate to="/favorites" replace />} />
        <Route path="/songs" element={<LibrarySongsPage />} />
        <Route path="/genres" element={<LibraryGenresPage />} />
        <Route path="/genres/:slug" element={<LibraryGenrePage />} />
        <Route path="/artists" element={<LibraryArtistsPage />} />
        <Route path="/artists/:username" element={<LibraryArtistRedirect />} />
        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <StudioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/collections"
          element={
            <ProtectedRoute>
              <StudioCollectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/collections/:playlistId/edit"
          element={
            <ProtectedRoute>
              <StudioCollectionEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/analytics"
          element={
            <ProtectedRoute>
              <StudioAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/history"
          element={
            <ProtectedRoute>
              <StudioHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/profile"
          element={
            <ProtectedRoute roles={["CREATOR", "ADMIN", "LISTENER"]}>
              <StudioProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/links"
          element={
            <ProtectedRoute roles={["CREATOR", "ADMIN", "LISTENER"]}>
              <StudioLinksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/developer"
          element={
            <ProtectedRoute>
              <StudioDeveloperPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN", "EDITOR"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="traffic" element={<AdminTrafficPage />} />
          <Route path="songs" element={<AdminSongsPage />} />
          <Route path="playlists" element={<AdminPlaylistsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="homepage" element={<AdminHomepagePage />} />
          <Route path="tags" element={<AdminTagsPage />} />
          <Route path="api-keys" element={<AdminApiKeysPage />} />
          <Route
            path="radio"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminRadioPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
          path="/playlists/new"
          element={<Navigate to="/studio/collections" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RadioPlayerProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route path="/*" element={<MainRoutes />} />
          </Routes>
        </Suspense>
      </RadioPlayerProvider>
    </BrowserRouter>
  );
}
