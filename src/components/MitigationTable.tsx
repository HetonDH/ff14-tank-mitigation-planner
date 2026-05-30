import type { MitigationAssignment } from "../types/mitigation";
import type { UiLanguage } from "../types/ui";
import { findSkill } from "../data/tankJobs";
import { labelsFor } from "../utils/labels";
import { formatTime } from "../utils/time";

interface Props {
  language: UiLanguage;
  assignments: MitigationAssignment[];
}

export function MitigationTable({ language, assignments }: Props) {
  const zh = language === "zh";
  const { assignmentTargetLabels, sourceLabels } = labelsFor(language);
  function targetText(item: MitigationAssignment) {
    if (item.target === "self") return item.casterRole;
    if (item.target === "partner") return item.casterRole === "MT" ? "ST" : "MT";
    return assignmentTargetLabels[item.target];
  }
  return (
    <section className="tool-panel p-4">
      <h2 className="mb-3 text-base font-semibold">{zh ? "减伤结果表" : "Mitigation table"}</h2>
      <div className="max-h-56 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs text-slate-400">
            <tr>
              <th className="py-2">{zh ? "时间" : "Time"}</th>
              <th>{zh ? "技能" : "Skill"}</th>
              <th>{zh ? "释放者" : "Caster"}</th>
              <th>{zh ? "目标" : "Target"}</th>
              <th>{zh ? "持续" : "Duration"}</th>
              <th>{zh ? "来源" : "Source"}</th>
              <th>{zh ? "提示" : "Note"}</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((item) => (
              <tr key={item.id} className={`border-t ${item.warning?.includes("冲突") || item.warning?.toLowerCase().includes("conflict") ? "border-red-400/50 bg-red-500/10 text-red-100" : "border-slate-800"}`}>
                <td className="py-2">{formatTime(item.start)}</td>
                <td>{zh ? item.skillName : findSkill(item.skillId)?.enName ?? item.skillName}</td>
                <td>{item.casterRole}</td>
                <td>{targetText(item)}</td>
                <td>{item.duration}s</td>
                <td>{sourceLabels[item.source]}</td>
                <td className="text-amber-300">{item.warning ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!assignments.length && <div className="py-8 text-center text-sm text-slate-500">{zh ? "暂无减伤结果。" : "No mitigation results yet."}</div>}
      </div>
    </section>
  );
}
