const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const DIST = path.join(__dirname, "dist");

// API_URL must be the Cloud Run URL of the FastAPI service (no trailing slash)
const API_URL = process.env.API_URL;
if (!API_URL) {
  console.warn("WARNING: API_URL env var not set; /api proxy will use localhost:8080");
}

// Proxy /api -> FastAPI
app.use(
  "/api",
  createProxyMiddleware({
    target: API_URL || "http://localhost:8080",
    changeOrigin: true,
    xfwd: true,
    pathRewrite: { "^/api": "" },
    proxyTimeout: 300000,
    timeout: 300000,
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
app.listen(port, () => console.log(`UI listening on ${port}; proxy -> ${API_URL}`));