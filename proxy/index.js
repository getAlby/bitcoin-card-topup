// server.js
// CORS proxy for api.lendaswap.com
// Usage: yarn install && node index.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const UPSTREAM = process.env.UPSTREAM || "https://api.lendaswap.com";

app.use(express.raw({ type: "*/*", limit: "10mb" }));

app.use(async (req, res) => {
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

  const target = `${UPSTREAM}${req.originalUrl}`;
  const headers = { ...req.headers };
  delete headers.host;
  delete headers["content-length"];
  delete headers.origin;
  delete headers.referer;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : req.body,
      redirect: "manual",
    });

    res.status(upstream.status);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "*");
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (
        k === "content-encoding" ||
        k === "transfer-encoding" ||
        k === "connection" ||
        k === "content-length"
      )
        return;
      res.setHeader(key, value);
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error("proxy error", err);
    res.status(502).send("Bad Gateway");
  }
});

app.listen(PORT, () =>
  console.log(`Proxying ${UPSTREAM} on http://0.0.0.0:${PORT}`),
);
