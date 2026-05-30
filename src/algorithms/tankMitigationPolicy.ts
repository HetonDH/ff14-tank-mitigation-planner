import type { MitigationSkill } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";
import { isTankbusterEvent, mitigationStackGroup } from "./scoring";

export function eventPriority(event: TimelineEvent) {
  if (event.type === "mechanic" || event.type === "roleMechanic" || event.target === "nonTank") return 0;
  if (event.severity === "lethal" && isTankbusterEvent(event)) return 120;
  if (event.severity === "high" && isTankbusterEvent(event)) return 100;
  if (isTankbusterEvent(event)) return 90;
  if (event.type === "aoe" && event.severity === "high") return 76;
  if (event.type === "aoe") return 68;
  if (event.type === "auto") return 35;
  return event.severity === "high" ? 55 : 40;
}

export function sampleInformedSkillBonus(skill: MitigationSkill, event: TimelineEvent, layerIndex: number) {
  const group = mitigationStackGroup(skill);
  let bonus = 0;

  if (event.type === "auto") {
    if (group === "shortMit" || group === "supportMit" || skill.category === "target") bonus += 48;
    if (group === "hardMit") bonus -= 30;
    if (skill.isInvuln) bonus -= 200;
  }

  if (event.type === "aoe" || event.target === "party") {
    if (skill.category === "party") bonus += 58;
    if (skill.id === "common-reprisal") bonus += 44;
    if (skill.category === "personal" || skill.category === "target") bonus -= 20;
    if (skill.isInvuln) bonus -= 300;
  }

  if (isTankbusterEvent(event) || event.target === "MT" || event.target === "ST" || event.target === "bothTanks") {
    if (group === "shortMit" || group === "supportMit" || skill.category === "target") bonus += layerIndex === 0 ? 44 : 22;
    if (group === "hardMit") bonus += layerIndex === 0 ? 18 : 34;
    if (group === "partyMit") bonus -= 18;
  }

  if (skill.cooldown >= 180 && event.severity !== "lethal") bonus -= 140;
  if (skill.cooldown >= 90 && event.severity === "medium" && !isTankbusterEvent(event)) bonus -= 45;
  return bonus;
}

export function shouldAllowHardMitStack(event: TimelineEvent) {
  return event.severity === "lethal" || event.type === "spreadTankbuster" || event.type === "sharedTankbuster";
}
