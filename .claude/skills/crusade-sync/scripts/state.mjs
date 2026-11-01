// Read or write the Waha Assist synced state (the campaign lives in
// data.crusade) through the dev server's API, the same way the app does.
//
//   node state.mjs pull <file.json>   save the current document (rev + data)
//   node state.mjs push <file.json>   write it back; refused (409) if anyone
//                                     saved since the pull — pull again, redo
//   node state.mjs show               print the campaign summary
//
// The server normalizes what it stores (server/stateStore.mjs), so a field
// it does not know is dropped silently: check `show` after a push.
// BASE defaults to the dev server; set WAHA_URL for another host.

import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.WAHA_URL ?? "http://localhost:5173";
const [cmd, file] = process.argv.slice(2);

async function get() {
  const res = await fetch(`${BASE}/api/state`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/state failed: ${res.status} (is the dev server running?)`);
  return res.json();
}

if (cmd === "pull" && file) {
  const doc = await get();
  writeFileSync(file, JSON.stringify(doc, null, 2), "utf8");
  console.log(`rev ${doc.rev} saved to ${file}`);
} else if (cmd === "push" && file) {
  const doc = JSON.parse(readFileSync(file, "utf8"));
  const res = await fetch(`${BASE}/api/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseRev: doc.rev, data: doc.data }),
  });
  const body = await res.json();
  if (res.status === 409) {
    console.error(`conflict: the server is at rev ${body.rev}, you pulled ${doc.rev}. Pull again and redo the change.`);
    process.exit(2);
  }
  if (!res.ok) throw new Error(`PUT failed: ${res.status} ${JSON.stringify(body)}`);
  console.log(`saved, now rev ${body.rev}`);
} else if (cmd === "show") {
  const doc = await get();
  const c = doc.data.crusade;
  if (!c) {
    console.log(`rev ${doc.rev}: no campaign stored`);
  } else {
    console.log(`rev ${doc.rev}: «${c.name}»`);
    for (const p of c.players) console.log(`  player ${p.id} ${p.name}: ${p.armyId} ${JSON.stringify(p.armyIds ?? {})}`);
    for (const u of c.units) {
      const honours = u.honours.map((h) => h.id + (h.weapon ? `→${h.weapon}` : "")).join(", ");
      console.log(`  ${u.id} [${u.playerId}] ${u.name}: ${u.xp} XP; ${honours || "—"}; scars ${u.scars.join(", ") || "—"}${u.skipsMission ? "; skips" : ""}${u.leads ? `; leads ${u.leads}` : ""}`);
    }
    for (const m of c.missions) {
      console.log(`  mission ${m.number} «${m.name}» ed ${m.edition ?? 10}, limit ${m.pointsLimit}, ${m.result ?? "not played"}${"enemy" in m ? " (own enemy)" : ""}`);
    }
  }
} else {
  console.error("usage: node state.mjs pull <file> | push <file> | show");
  process.exit(1);
}
