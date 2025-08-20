import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DIST = path.join(__dirname, "dist");
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 300000;

// Cloud Run URL of FastAPI (no trailing slash), e.g. https://ppa-api-xxxxx.a.run.app
const API_URL = process.env.API_URL;

// Simple diagnostics (not proxied)
app.get("/_proxy-info", (req, res) => {
  res.json({
    api_url_env: API_URL || null,
    note: "UI serves / and proxies /api/* to API_URL",
  });
});

if (!API_URL) {
  console.warn("WARNING: API_URL is not set; /api proxy will forward to localhost:8080");
}

// Proxy /api -> FastAPI (strip the /api prefix)
app.use(
  "/api",
  createProxyMiddleware({
    target: API_URL || "http://127.0.0.1:8080",
    changeOrigin: true,
    xfwd: true,
    pathRewrite: { "^/api": "" },
    proxyTimeout: REQUEST_TIMEOUT_MS,
    timeout: REQUEST_TIMEOUT_MS,
    onError(err, req, res) {
      console.error("Proxy error:", err?.message);
      res.status(502).json({ error: "proxy_error", detail: err?.message || "unknown" });
    },
  })
);

// Serve built UI
app.use(express.static(DIST));

// SPA fallback
app.get("*", (_, res) => res.sendFile(path.join(DIST, "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`UI listening on ${port}; proxy -> ${API_URL || "http://127.0.0.1:8080"}`));