// HTTP shape for the synced config: two routes over the state store.
// Takes a plain { method, url, body } and returns a plain { status, json },
// so it can be unit-tested directly and mounted on any Node server.

import { readDoc, writeDoc } from "./stateStore.mjs";

const ROUTE = "/api/state";
const MAX_BODY_BYTES = 1_048_576;

export async function handleStateRequest(dir, { method, url, body }) {
  const pathOnly = (url ?? "").split("?")[0];
  if (pathOnly !== ROUTE) return null;

  if (method === "GET") {
    return { status: 200, json: await readDoc(dir) };
  }

  if (method === "PUT") {
    if (Buffer.byteLength(body ?? "", "utf8") > MAX_BODY_BYTES) {
      return { status: 413, json: { error: "body too large" } };
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return { status: 400, json: { error: "body is not valid JSON" } };
    }
    if (!Number.isInteger(parsed?.baseRev) || parsed.baseRev < 0) {
      return { status: 400, json: { error: "baseRev must be a non-negative integer" } };
    }
    const result = await writeDoc(dir, parsed.baseRev, parsed.data);
    return { status: result.ok ? 200 : 409, json: result.doc };
  }

  return { status: 405, json: { error: `${method} not allowed` } };
}
