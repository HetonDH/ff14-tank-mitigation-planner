import type { DamageType, MitigationAssignment } from "../types/mitigation";
import type { TimelineEvent, TimelineEventType } from "../types/timeline";
import { labelsFor } from "../utils/labels";
import { formatTime } from "../utils/time";
import type { UiLanguage } from "../types/ui";
import { findSkill } from "../data/tankJobs";

interface Props {
  language: UiLanguage;
  event: TimelineEvent | null;
  assignments: MitigationAssignment[];
  onUpdateEvent: (event: TimelineEvent) => void;
}

export function EventInspector({ language, event, assignments, onUpdateEvent }: Props) {
  const zh = language === "zh";
  const { damageTypeLabels, eventTypeLabels, timelineTargetLabels } = labelsFor(language);
  const eventTypes: TimelineEventType[] = ["mechanic", "auto", "singleTankbuster", "sharedTankbuster", "spreadTankbuster", "aoe"];
  const damageTypes: DamageType[] = ["all", "physical", "magical"];
  const updateType = (nextType: TimelineEventType) => {
    if (!event) return;
    const nextTarget = nextType === "sharedTankbuster" || nextType === "spreadTankbuster"
      ? "bothTanks"
      : nextType === "singleTankbuster" && event.target === "bothTanks"
        ? "MT"
        : event.target;
    onUpdateEvent({ ...event, type: nextType, target: nextTarget });
  };

  return (
    <section className="tool-panel p-4">
      <h2 className="mb-3 text-base font-semibold">{zh ? "详情" : "Details"}</h2>
      {!event ? (
        <div className="text-sm text-slate-500">{zh ? "点击时间轴上的伤害事件查看详情。" : "Click a timeline event to inspect it."}</div>
      ) : (
        <div className="space-y-2 text-sm text-slate-300">
          <div className="text-lg font-semibold text-slate-100">{event.name}</div>
          <div>{zh ? "时间" : "Time"}：{formatTime(event.time)}</div>
          <div>{zh ? "目标" : "Target"}：{timelineTargetLabels[event.target]}</div>
          <label className="block text-xs text-slate-400">
            {zh ? "类型" : "Type"}
            <select
              className="field mt-1 w-full"
              value={event.type}
              onChange={(changeEvent) => updateType(changeEvent.target.value as TimelineEventType)}
            >
              {eventTypes.map((type) => (
                <option key={type} value={type}>{eventTypeLabels[type]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            {zh ? "伤害属性" : "Damage type"}
            <select
              className="field mt-1 w-full"
              value={event.damageType}
              onChange={(changeEvent) => onUpdateEvent({ ...event, damageType: changeEvent.target.value as DamageType })}
            >
              {damageTypes.map((type) => (
                <option key={type} value={type}>{damageTypeLabels[type]}</option>
              ))}
            </select>
          </label>
          {event.damage ? <div>{zh ? "伤害" : "Damage"}：{Math.round(event.damage).toLocaleString()}</div> : null}
          <div>{zh ? "持续" : "Duration"}：{event.duration ?? 0}s</div>
          <div>{zh ? "备注" : "Notes"}：{event.notes ?? (zh ? "无" : "None")}</div>
          <div className="pt-2 text-xs text-slate-400">{zh ? "覆盖减伤" : "Covering mitigations"}：{assignments.filter((item) => item.eventIds.includes(event.id)).map((item) => zh ? item.skillName : findSkill(item.skillId)?.enName ?? item.skillName).join(zh ? "，" : ", ") || (zh ? "暂无" : "None")}</div>
        </div>
      )}
    </section>
  );
}
