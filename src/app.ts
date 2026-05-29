import "dotenv/config";

import cors from "cors";
import express from "express";
import { isApiDocsEnabled } from "./lib/apiDocs.js";
import { getCorsOptions } from "./lib/corsOptions.js";
import { installWebApp } from "./lib/serveWeb.js";
import OpenApiValidator from "express-openapi-validator";
import fs from "node:fs";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

import { authRouter } from "./routes/auth.js";
import { developerKeysRouter } from "./routes/developer/keys.js";
import { developerKeyLimiter, ingestUploadLimiter } from "./lib/rateLimiter.js";
import { analyticsRouter } from "./routes/analytics.js";
import { adminDashboardRouter } from "./routes/admin/dashboard.js";
import { adminHomepageRouter } from "./routes/admin/homepage.js";
import { adminPlaylistsRouter } from "./routes/admin/playlists.js";
import { adminSongsRouter } from "./routes/admin/songs.js";
import { adminTagsRouter } from "./routes/admin/tags.js";
import { adminUsersRouter } from "./routes/admin/users.js";
import { chartsRouter } from "./routes/charts.js";
import { libraryRouter } from "./routes/library.js";
import { healthRouter } from "./routes/health.js";
import { homepageRouter } from "./routes/homepage.js";
import { meRouter } from "./routes/me.js";
import { playlistsRouter } from "./routes/playlists.js";
import { recordingsRouter } from "./routes/recordings.js";
import { searchRouter } from "./routes/search.js";
import { uploadsRouter } from "./routes/uploads.js";
import { ingestUploadsRouter } from "./routes/ingest/uploads.js";
import { ingestPlaylistsRouter } from "./routes/ingest/playlists.js";
import { ingestRecordingsRouter } from "./routes/ingest/recordings.js";
import { usersRouter } from "./routes/users.js";

const openApiPath = path.resolve(process.cwd(), "openapi/openapi.yaml");
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, "utf8"));

export function createApp() {
  const app = express();
  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");

  if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
  }

  app.use(cors(getCorsOptions()));
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));
  app.use("/api/v1/uploads", uploadsRouter);
  // Ingest upload: multipart — mounted before OpenAPI validator
  app.use("/api/v1/ingest/uploads", ingestUploadLimiter, ingestUploadsRouter);

  if (isApiDocsEnabled()) {
    app.get("/openapi.yaml", (_req, res) => {
      res.sendFile(openApiPath);
    });
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  app.use(
    OpenApiValidator.middleware({
      apiSpec: openApiPath,
      validateRequests: true,
      validateResponses: false,
    }),
  );

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/me/analytics", analyticsRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1/homepage", homepageRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/playlists", playlistsRouter);
  app.use("/api/v1/recordings", recordingsRouter);
  app.use("/api/v1/search", searchRouter);
  app.use("/api/v1/charts", chartsRouter);
  app.use("/api/v1/library", libraryRouter);
  app.use("/api/v1/admin/dashboard", adminDashboardRouter);
  app.use("/api/v1/admin/songs", adminSongsRouter);
  app.use("/api/v1/admin/playlists", adminPlaylistsRouter);
  app.use("/api/v1/admin/tags", adminTagsRouter);
  app.use("/api/v1/admin/homepage-features", adminHomepageRouter);
  app.use("/api/v1/admin/users", adminUsersRouter);
  app.use("/api/v1/developer/keys", developerKeyLimiter, developerKeysRouter);
  app.use("/api/v1/ingest/playlists", ingestPlaylistsRouter);
  app.use("/api/v1/ingest/recordings", ingestRecordingsRouter);

  installWebApp(app);

  app.use((req, res) => {
    res.status(404).json({
      error: "not_found",
      message: `No route found for ${req.method} ${req.originalUrl}`,
    });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error && typeof error === "object" && "status" in error) {
      const err = error as {
        status: number;
        message?: string;
        errors?: unknown;
      };

      return res.status(err.status).json({
        error: "request_validation_failed",
        message: err.message ?? "Request validation failed.",
        details: err.errors ?? null,
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "internal_server_error",
      message: "An unexpected error occurred.",
    });
  });

  return app;
}
