import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import { AdminPage } from "@/pages/AdminPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminHomepagePage } from "@/pages/admin/AdminHomepagePage";
import { AdminPlaylistsPage } from "@/pages/admin/AdminPlaylistsPage";
import { AdminSongsPage } from "@/pages/admin/AdminSongsPage";
import { AdminTagsPage } from "@/pages/admin/AdminTagsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminApiKeysPage } from "@/pages/admin/AdminApiKeysPage";
import { AdminRadioPage } from "@/pages/admin/AdminRadioPage";
import { HomePage } from "@/pages/HomePage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { MemberPage } from "@/pages/MemberPage";
import { PlaylistPage } from "@/pages/PlaylistPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SearchPage } from "@/pages/SearchPage";
import { CanonicalPlaylistPage } from "@/pages/CanonicalPlaylistPage";
import { StudioPage } from "@/pages/StudioPage";
import { StudioCollectionEditPage } from "@/pages/studio/StudioCollectionEditPage";
import { StudioCollectionsPage } from "@/pages/studio/StudioCollectionsPage";
import { StudioProfilePage } from "@/pages/studio/StudioProfilePage";
import { StudioLinksPage } from "@/pages/studio/StudioLinksPage";
import { StudioAnalyticsPage } from "@/pages/studio/StudioAnalyticsPage";
import { StudioHistoryPage } from "@/pages/studio/StudioHistoryPage";
import { StudioDeveloperPage } from "@/pages/studio/StudioDeveloperPage";
import { RadioPage } from "@/pages/RadioPage";

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
        <Route path="/playlists/:playlistId" element={<PlaylistPage />} />
        <Route path="/@/:username" element={<MemberPage />} />
        <Route path="/members/:userId" element={<MemberPage />} />
        <Route path="/explore" element={<Navigate to="/" replace />} />
        <Route path="/trending" element={<Navigate to="/" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/favorites" element={<FavoritesPage />} />
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
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="/*" element={<MainRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
