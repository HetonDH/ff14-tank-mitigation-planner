import type { MitigationAssignment, PlannerSettings, PlannerWarning, TankJob, PlayerRole } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";

export interface PlannerStateExport {
  version: string;
  events: TimelineEvent[];
  assignments: MitigationAssignment[];
  selectedJobs: {
    playerRole: PlayerRole;
    mainTankJob: TankJob;
    offTankJob: TankJob;
    partnerJob: TankJob;
    mtLevel?: number;
    stLevel?: number;
    mtHp?: number;
    stHp?: number;
  };
  settings: PlannerSettings;
  warnings: PlannerWarning[];
}

export function downloadJson(data: PlannerStateExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ff14-坦克减伤排轴-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<PlannerStateExport> {
  const text = await file.text();
  const parsed = JSON.parse(text) as PlannerStateExport;
  if (!parsed.version || !Array.isArray(parsed.events) || !Array.isArray(parsed.assignments)) {
    throw new Error("JSON 格式不符合排轴导出结构");
  }
  return parsed;
}
