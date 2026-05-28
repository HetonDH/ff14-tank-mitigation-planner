import type { TankJob } from "../types/mitigation";
import { jobNames, jobNamesEn } from "../data/tankJobs";
import type { UiLanguage } from "../types/ui";

export function JobBadge({ job, language = "zh" }: { job: TankJob | "COMMON"; language?: UiLanguage }) {
  const zh = language === "zh";
  return (
    <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
      {job === "COMMON" ? (zh ? "通用" : "Common") : (zh ? jobNames : jobNamesEn)[job]}
    </span>
  );
}
