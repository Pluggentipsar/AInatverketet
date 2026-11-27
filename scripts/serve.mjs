// Minimal statisk server för site/ under utveckling: node scripts/serve.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const rotSite = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const PORT = 4173;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let sokvag = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
    if (sokvag === "" || sokvag === ".") sokvag = "index.html";
    if (/[/\\]$/.test(sokvag)) sokvag += "index.html";
    const fil = join(rotSite, sokvag);
    if (!fil.startsWith(rotSite)) { res.writeHead(403).end(); return; }
    const data = await readFile(fil);
    res.writeHead(200, { "Content-Type": MIME[extname(fil)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
