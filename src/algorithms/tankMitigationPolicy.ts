import type { MitigationSkill } from "../types/mitigation";
import type { TankJob } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";
import { isTankbusterEvent, mitigationStackGroup, skillMatchesEvent } from "./scoring";

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

const FREQUENT_SAMPLE_SKILL_BONUS: Record<string, number> = {
  "common-reprisal": 30,
  "common-rampart": 8,
  "pld-bulwark": 12,
  "pld-guardian": 20,
  "pld-sheltron": 36,
  "pld-divine-veil": 22,
  "pld-passage-of-arms": 18,
  "war-damnation": 20,
  "war-thrill-of-battle": 10,
  "drk-the-blackest-night": 36,
  "drk-oblation": 28,
  "drk-dark-missionary": 24,
  "drk-dark-mind": 16,
  "drk-shadowed-vigil": 20,
  "gnb-heart-of-corundum": 34,
  "gnb-aurora": 18,
  "gnb-heart-of-light": 22,
  "gnb-camouflage": 10,
  "gnb-great-nebula": 18,
  "pld-intervention": 30,
  "war-nascent-flash": 28,
  "war-bloodwhetting": 32,
  "war-shake-it-off": 24,
};

const PAIR_SUPPORT_BONUS: Partial<Record<TankJob, Partial<Record<TankJob, Record<string, number>>>>> = {
  DRK: {
    PLD: { "drk-the-blackest-night": 18, "drk-oblation": 14, "pld-sheltron": 12, "pld-intervention": 10 },
    GNB: { "drk-the-blackest-night": 16, "drk-oblation": 12, "gnb-heart-of-corundum": 16, "gnb-aurora": 8 },
    WAR: { "drk-the-blackest-night": 14, "drk-oblation": 10, "war-bloodwhetting": 12, "war-nascent-flash": 14 },
  },
  PLD: {
    DRK: { "pld-sheltron": 14, "pld-intervention": 12, "drk-the-blackest-night": 18, "drk-oblation": 14 },
    GNB: { "pld-sheltron": 10, "gnb-heart-of-corundum": 18, "gnb-aurora": 8 },
    WAR: { "pld-sheltron": 14, "pld-intervention": 24, "war-bloodwhetting": 16, "war-nascent-flash": 18, "war-shake-it-off": 12 },
  },
  WAR: {
    GNB: { "war-bloodwhetting": 14, "war-nascent-flash": 16, "gnb-heart-of-corundum": 16, "gnb-aurora": 8 },
    PLD: { "war-bloodwhetting": 16, "war-nascent-flash": 18, "pld-sheltron": 14, "pld-intervention": 24 },
    DRK: { "war-bloodwhetting": 12, "war-nascent-flash": 14, "drk-the-blackest-night": 14, "drk-oblation": 10 },
  },
  GNB: {
    WAR: { "gnb-heart-of-corundum": 16, "gnb-aurora": 8, "war-bloodwhetting": 14, "war-nascent-flash": 16 },
    PLD: { "gnb-heart-of-corundum": 18, "gnb-aurora": 8, "pld-sheltron": 10, "pld-intervention": 10 },
    DRK: { "gnb-heart-of-corundum": 16, "gnb-aurora": 8, "drk-the-blackest-night": 16, "drk-oblation": 12 },
  },
};

export function sampleInformedSkillBonus(skill: MitigationSkill, event: TimelineEvent, layerIndex: number, ownJob?: TankJob, partnerJob?: TankJob) {
  const group = mitigationStackGroup(skill);
  let bonus = FREQUENT_SAMPLE_SKILL_BONUS[skill.id] ?? 0;
  if (ownJob && partnerJob) bonus += PAIR_SUPPORT_BONUS[ownJob]?.[partnerJob]?.[skill.id] ?? 0;

  if (event.type === "auto") {
    if (group === "shortMit" || group === "supportMit" || skill.category === "target") bonus += 56;
    if (skill.id === "common-reprisal" || skill.category === "party") bonus -= 90;
    if (group === "hardMit") bonus -= 30;
    if (skill.isInvuln) bonus -= 200;
  }

  if (event.type === "aoe" || event.target === "party") {
    if (skill.category === "party") bonus += 66;
    if (skill.id === "common-reprisal") bonus += 58;
    if (skill.damageType === "magical" && event.damageType === "magical") bonus += 18;
    if (skill.category === "personal" || skill.category === "target") bonus -= 20;
    if (skill.isInvuln) bonus -= 300;
  }

  if (isTankbusterEvent(event) || event.target === "MT" || event.target === "ST" || event.target === "bothTanks") {
    if (group === "shortMit" || group === "supportMit" || skill.category === "target") bonus += layerIndex === 0 ? 58 : 28;
    if (group === "hardMit") bonus += layerIndex === 0 ? 8 : 34;
    if (group === "partyMit") bonus -= 18;
  }

  if (skill.id === "common-rampart" && event.severity !== "lethal") bonus -= 18;
  if (skill.id === "common-rampart" && layerIndex > 0 && isTankbusterEvent(event)) bonus += 18;
  if (skill.cooldown >= 180 && event.severity !== "lethal") bonus -= 140;
  if (skill.cooldown >= 90 && event.severity === "medium" && !isTankbusterEvent(event)) bonus -= 45;
  return bonus;
}

export function shouldAllowHardMitStack(event: TimelineEvent) {
  return event.severity === "lethal" || event.type === "spreadTankbuster" || event.type === "sharedTankbuster";
}

export function shouldReserveLongCooldown(skill: MitigationSkill, current: TimelineEvent, start: number, futureEvents: TimelineEvent[]) {
  if (skill.cooldown < 90 || skill.category === "target" || skill.category === "party") return false;
  if (current.severity === "lethal") return false;

  const currentPriority = eventPriority(current);
  return futureEvents.some((event) => {
    if (event.id === current.id || event.time <= current.time) return false;
    if (event.time - start > skill.cooldown) return false;
    if (event.type === "mechanic" || event.type === "roleMechanic" || event.target === "nonTank") return false;
    if (!skillMatchesEvent(skill, event)) return false;
    return eventPriority(event) >= currentPriority + 25 || event.severity === "lethal";
  });
}
