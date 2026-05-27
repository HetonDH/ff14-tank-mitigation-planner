import type { MitigationSkill, PlannerSettings } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";
import { inAnyWindow } from "../utils/time";

export function skillMatchesEvent(skill: MitigationSkill, event: TimelineEvent): boolean {
  if (event.type === "mechanic") return false;
  if (skill.damageType !== "all" && skill.damageType !== event.damageType) return false;
  if (skill.category === "party") return event.target === "party" || event.target === "bothTanks";
  if (skill.targeting === "bothTanks") return event.target === "bothTanks";
  if (skill.targeting === "self" || skill.targeting === "selected") return event.target !== "party";
  return true;
}

export function scoreSkillForEvent(skill: MitigationSkill, event: TimelineEvent, start: number, settings: PlannerSettings): number {
  let score = 0;
  if (skill.isInvuln) {
    score += event.severity === "lethal" ? 100 : -100;
    if (settings.preferInvulnCheese && event.type === "tankbuster") score += event.target === "bothTanks" ? 140 : 80;
  }
  if (skill.category === "party" && event.type === "aoe") score += 75;
  if (skill.category === "party" && event.target === "party") score += 55;
  if (skill.category === "party" && event.target === "bothTanks") score += 35;
  if (skill.enName === "Reprisal" && event.type === "aoe") score += 65;
  if (skill.category === "target" && event.type === "aoe") score += 35;
  if (skill.category === "personal" && event.type === "tankbuster") score += 55;
  if (skill.category === "target" && event.type === "tankbuster") score += 48;
  if (event.severity === "high") score += skill.mitigationPercent ?? 8;
  if (event.severity === "lethal") score += (skill.mitigationPercent ?? 10) * 2;
  if (event.type === "auto" && skill.cooldown > 90) score -= 35;
  if (settings.avoidBurstWindows && inAnyWindow(start, settings.burstWindows, settings.burstWindowRadius)) score -= 18;
  score -= Math.max(0, skill.cooldown - 60) / 30;
  return score;
}
