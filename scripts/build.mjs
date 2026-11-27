// Monta a pasta dist/ publicada no GitHub Pages: cliente + código compartilhado + OSLab.
// PUBLIC_SERVER_URL define o servidor de produção (Render).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, "client"), dist, { recursive: true });
fs.cpSync(path.join(root, "shared"), path.join(dist, "shared"), { recursive: true });
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
// Versiona módulos e estilos (?v=...) para nenhum cache antigo servir arquivos velhos.
const build = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 10);
const versioned = (text) => text
  .replace(/(from\s+["'])(\.{1,2}\/[^"'?]+\.mjs)(["'])/g, `$1$2?v=${build}$3`)
  .replace(/(import\s+["'])(\.{1,2}\/[^"'?]+\.mjs)(["'])/g, `$1$2?v=${build}$3`);
for (const dir of [path.join(dist, "js"), path.join(dist, "shared")]) {
  for (const name of fs.readdirSync(dir)) if (name.endsWith(".mjs")) { const file = path.join(dir, name); fs.writeFileSync(file, versioned(fs.readFileSync(file, "utf8"))); }
}
const index = path.join(dist, "index.html");
fs.writeFileSync(index, fs.readFileSync(index, "utf8").replace(/(href|src)="(\.\/[^"?]+\.(?:css|mjs))"/g, `$1="$2?v=${build}"`));
const server = process.env.PUBLIC_SERVER_URL;
if (server) {
  const config = path.join(dist, "js", "config.mjs");
  const text = fs.readFileSync(config, "utf8").replace(/const PRODUCTION_SERVER = "[^"]*";/, `const PRODUCTION_SERVER = ${JSON.stringify(server.replace(/\/$/, ""))};`);
  fs.writeFileSync(config, text);
}
let files = 0;
let bytes = 0;
const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else { files += 1; bytes += fs.statSync(full).size; } } };
walk(dist);
console.log(`dist/ pronto: ${files} arquivos, ${(bytes / 1048576).toFixed(1)} MB${server ? ` • servidor ${server}` : ""}`);
