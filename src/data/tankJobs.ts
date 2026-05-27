import type { MitigationSkill, TankJob } from "../types/mitigation";

export const jobNames: Record<TankJob, string> = {
  PLD: "骑士",
  WAR: "战士",
  DRK: "暗黑骑士",
  GNB: "绝枪战士",
};

export const tankSkills: MitigationSkill[] = [
  { id: "common-rampart", job: "COMMON", zhName: "铁壁", enName: "Rampart", category: "personal", cooldown: 90, duration: 20, mitigationPercent: 20, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 8 },
  { id: "common-reprisal", job: "COMMON", zhName: "雪仇", enName: "Reprisal", category: "party", cooldown: 60, duration: 15, mitigationPercent: 10, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 22, notes: "对敌人施加降低伤害效果，适合团伤前使用。" },
  { id: "common-arms-length", job: "COMMON", zhName: "亲疏自行", enName: "Arm's Length", category: "utility", cooldown: 120, duration: 6, mitigationPercent: null, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 32, notes: "主要用于击退免疫；附带减速更适合小怪或平 A 压力。" },

  { id: "pld-hallowed-ground", job: "PLD", zhName: "神圣领域", enName: "Hallowed Ground", category: "invuln", cooldown: 420, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 50 },
  { id: "pld-sentinel", job: "PLD", zhName: "预警", enName: "Sentinel", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38 },
  { id: "pld-sheltron", job: "PLD", zhName: "圣盾阵", enName: "Sheltron", category: "personal", cooldown: 5, duration: 8, mitigationPercent: 15, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 35, notes: "消耗誓约槽，冷却按可用性近似处理。" },
  { id: "pld-cover", job: "PLD", zhName: "保护", enName: "Cover", category: "target", cooldown: 120, duration: 12, mitigationPercent: null, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 45, notes: "替目标承受部分攻击，实际可用性受距离与机制判定影响。" },
  { id: "pld-intervention", job: "PLD", zhName: "干预", enName: "Intervention", category: "target", cooldown: 10, duration: 8, mitigationPercent: 10, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 62, notes: "可给搭档 T，额外效果随自身减伤近似处理。" },
  { id: "pld-divine-veil", job: "PLD", zhName: "圣光幕帘", enName: "Divine Veil", category: "party", cooldown: 90, duration: 30, mitigationPercent: 10, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 56 },
  { id: "pld-passage-of-arms", job: "PLD", zhName: "武装戍卫", enName: "Passage of Arms", category: "party", cooldown: 120, duration: 18, mitigationPercent: 15, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 70, notes: "需要面向与站位，算法仅检查时间覆盖。" },

  { id: "war-holmgang", job: "WAR", zhName: "死斗", enName: "Holmgang", category: "invuln", cooldown: 240, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 42 },
  { id: "war-vengeance", job: "WAR", zhName: "复仇", enName: "Vengeance", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38 },
  { id: "war-bloodwhetting", job: "WAR", zhName: "血气", enName: "Bloodwhetting", category: "personal", cooldown: 25, duration: 8, mitigationPercent: 10, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 82 },
  { id: "war-nascent-flash", job: "WAR", zhName: "原初的勇猛", enName: "Nascent Flash", category: "target", cooldown: 25, duration: 8, mitigationPercent: 10, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 76 },
  { id: "war-shake-it-off", job: "WAR", zhName: "摆脱", enName: "Shake It Off", category: "party", cooldown: 90, duration: 30, mitigationPercent: 15, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 68 },

  { id: "drk-living-dead", job: "DRK", zhName: "行尸走肉", enName: "Living Dead", category: "invuln", cooldown: 300, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 50 },
  { id: "drk-shadow-wall", job: "DRK", zhName: "暗影墙", enName: "Shadow Wall", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38 },
  { id: "drk-the-blackest-night", job: "DRK", zhName: "至黑之夜", enName: "The Blackest Night", category: "target", cooldown: 15, duration: 7, mitigationPercent: 25, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 70, notes: "护盾量按百分比近似。" },
  { id: "drk-oblation", job: "DRK", zhName: "献奉", enName: "Oblation", category: "target", cooldown: 60, duration: 10, mitigationPercent: 10, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 82 },
  { id: "drk-dark-missionary", job: "DRK", zhName: "暗黑布道", enName: "Dark Missionary", category: "party", cooldown: 90, duration: 15, mitigationPercent: 10, damageType: "magical", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 76 },
  { id: "drk-shadowed-vigil", job: "DRK", zhName: "暗影卫", enName: "Shadowed Vigil", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 40, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 92, notes: "TODO 校对 7.4 数值与额外治疗效果。" },

  { id: "gnb-superbolide", job: "GNB", zhName: "超火流星", enName: "Superbolide", category: "invuln", cooldown: 360, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 50 },
  { id: "gnb-nebula", job: "GNB", zhName: "星云", enName: "Nebula", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38 },
  { id: "gnb-heart-of-corundum", job: "GNB", zhName: "刚玉之心", enName: "Heart of Corundum", category: "target", cooldown: 25, duration: 8, mitigationPercent: 15, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 82 },
  { id: "gnb-aurora", job: "GNB", zhName: "极光", enName: "Aurora", category: "target", cooldown: 60, duration: 18, mitigationPercent: null, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 45, notes: "持续治疗，不计入减伤百分比。" },
  { id: "gnb-heart-of-light", job: "GNB", zhName: "光之心", enName: "Heart of Light", category: "party", cooldown: 90, duration: 15, mitigationPercent: 10, damageType: "magical", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 64 },
  { id: "gnb-great-nebula", job: "GNB", zhName: "大星云", enName: "Great Nebula", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 40, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 92, notes: "TODO 校对 7.4 数值与额外效果。" },
];

export function getSkillsForJob(job: TankJob, dutyLevel = 100) {
  return tankSkills.filter((skill) => (skill.job === "COMMON" || skill.job === job) && skill.minLevel <= dutyLevel);
}

export function findSkill(skillId: string) {
  return tankSkills.find((skill) => skill.id === skillId);
}
