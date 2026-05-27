import type { AssignmentSource, AssignmentTarget, DamageType, SkillCategory } from "../types/mitigation";
import type { TimelineEvent, TimelineEventType, TimelineTarget } from "../types/timeline";

export const damageTypeLabels: Record<DamageType, string> = {
  all: "全类型",
  physical: "物理",
  magical: "魔法",
};

export const eventTypeLabels: Record<TimelineEventType, string> = {
  mechanic: "机制",
  auto: "平 A",
  tankbuster: "死刑",
  aoe: "AOE",
};

export const timelineTargetLabels: Record<TimelineTarget, string> = {
  MT: "MT",
  ST: "ST",
  bothTanks: "双 T",
  party: "全体",
  self: "自己",
};

export const assignmentTargetLabels: Record<AssignmentTarget, string> = {
  self: "自己",
  partner: "搭档",
  MT: "MT",
  ST: "ST",
  party: "全队",
  bothTanks: "双 T",
};

export const categoryLabels: Record<SkillCategory, string> = {
  personal: "自身减伤",
  party: "团队减伤",
  target: "单体支援",
  invuln: "无敌",
  utility: "功能技能",
};

export const severityLabels: Record<TimelineEvent["severity"], string> = {
  low: "普通",
  medium: "中等",
  high: "危险",
  lethal: "致命",
};

export const sourceLabels: Record<AssignmentSource, string> = {
  auto: "自动",
  manual: "手动",
};
