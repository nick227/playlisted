import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const allowedHosts = [
  "localhost",
  "127.0.0.1",
  ".localhost",
  ".railway.app",
  ...(process.env.VITE_ALLOWED_HOSTS?.split(",").map((host) => host.trim()).filter(Boolean) ?? []),
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // 5173 is often taken by desktop-playlisted-app; use a dedicated port for this web app.
    port: 5174,
    allowedHosts,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts,
  },
});
