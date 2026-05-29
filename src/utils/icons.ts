import type { TankJob } from "../types/mitigation";

const XIVAPI_BASE = "https://xivapi.com";

export const jobIconUrls: Record<TankJob, string> = {
  PLD: `${XIVAPI_BASE}/cj/1/paladin.png`,
  WAR: `${XIVAPI_BASE}/cj/1/warrior.png`,
  DRK: `${XIVAPI_BASE}/cj/1/darkknight.png`,
  GNB: `${XIVAPI_BASE}/cj/1/gunbreaker.png`,
};

export function xivIconUrl(icon?: string) {
  if (!icon) return "";
  if (/^https?:\/\//i.test(icon)) return icon;
  return `${XIVAPI_BASE}${icon.startsWith("/") ? icon : `/${icon}`}`;
}
