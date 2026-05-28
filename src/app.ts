import "dotenv/config";

import cors from "cors";
import express from "express";
import OpenApiValidator from "express-openapi-validator";
import fs from "node:fs";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { homepageRouter } from "./routes/homepage.js";
import { meRouter } from "./routes/me.js";
import { playlistsRouter } from "./routes/playlists.js";
import { recordingsRouter } from "./routes/recordings.js";
import { uploadsRouter } from "./routes/uploads.js";
import { usersRouter } from "./routes/users.js";

const openApiPath = path.resolve(process.cwd(), "openapi/openapi.yaml");
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, "utf8"));

export function createApp() {
  const app = express();
  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));
  app.use("/api/v1/uploads", uploadsRouter);

  app.get("/openapi.yaml", (_req, res) => {
    res.sendFile(openApiPath);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(
    OpenApiValidator.middleware({
      apiSpec: openApiPath,
      validateRequests: true,
      validateResponses: true,
    }),
  );

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1/homepage", homepageRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/playlists", playlistsRouter);
  app.use("/api/v1/recordings", recordingsRouter);

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
