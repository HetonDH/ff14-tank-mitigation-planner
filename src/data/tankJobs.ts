import type { MitigationSkill, TankJob } from "../types/mitigation";

export const jobNames: Record<TankJob, string> = {
  PLD: "骑士",
  WAR: "战士",
  DRK: "暗黑骑士",
  GNB: "绝枪战士",
};

export const jobNamesEn: Record<TankJob, string> = {
  PLD: "Paladin",
  WAR: "Warrior",
  DRK: "Dark Knight",
  GNB: "Gunbreaker",
};

export const tankSkills: MitigationSkill[] = [
  { id: "common-rampart", actionId: 7531, job: "COMMON", zhName: "铁壁", enName: "Rampart", icon: "/i/000000/000801.png", category: "personal", cooldown: 90, duration: 20, mitigationPercent: 20, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 8, statusIds: [1191] },
  { id: "common-reprisal", actionId: 7535, job: "COMMON", zhName: "雪仇", enName: "Reprisal", icon: "/i/000000/000806.png", category: "party", cooldown: 60, duration: 15, mitigationPercent: 10, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 22, statusIds: [1193], notes: "对敌人施加降低伤害效果，适合团伤前使用。" },
  { id: "common-arms-length", actionId: 7548, job: "COMMON", zhName: "亲疏自行", enName: "Arm's Length", icon: "/i/000000/000822.png", category: "utility", cooldown: 120, duration: 6, mitigationPercent: null, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 32, notes: "主要用于击退免疫；附带减速更适合小怪或平 A 压力。" },

  { id: "pld-hallowed-ground", actionId: 30, job: "PLD", zhName: "神圣领域", enName: "Hallowed Ground", icon: "/i/002000/002502.png", category: "invuln", cooldown: 420, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 50, statusIds: [82] },
  { id: "pld-bulwark", actionId: 22, job: "PLD", zhName: "壁垒", enName: "Bulwark", icon: "/i/000000/000167.png", category: "personal", cooldown: 90, duration: 10, mitigationPercent: 20, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 52, statusIds: [77], notes: "healerbook 按 20% 近似处理，实际为格挡类减伤。" },
  { id: "pld-sentinel", actionId: 17, job: "PLD", zhName: "预警", enName: "Sentinel", icon: "/i/000000/000164.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38, maxLevel: 91, statusIds: [74], notes: "92 级后升级为极致防御。" },
  { id: "pld-guardian", actionId: 36920, job: "PLD", zhName: "极致防御", enName: "Guardian", icon: "/i/002000/002524.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 40, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 92, statusIds: [3829, 3830], notes: "预警的 92 级升级版，附带护盾效果。" },
  { id: "pld-sheltron", actionId: 25746, job: "PLD", zhName: "圣盾阵", enName: "Sheltron", icon: "/i/002000/002950.png", category: "personal", cooldown: 5, duration: 8, mitigationPercent: 15, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 35, statusIds: [2674, 2675], notes: "消耗誓约槽，冷却按可用性近似处理。" },
  { id: "pld-cover", actionId: 27, job: "PLD", zhName: "保护", enName: "Cover", icon: "/i/000000/000168.png", category: "target", cooldown: 120, duration: 12, mitigationPercent: null, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 45, statusIds: [79], notes: "替目标承受部分攻击，实际可用性受距离与机制判定影响。" },
  { id: "pld-intervention", actionId: 7382, job: "PLD", zhName: "干预", enName: "Intervention", icon: "/i/002000/002512.png", category: "target", cooldown: 10, duration: 8, mitigationPercent: 10, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 62, statusIds: [1174, 2675], notes: "可给搭档 T；若自身带铁壁/极致防御，效果按更高减伤近似。" },
  { id: "pld-divine-veil", actionId: 3540, job: "PLD", zhName: "圣光幕帘", enName: "Divine Veil", icon: "/i/002000/002508.png", category: "party", cooldown: 90, duration: 30, mitigationPercent: null, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 56, statusIds: [1362], notes: "护盾/治疗型团辅，算法先按团减候选处理，不直接折算百分比。" },
  { id: "pld-passage-of-arms", actionId: 7385, job: "PLD", zhName: "武装戍卫", enName: "Passage of Arms", icon: "/i/002000/002515.png", category: "party", cooldown: 120, duration: 5, mitigationPercent: 15, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 70, statusIds: [1176], notes: "healerbook 按 5 秒有效团减处理；需要面向与站位。" },

  { id: "war-thrill-of-battle", actionId: 40, job: "WAR", zhName: "战栗", enName: "Thrill of Battle", icon: "/i/000000/000263.png", category: "utility", cooldown: 90, duration: 10, mitigationPercent: null, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 30, statusIds: [87], notes: "提高最大体力与受治疗量，非百分比减伤。" },
  { id: "war-holmgang", actionId: 43, job: "WAR", zhName: "死斗", enName: "Holmgang", icon: "/i/000000/000266.png", category: "invuln", cooldown: 240, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 42, statusIds: [409] },
  { id: "war-vengeance", actionId: 44, job: "WAR", zhName: "复仇", enName: "Vengeance", icon: "/i/000000/000267.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38, maxLevel: 91, statusIds: [89], notes: "92 级后升级为戮罪。" },
  { id: "war-damnation", actionId: 36923, job: "WAR", zhName: "戮罪", enName: "Damnation", icon: "/i/002000/002573.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 40, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 92, statusIds: [3832], notes: "复仇的 92 级升级版，附带反击与恢复相关效果。" },
  { id: "war-bloodwhetting", actionId: 25751, job: "WAR", zhName: "原初的血气", enName: "Bloodwhetting", icon: "/i/002000/002569.png", category: "personal", cooldown: 25, duration: 8, mitigationPercent: 10, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 82, statusIds: [2678, 2679, 2680] },
  { id: "war-nascent-flash", actionId: 16464, job: "WAR", zhName: "原初的勇猛", enName: "Nascent Flash", icon: "/i/002000/002568.png", category: "target", cooldown: 25, duration: 8, mitigationPercent: 10, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 76, statusIds: [1857, 1858] },
  { id: "war-shake-it-off", actionId: 7388, job: "WAR", zhName: "摆脱", enName: "Shake It Off", icon: "/i/002000/002563.png", category: "party", cooldown: 90, duration: 30, mitigationPercent: null, damageType: "all", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 68, statusIds: [1457, 2108], notes: "护盾/治疗/HoT 型团辅，算法先按团减候选处理，不直接折算百分比。" },

  { id: "drk-dark-mind", actionId: 3634, job: "DRK", zhName: "弃明投暗", enName: "Dark Mind", icon: "/i/003000/003076.png", category: "personal", cooldown: 60, duration: 10, mitigationPercent: 20, damageType: "magical", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 45, statusIds: [746] },
  { id: "drk-living-dead", actionId: 3638, job: "DRK", zhName: "行尸走肉", enName: "Living Dead", icon: "/i/003000/003077.png", category: "invuln", cooldown: 300, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 50, statusIds: [810] },
  { id: "drk-shadow-wall", actionId: 3636, job: "DRK", zhName: "暗影墙", enName: "Shadow Wall", icon: "/i/003000/003079.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38, maxLevel: 91, statusIds: [747], notes: "92 级后升级为暗影卫；100 级副本通常只显示暗影卫。" },
  { id: "drk-the-blackest-night", actionId: 7393, job: "DRK", zhName: "至黑之夜", enName: "The Blackest Night", icon: "/i/003000/003081.png", category: "target", cooldown: 15, duration: 7, mitigationPercent: null, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 70, statusIds: [1178], notes: "护盾量按最大体力比例近似；可给搭档 T。" },
  { id: "drk-oblation", actionId: 25754, job: "DRK", zhName: "献奉", enName: "Oblation", icon: "/i/003000/003089.png", category: "target", cooldown: 60, duration: 10, mitigationPercent: 10, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 82, statusIds: [2682] },
  { id: "drk-dark-missionary", actionId: 16471, job: "DRK", zhName: "暗黑布道", enName: "Dark Missionary", icon: "/i/003000/003087.png", category: "party", cooldown: 90, duration: 15, mitigationPercent: 10, damageType: "magical", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 76, statusIds: [1894] },
  { id: "drk-shadowed-vigil", actionId: 36927, job: "DRK", zhName: "暗影卫", enName: "Shadowed Vigil", icon: "/i/003000/003094.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 40, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 92, statusIds: [3835], notes: "暗影墙的 92 级升级版，附带恢复效果。" },

  { id: "gnb-camouflage", actionId: 16140, job: "GNB", zhName: "伪装", enName: "Camouflage", icon: "/i/003000/003404.png", category: "personal", cooldown: 120, duration: 20, mitigationPercent: 10, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 6, statusIds: [1832], notes: "附带招架率提升，算法按 10% 基础减伤近似。" },
  { id: "gnb-superbolide", actionId: 16152, job: "GNB", zhName: "超火流星", enName: "Superbolide", icon: "/i/003000/003416.png", category: "invuln", cooldown: 360, duration: 10, mitigationPercent: 100, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: true, minLevel: 50, statusIds: [1836] },
  { id: "gnb-nebula", actionId: 16148, job: "GNB", zhName: "星云", enName: "Nebula", icon: "/i/003000/003412.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 30, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 38, maxLevel: 91, statusIds: [1834], notes: "92 级后升级为大星云。" },
  { id: "gnb-heart-of-corundum", actionId: 25758, job: "GNB", zhName: "刚玉之心", enName: "Heart of Corundum", icon: "/i/003000/003430.png", category: "target", cooldown: 25, duration: 8, mitigationPercent: 15, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 82, statusIds: [2683, 2684] },
  { id: "gnb-aurora", actionId: 16151, job: "GNB", zhName: "极光", enName: "Aurora", icon: "/i/003000/003415.png", category: "target", cooldown: 60, duration: 18, mitigationPercent: null, damageType: "all", targeting: "selected", canTargetPartner: true, isInvuln: false, minLevel: 45, statusIds: [1835], notes: "持续治疗，不计入减伤百分比。" },
  { id: "gnb-heart-of-light", actionId: 16160, job: "GNB", zhName: "光之心", enName: "Heart of Light", icon: "/i/003000/003424.png", category: "party", cooldown: 90, duration: 15, mitigationPercent: 10, damageType: "magical", targeting: "party", canTargetPartner: false, isInvuln: false, minLevel: 64, statusIds: [1839] },
  { id: "gnb-great-nebula", actionId: 36935, job: "GNB", zhName: "大星云", enName: "Great Nebula", icon: "/i/003000/003435.png", category: "personal", cooldown: 120, duration: 15, mitigationPercent: 40, damageType: "all", targeting: "self", canTargetPartner: false, isInvuln: false, minLevel: 92, statusIds: [3838], notes: "星云的 92 级升级版。" },
];

export function getSkillsForJob(job: TankJob, dutyLevel = 100) {
  return tankSkills.filter((skill) => (skill.job === "COMMON" || skill.job === job) && skill.minLevel <= dutyLevel && (skill.maxLevel === undefined || dutyLevel <= skill.maxLevel));
}

export function findSkill(skillId: string) {
  return tankSkills.find((skill) => skill.id === skillId);
}
