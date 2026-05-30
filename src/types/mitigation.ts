export type TankJob = "PLD" | "WAR" | "DRK" | "GNB";
export type SkillJob = TankJob | "COMMON";
export type PlayerRole = "MT" | "ST";
export type SkillCategory = "personal" | "party" | "target" | "invuln" | "utility";
export type DamageType = "all" | "physical" | "magical";
export type SkillTargeting = "self" | "partner" | "party" | "bothTanks" | "selected";
export type AssignmentSource = "auto" | "manual" | "log";
export type AssignmentTarget = "self" | "partner" | "MT" | "ST" | "party" | "bothTanks";

export interface MitigationSkill {
  id: string;
  actionId?: number;
  job: SkillJob;
  zhName: string;
  enName: string;
  icon?: string;
  category: SkillCategory;
  cooldown: number;
  duration: number;
  mitigationPercent: number | null;
  damageType: DamageType;
  targeting: SkillTargeting;
  canTargetPartner: boolean;
  isInvuln: boolean;
  minLevel: number;
  maxLevel?: number;
  statusIds?: number[];
  trackGroup?: number;
  resourceCost?: number;
  resourceType?: "pldOath";
  notes?: string;
}

export interface PlannerSettings {
  allowInvuln: boolean;
  includeAutoAttacks: boolean;
  avoidBurstWindows: boolean;
  preferInvulnCheese: boolean;
  burstWindows: number[];
  burstWindowRadius: number;
  partyMitigationSpacing: number;
  dutyLevel: number;
  mitigationSafetyBuffer: number;
  language?: "zh" | "en";
}

export interface MitigationAssignment {
  id: string;
  skillId: string;
  skillName: string;
  casterRole: PlayerRole;
  casterJob: TankJob | "COMMON";
  target: AssignmentTarget;
  start: number;
  end: number;
  duration: number;
  eventIds: string[];
  source: AssignmentSource;
  warning?: string;
}

export interface PlannerWarning {
  id: string;
  level: "info" | "warning" | "danger";
  message: string;
  eventId?: string;
  assignmentId?: string;
}

export interface PlannerSummary {
  eventCount: number;
  coveredEventCount: number;
  assignmentCount: number;
  highRiskCount: number;
  notes: string[];
}

export interface PlannerResult {
  assignments: MitigationAssignment[];
  warnings: PlannerWarning[];
  summary: PlannerSummary;
}
