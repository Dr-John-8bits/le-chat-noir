#!/usr/bin/env node
// Serveur statique de développement : Cache-Control no-store pour que chaque
// rechargement reflète l'état réel des fichiers. Jamais utilisé en production.

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 48290);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info && info.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }

    if (!info) {
      const notFound = await readFile(path.join(ROOT, "404.html")).catch(() => null);
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(notFound || "404");
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Length": body.length,
    });
    res.end(body);
  } catch {
    res.writeHead(500, { "Cache-Control": "no-store" }).end("Erreur serveur");
  }
});

server.listen(PORT, () => {
  process.stdout.write(`Le Chat Noir (dev) → http://localhost:${PORT}\n`);
});
