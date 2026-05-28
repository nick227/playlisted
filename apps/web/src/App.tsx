import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/app-shell/AppShell";
import { AdminPage } from "@/pages/AdminPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { MemberPage } from "@/pages/MemberPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { PlaylistPage } from "@/pages/PlaylistPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SearchPage } from "@/pages/SearchPage";
import { StudioPage } from "@/pages/StudioPage";
import { StudioCollectionEditPage } from "@/pages/studio/StudioCollectionEditPage";
import { StudioCollectionsPage } from "@/pages/studio/StudioCollectionsPage";
import { StudioProfilePage } from "@/pages/studio/StudioProfilePage";
import { StudioHistoryPage } from "@/pages/studio/StudioHistoryPage";
import { StudioUploadsPage } from "@/pages/studio/StudioUploadsPage";

function MainRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/playlists/:playlistId" element={<PlaylistPage />} />
        <Route path="/@:username" element={<MemberPage />} />
        <Route path="/members/:userId" element={<MemberPage />} />
        <Route
          path="/explore"
          element={
            <PlaceholderPage
              title="Explore"
              description="Browse genres and moods — coming soon."
            />
          }
        />
        <Route
          path="/library"
          element={
            <PlaceholderPage
              title="Your library"
              description="Saved playlists and favorites — coming soon."
            />
          }
        />
        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <StudioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/uploads"
          element={
            <ProtectedRoute>
              <StudioUploadsPage />
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
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN", "EDITOR"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
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
