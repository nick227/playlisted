import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { queryClient } from "@/lib/queryClient";
import { AudioPlayerProvider } from "@/providers/AudioPlayerProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AudioPlayerProvider>
          <App />
        </AudioPlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
