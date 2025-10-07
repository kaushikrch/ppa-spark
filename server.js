import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.join(__dirname, "dist");
// Proxy timeout (default 5 minutes) so the UI eventually surfaces failures
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 300000;

// API_URL must be the Cloud Run URL of the FastAPI service (no trailing slash)
const API_URL = process.env.API_URL;
if (!API_URL) {
  console.error(
    "ERROR: API_URL env var is required; set it to your FastAPI service URL"
  );
  process.exit(1);
}

// Proxy /api -> FastAPI
app.use(
  "/api",
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: { "^/api": "" },
    proxyTimeout: REQUEST_TIMEOUT_MS,
    timeout: REQUEST_TIMEOUT_MS,
    onError(err, req, res) {
      console.error("Proxy error:", err?.message);
      res
        .status(502)
        .json({ error: "proxy_error", detail: err?.message || "unknown" });
    },
  })
);

// Serve built UI
app.use(express.static(DIST));

// SPA fallback
app.get("*", (_, res) => res.sendFile(path.join(DIST, "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () =>
  console.log(`UI listening on ${port}; API proxy -> ${API_URL}`)
);

