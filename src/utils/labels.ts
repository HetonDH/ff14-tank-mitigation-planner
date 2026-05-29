import type { AssignmentSource, AssignmentTarget, DamageType, SkillCategory } from "../types/mitigation";
import type { TimelineEvent, TimelineEventType, TimelineTarget } from "../types/timeline";
import type { UiLanguage } from "../types/ui";

export const damageTypeLabelsZh: Record<DamageType, string> = {
  all: "全类型",
  physical: "物理",
  magical: "魔法",
};

export const damageTypeLabelsEn: Record<DamageType, string> = {
  all: "All",
  physical: "Physical",
  magical: "Magical",
};

export const eventTypeLabelsZh: Record<TimelineEventType, string> = {
  mechanic: "机制",
  auto: "平 A",
  singleTankbuster: "单体死刑",
  sharedTankbuster: "双 T 分摊死刑",
  spreadTankbuster: "双 T 分散死刑",
  aoe: "AOE",
};

export const eventTypeLabelsEn: Record<TimelineEventType, string> = {
  mechanic: "Mechanic",
  auto: "Auto",
  singleTankbuster: "Single buster",
  sharedTankbuster: "Shared tank buster",
  spreadTankbuster: "Split tank buster",
  aoe: "AOE",
};

export const timelineTargetLabelsZh: Record<TimelineTarget, string> = {
  MT: "MT",
  ST: "ST",
  bothTanks: "双 T",
  party: "全体",
  self: "自己",
};

export const timelineTargetLabelsEn: Record<TimelineTarget, string> = {
  MT: "MT",
  ST: "ST",
  bothTanks: "Both tanks",
  party: "Party",
  self: "Self",
};

export const assignmentTargetLabelsZh: Record<AssignmentTarget, string> = {
  self: "自己",
  partner: "搭档",
  MT: "MT",
  ST: "ST",
  party: "全队",
  bothTanks: "双 T",
};

export const assignmentTargetLabelsEn: Record<AssignmentTarget, string> = {
  self: "Self",
  partner: "Partner",
  MT: "MT",
  ST: "ST",
  party: "Party",
  bothTanks: "Both tanks",
};

export const categoryLabelsZh: Record<SkillCategory, string> = {
  personal: "自身减伤",
  party: "团队减伤",
  target: "单体支援",
  invuln: "无敌",
  utility: "功能技能",
};

export const categoryLabelsEn: Record<SkillCategory, string> = {
  personal: "Personal",
  party: "Party mitigation",
  target: "Target support",
  invuln: "Invulnerability",
  utility: "Utility",
};

export const severityLabelsZh: Record<TimelineEvent["severity"], string> = {
  low: "普通",
  medium: "中等",
  high: "危险",
  lethal: "致命",
};

export const severityLabelsEn: Record<TimelineEvent["severity"], string> = {
  low: "Normal",
  medium: "Medium",
  high: "Danger",
  lethal: "Lethal",
};

export const sourceLabelsZh: Record<AssignmentSource, string> = {
  auto: "自动",
  manual: "手动",
  log: "日志",
};

export const sourceLabelsEn: Record<AssignmentSource, string> = {
  auto: "Auto",
  manual: "Manual",
  log: "Log",
};

export function labelsFor(language: UiLanguage) {
  return {
    damageTypeLabels: language === "zh" ? damageTypeLabelsZh : damageTypeLabelsEn,
    eventTypeLabels: language === "zh" ? eventTypeLabelsZh : eventTypeLabelsEn,
    timelineTargetLabels: language === "zh" ? timelineTargetLabelsZh : timelineTargetLabelsEn,
    assignmentTargetLabels: language === "zh" ? assignmentTargetLabelsZh : assignmentTargetLabelsEn,
    categoryLabels: language === "zh" ? categoryLabelsZh : categoryLabelsEn,
    severityLabels: language === "zh" ? severityLabelsZh : severityLabelsEn,
    sourceLabels: language === "zh" ? sourceLabelsZh : sourceLabelsEn,
  };
}

export const damageTypeLabels = damageTypeLabelsZh;
export const eventTypeLabels = eventTypeLabelsZh;
export const timelineTargetLabels = timelineTargetLabelsZh;
export const assignmentTargetLabels = assignmentTargetLabelsZh;
export const categoryLabels = categoryLabelsZh;
export const severityLabels = severityLabelsZh;
export const sourceLabels = sourceLabelsZh;
