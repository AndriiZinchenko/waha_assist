import type { Side } from "../components/ArmyPanel";
import { isPhase, type Phase } from "./phases";

export type Screen = "list" | "config" | "battle";

/** Which weapons the calculator resolves; follows the phase (see phases.ts). */
export type WeaponMode = "ranged" | "melee";

/**
 * Everything about *where you are* in the app, kept in the URL hash so a
 * reload, a reopened tab or a pasted link lands on the same screen with the
 * same units open. Data (model counts, leader assignments, hidden units,
 * language) lives in storage and sync instead.
 *
 *   #/                                   army list
 *   #/config/<armyId>                    configuration for one army
 *   #/battle?a=&b=&ua=&ub=&p=fight&side=b the two panels
 *
 * The side assignments `a`/`b` ride along on every screen so picks made
 * on the list survive a detour into configuration.
 */
export interface RouteState {
  screen: Screen;
  configArmyId: string | null;
  a: string | null;
  b: string | null;
  /** Unit expanded on side A / B (battle screen only). */
  ua: string | null;
  ub: string | null;
  /** The phase being played (battle screen only). Kept in the URL so a
   * reload stays in it. */
  phase: Phase;
  /** Panel shown on narrow screens (battle screen only). */
  side: Side;
}

export const LIST_ROUTE: RouteState = {
  screen: "list",
  configArmyId: null,
  a: null,
  b: null,
  ua: null,
  ub: null,
  phase: "shooting",
  side: "a",
};

/** `p=`, or the older `w=melee` (Fight); Shooting when neither says. */
function parsePhase(params: URLSearchParams): Phase {
  const p = params.get("p");
  if (isPhase(p)) return p;
  return params.get("w") === "melee" ? "fight" : "shooting";
}

export function parseRoute(hash: string): RouteState {
  const raw = hash.replace(/^#/, "");
  const queryAt = raw.indexOf("?");
  const path = queryAt === -1 ? raw : raw.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? "" : raw.slice(queryAt + 1));

  const a = params.get("a");
  const b = params.get("b");
  const withSides: RouteState = { ...LIST_ROUTE, a, b };

  const segments = path.split("/").filter(Boolean);
  const [screen, arg] = segments;

  if (screen === "config" && arg) {
    return { ...withSides, screen: "config", configArmyId: decodeURIComponent(arg) };
  }

  if (screen === "battle" && a && b) {
    const side = params.get("side");
    return {
      ...withSides,
      screen: "battle",
      ua: params.get("ua"),
      ub: params.get("ub"),
      phase: parsePhase(params),
      side: side === "b" ? "b" : "a",
    };
  }

  return withSides;
}

export function formatRoute(route: RouteState): string {
  const params = new URLSearchParams();
  if (route.a) params.set("a", route.a);
  if (route.b) params.set("b", route.b);

  let path = "/";
  if (route.screen === "config" && route.configArmyId) {
    path = `/config/${encodeURIComponent(route.configArmyId)}`;
  } else if (route.screen === "battle" && route.a && route.b) {
    path = "/battle";
    if (route.ua) params.set("ua", route.ua);
    if (route.ub) params.set("ub", route.ub);
    if (route.phase !== "shooting") params.set("p", route.phase);
    if (route.side === "b") params.set("side", "b");
  }

  const query = params.toString();
  return `#${path}${query ? `?${query}` : ""}`;
}
