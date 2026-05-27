import type { TankJob } from "../types/mitigation";
import { jobNames } from "../data/tankJobs";

export function JobBadge({ job }: { job: TankJob | "COMMON" }) {
  return (
    <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
      {job === "COMMON" ? "通用" : jobNames[job]}
    </span>
  );
}
