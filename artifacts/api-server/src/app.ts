import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", router);

// Serve the dashboard's static build in production.
// Resolve relative to the bundle file (artifacts/api-server/dist/index.mjs)
// so this works regardless of what directory Render starts the process from.
const bundleDir = path.dirname(fileURLToPath(import.meta.url));
const dashboardDist = path.resolve(bundleDir, "../../../artifacts/dashboard/dist/public");

logger.info({ dashboardDist, exists: existsSync(dashboardDist) }, "Dashboard static path");

if (existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  // SPA fallback — send index.html for any unmatched non-API route
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(dashboardDist, "index.html"));
  });
} else {
  logger.warn({ dashboardDist }, "Dashboard dist not found — skipping static serving");
}

export default app;
