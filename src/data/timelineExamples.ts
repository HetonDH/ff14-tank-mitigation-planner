import type { TimelineEvent } from "../types/timeline";

export const exampleTimeline: TimelineEvent[] = [
  { id: "ex-001", time: 12, name: "首轮平 A", damage: 42000, type: "auto", damageType: "physical", target: "MT", duration: 10, severity: "medium", notes: "连续平 A 压力窗口" },
  { id: "ex-002", time: 28, name: "开场团伤", damage: 68000, type: "aoe", damageType: "magical", target: "party", severity: "medium", notes: "普通魔法团伤" },
  { id: "ex-003", time: 48, name: "MT 死刑", damage: 145000, type: "tankbuster", damageType: "physical", target: "MT", severity: "high", notes: "单体物理死刑" },
  { id: "ex-004", time: 72, name: "双 T 死刑", damage: 132000, type: "tankbuster", damageType: "all", target: "bothTanks", severity: "lethal", notes: "可考虑无敌或双 T 分担减伤" },
  { id: "ex-005", time: 96, name: "魔法团伤", damage: 88000, type: "aoe", damageType: "magical", target: "party", severity: "high", notes: "适合魔法团减" },
  { id: "ex-006", time: 118, name: "平 A 压力", damage: 46000, type: "auto", damageType: "physical", target: "MT", duration: 14, severity: "medium", notes: "不要过度消耗大减伤" },
  { id: "ex-007", time: 144, name: "物理团伤", damage: 78000, type: "aoe", damageType: "physical", target: "party", severity: "medium" },
  { id: "ex-008", time: 176, name: "双 T 连续死刑", damage: 158000, type: "tankbuster", damageType: "physical", target: "bothTanks", severity: "lethal", notes: "高危双 T 处理点" },
];
