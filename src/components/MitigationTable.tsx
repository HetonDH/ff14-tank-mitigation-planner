import type { MitigationAssignment } from "../types/mitigation";
import { assignmentTargetLabels, sourceLabels } from "../utils/labels";
import { formatTime } from "../utils/time";

interface Props {
  assignments: MitigationAssignment[];
}

export function MitigationTable({ assignments }: Props) {
  return (
    <section className="tool-panel p-4">
      <h2 className="mb-3 text-base font-semibold">减伤结果表</h2>
      <div className="max-h-56 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs text-slate-400">
            <tr>
              <th className="py-2">时间</th>
              <th>技能</th>
              <th>释放者</th>
              <th>目标</th>
              <th>持续</th>
              <th>来源</th>
              <th>提示</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((item) => (
              <tr key={item.id} className={`border-t ${item.warning?.includes("冲突") ? "border-red-400/50 bg-red-500/10 text-red-100" : "border-slate-800"}`}>
                <td className="py-2">{formatTime(item.start)}</td>
                <td>{item.skillName}</td>
                <td>{item.casterRole}</td>
                <td>{assignmentTargetLabels[item.target]}</td>
                <td>{item.duration}s</td>
                <td>{sourceLabels[item.source]}</td>
                <td className="text-amber-300">{item.warning ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!assignments.length && <div className="py-8 text-center text-sm text-slate-500">暂无减伤结果。</div>}
      </div>
    </section>
  );
}
