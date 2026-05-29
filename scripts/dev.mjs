import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import fflogsImportHandler from "../api/fflogs/import.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5173);

function loadEnvFile(fileName) {
  const envPath = path.join(root, fileName);
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const vite = await createViteServer({
  root,
  server: { middlewareMode: true },
  appType: "spa",
});

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
  if (requestUrl.pathname === "/api/fflogs/import") {
    req.query = Object.fromEntries(requestUrl.searchParams.entries());
    await fflogsImportHandler(req, res);
    return;
  }
  vite.middlewares(req, res);
});

server.listen(port, host, () => {
  console.log(`FF14 planner dev server running at http://${host}:${port}/`);
  console.log("Local API route enabled: /api/fflogs/import");
});
