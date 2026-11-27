// Arquivos estáticos para desenvolvimento local (em produção o site fica no GitHub Pages).
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
};

export function serveStatic(request, response, root) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); } catch { return false; }
  const base = pathname.startsWith("/shared/") ? root : path.join(root, "client");
  let file = path.normalize(path.join(base, pathname));
  if (!file.startsWith(base)) return false;
  try {
    let stat = fs.statSync(file);
    if (stat.isDirectory()) { file = path.join(file, "index.html"); stat = fs.statSync(file); }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    if (request.headers["if-none-match"] === etag) { response.writeHead(304); response.end(); return true; }
    response.writeHead(200, { "content-type": type, "content-length": stat.size, etag, "cache-control": "no-cache" });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(file).pipe(response);
    return true;
  } catch {
    return false;
  }
}
