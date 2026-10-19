import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (request, response) => {
  try {
    const requestedPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filePath = resolve(root, "." + requestedPath);
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    let target = filePath;
    const details = await stat(target);
    if (details.isDirectory()) target = resolve(target, "index.html");
    const body = await readFile(target);
    response.writeHead(200, {
      "content-type": types[extname(target)] || "application/octet-stream",
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Kantama is ready at http://127.0.0.1:" + port);
});
