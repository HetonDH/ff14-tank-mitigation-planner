import type { DamageType } from "./mitigation";

export type TimelineTarget = "MT" | "ST" | "bothTanks" | "party" | "self";
export type TimelineEventType = "mechanic" | "auto" | "singleTankbuster" | "sharedTankbuster" | "spreadTankbuster" | "singleDamage" | "roleMechanic" | "aoe";

export interface TimelineEvent {
  id: string;
  time: number;
  name: string;
  damage?: number;
  targetDamageLabel?: string;
  type: TimelineEventType;
  damageType: DamageType;
  target: TimelineTarget;
  duration?: number;
  notes?: string;
  targetNames?: string[];
  severity: "low" | "medium" | "high" | "lethal";
  source?: "spreadsheet" | "fflogs" | "localLog" | "example" | "json";
  sourceId?: string;
  sourceRow?: number;
}

export interface SkippedRow {
  row: number;
  reason: string;
  raw?: unknown;
}

export interface ParseReport {
  fileName: string;
  eventCount: number;
  sheetName: string;
  recognizedColumns: string[];
  skippedRows: SkippedRow[];
  encounters?: LogEncounterOption[];
}

export interface LogEncounterOption {
  id: string;
  label: string;
  zoneName: string;
  startTime: string;
  endTime: string;
  duration: number;
  eventCount: number;
}
