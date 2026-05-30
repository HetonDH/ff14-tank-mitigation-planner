import type { MitigationSkill } from "../types/mitigation";
import type { UiLanguage } from "../types/ui";
import { labelsFor } from "../utils/labels";
import { xivIconUrl } from "../utils/icons";
import { JobBadge } from "./JobSelector";

interface Props {
  language: UiLanguage;
  skills: MitigationSkill[];
  activeRole?: string;
  activeJobName?: string;
  onDragSkillStart?: (skillId: string) => void;
  onDragSkillEnd?: () => void;
}

export function SkillPalette({ language, skills, activeRole, activeJobName, onDragSkillStart, onDragSkillEnd }: Props) {
  const zh = language === "zh";
  const { categoryLabels } = labelsFor(language);
  return (
    <section className="tool-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{zh ? "技能池" : "Skill palette"}</h2>
        {activeRole && activeJobName ? <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{activeRole} · {activeJobName}</span> : null}
      </div>
      <div className="space-y-2">
        {skills.map((skill) => (
          <button
            key={skill.id}
            className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-cyan-400 hover:bg-slate-900"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-mitigation-skill", skill.id);
              event.dataTransfer.setData("text/plain", skill.id);
              onDragSkillStart?.(skill.id);
              const ghost = event.currentTarget.cloneNode(true) as HTMLElement;
              ghost.style.position = "fixed";
              ghost.style.left = "-1000px";
              ghost.style.top = "-1000px";
              ghost.style.width = "210px";
              ghost.style.opacity = "0.95";
              ghost.style.pointerEvents = "none";
              document.body.appendChild(ghost);
              event.dataTransfer.setDragImage(ghost, 24, 24);
              window.setTimeout(() => ghost.remove(), 0);
            }}
            onDragEnd={onDragSkillEnd}
            title={skill.notes}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 font-medium text-slate-100">
                {skill.icon ? <img className="h-7 w-7 shrink-0 rounded border border-white/10" src={xivIconUrl(skill.icon)} alt="" /> : null}
                <span className="truncate">{zh ? skill.zhName : skill.enName}</span>
              </span>
              <JobBadge job={skill.job} language={language} />
            </div>
            <div className="mt-1 text-xs text-slate-400">{zh ? "冷却" : "Cooldown"} {skill.cooldown}s · {zh ? "持续" : "Duration"} {skill.duration}s · {categoryLabels[skill.category]}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
