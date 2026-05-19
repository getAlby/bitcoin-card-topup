// CORS + WebSocket pass-through proxy for api.lendaswap.com
// Usage: yarn install && node index.js
import express from "express";
import http from "http";
import httpProxy from "http-proxy";

const PORT = process.env.PORT || 3000;
const UPSTREAM = process.env.UPSTREAM || "https://api.lendaswap.com";

const upstreamUrl = new URL(UPSTREAM);

const proxy = httpProxy.createProxyServer({
  target: UPSTREAM,
  changeOrigin: true,
  ws: true,
  secure: true,
  xfwd: true,
});

// Strip accept-encoding so upstream replies in plain bytes (avoids gzip/br
// body+header skew when we forward the body verbatim).
proxy.on("proxyReq", (proxyReq) => {
  proxyReq.removeHeader("accept-encoding");
});

// CORS on every proxied HTTP response.
proxy.on("proxyRes", (proxyRes, _req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "*");
});

// For websocket upgrades, point the upstream Origin at the real API so it
// passes any origin checks on its side.
proxy.on("proxyReqWs", (proxyReq) => {
  proxyReq.setHeader("origin", upstreamUrl.origin);
});

proxy.on("error", (err, _req, res) => {
  console.error("proxy error", err);
  if (res && !res.headersSent && typeof res.writeHead === "function") {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad Gateway");
  } else if (res && typeof res.destroy === "function") {
    res.destroy();
  }
});

const app = express();

app.use((req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "*",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  proxy.web(req, res);
});

const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PORT, () =>
  console.log(`Proxying ${UPSTREAM} (HTTP + WS) on http://0.0.0.0:${PORT}`),
);
