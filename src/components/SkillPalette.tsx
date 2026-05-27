import type { MitigationSkill } from "../types/mitigation";
import { categoryLabels } from "../utils/labels";
import { JobBadge } from "./JobSelector";

interface Props {
  skills: MitigationSkill[];
  activeRole?: string;
  activeJobName?: string;
}

export function SkillPalette({ skills, activeRole, activeJobName }: Props) {
  return (
    <section className="tool-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">技能池</h2>
        {activeRole && activeJobName ? <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{activeRole} · {activeJobName}</span> : null}
      </div>
      <div className="space-y-2">
        {skills.map((skill) => (
          <button
            key={skill.id}
            className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-cyan-400 hover:bg-slate-900"
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", skill.id)}
            title={skill.notes}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-100">{skill.zhName}</span>
              <JobBadge job={skill.job} />
            </div>
            <div className="mt-1 text-xs text-slate-400">冷却 {skill.cooldown}s · 持续 {skill.duration}s · {categoryLabels[skill.category]}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
