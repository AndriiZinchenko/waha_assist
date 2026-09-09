import type { Plugin } from "vite";

/**
 * Mounts the synced-config routes on the Vite dev and preview servers.
 * `dir` defaults to `<cwd>/data`.
 */
export function syncedStatePlugin(options?: { dir?: string }): Plugin;
