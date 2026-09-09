// Mounts the synced-config routes on the Vite dev and preview servers, so
// `npm run dev` serves the app and its state API on one port. That port is
// the one the tablet already loads the app from.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { handleStateRequest } from "./stateRoutes.mjs";

const MAX_BODY_BYTES = 1_048_576;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      // Stop reading a runaway body rather than buffering it all; the route
      // layer turns the oversized marker into a 413.
      if (size > MAX_BODY_BYTES) {
        resolve("x".repeat(MAX_BODY_BYTES + 1));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function syncedStatePlugin(options = {}) {
  const dir = options.dir ?? path.resolve(process.cwd(), "data");

  const middleware = async (req, res, next) => {
    let result;
    try {
      await mkdir(dir, { recursive: true });
      const body = req.method === "PUT" ? await readBody(req) : "";
      result = await handleStateRequest(dir, { method: req.method, url: req.url, body });
    } catch (err) {
      console.error("[state] request failed", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "internal error" }));
      return;
    }
    if (result === null) {
      next();
      return;
    }
    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(result.json));
  };

  return {
    name: "waha-synced-state",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
