import type { MitigationSkill, PlannerSettings } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";
import { inAnyWindow } from "../utils/time";

export type MitigationStackGroup = "invuln" | "hardMit" | "shortMit" | "supportMit" | "partyMit" | "utility";

export function mitigationStackGroup(skill: MitigationSkill): MitigationStackGroup {
  if (skill.isInvuln) return "invuln";
  if (skill.category === "party") return "partyMit";
  if (skill.category === "target" && skill.canTargetPartner) return "supportMit";
  if (skill.cooldown <= 30 || skill.category === "target") return "shortMit";
  if ((skill.mitigationPercent ?? 0) > 0) return "hardMit";
  return "utility";
}

export function skillMatchesEvent(skill: MitigationSkill, event: TimelineEvent): boolean {
  if (event.type === "mechanic" || event.type === "roleMechanic") return false;
  if (skill.damageType !== "all" && skill.damageType !== event.damageType) return false;
  if (skill.category === "party") return event.target === "party" || event.target === "bothTanks";
  if (skill.targeting === "bothTanks") return event.target === "bothTanks";
  if (skill.targeting === "self" || skill.targeting === "selected") return event.target !== "party";
  return true;
}

export function isTankbusterEvent(event: TimelineEvent): boolean {
  return event.type === "singleTankbuster" || event.type === "sharedTankbuster" || event.type === "spreadTankbuster";
}

export function scoreSkillForEvent(skill: MitigationSkill, event: TimelineEvent, start: number, settings: PlannerSettings): number {
  let score = 0;
  const isBigMit = skill.id === "common-rampart" || (skill.category === "personal" && skill.cooldown >= 90 && (skill.mitigationPercent ?? 0) >= 30);
  const isShortMit = skill.cooldown <= 30 || skill.category === "target";
  const isSupportMit = skill.category === "target" && skill.canTargetPartner;
  if (skill.isInvuln) {
    score += event.severity === "lethal" ? 100 : -100;
    if (settings.preferInvulnCheese && isTankbusterEvent(event)) score += event.type === "sharedTankbuster" ? 170 : event.target === "bothTanks" ? 140 : 80;
  }
  if (skill.category === "party" && event.type === "aoe") score += 75;
  if (skill.category === "party" && event.target === "party") score += 55;
  if (skill.category === "party" && event.target === "bothTanks") score += 35;
  if (skill.enName === "Reprisal" && event.type === "aoe") score += 65;
  if (skill.category === "personal" && event.type === "aoe") score -= 45;
  if (skill.category === "target" && event.type === "aoe") score += 18;
  if (isTankbusterEvent(event)) {
    if (isBigMit) score += 68;
    if (isShortMit) score += skill.cooldown <= 25 ? 72 : 52;
    if (isSupportMit) score += event.target === "bothTanks" ? 70 : 42;
    if (skill.category === "party") score -= 15;
  }
  if (event.severity === "high") score += skill.mitigationPercent ?? 8;
  if (event.severity === "lethal") score += (skill.mitigationPercent ?? 10) * 2;
  if (event.type === "auto") {
    if (isShortMit) score += skill.cooldown <= 25 ? 80 : 50;
    if (isBigMit) score -= 45;
    if (skill.isInvuln || skill.category === "party") score -= 80;
  }
  if (settings.avoidBurstWindows && inAnyWindow(start, settings.burstWindows, settings.burstWindowRadius)) score -= 18;
  score -= Math.max(0, skill.cooldown - 60) / 30;
  return score;
}
