import type { DamageType, MitigationAssignment } from "../types/mitigation";
import type { TimelineEvent, TimelineEventType } from "../types/timeline";
import { damageTypeLabels, eventTypeLabels, timelineTargetLabels } from "../utils/labels";
import { formatTime } from "../utils/time";

interface Props {
  event: TimelineEvent | null;
  assignments: MitigationAssignment[];
  onUpdateEvent: (event: TimelineEvent) => void;
}

export function EventInspector({ event, assignments, onUpdateEvent }: Props) {
  const eventTypes: TimelineEventType[] = ["mechanic", "auto", "tankbuster", "aoe"];
  const damageTypes: DamageType[] = ["all", "physical", "magical"];

  return (
    <section className="tool-panel p-4">
      <h2 className="mb-3 text-base font-semibold">详情</h2>
      {!event ? (
        <div className="text-sm text-slate-500">点击时间轴上的伤害事件查看详情。</div>
      ) : (
        <div className="space-y-2 text-sm text-slate-300">
          <div className="text-lg font-semibold text-slate-100">{event.name}</div>
          <div>时间：{formatTime(event.time)}</div>
          <div>目标：{timelineTargetLabels[event.target]}</div>
          <label className="block text-xs text-slate-400">
            类型
            <select
              className="field mt-1 w-full"
              value={event.type}
              onChange={(changeEvent) => onUpdateEvent({ ...event, type: changeEvent.target.value as TimelineEventType })}
            >
              {eventTypes.map((type) => (
                <option key={type} value={type}>{eventTypeLabels[type]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            伤害属性
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
          {event.damage ? <div>伤害：{Math.round(event.damage).toLocaleString()}</div> : null}
          <div>持续：{event.duration ?? 0}s</div>
          <div>备注：{event.notes ?? "无"}</div>
          <div className="pt-2 text-xs text-slate-400">覆盖减伤：{assignments.filter((item) => item.eventIds.includes(event.id)).map((item) => item.skillName).join("，") || "暂无"}</div>
        </div>
      )}
    </section>
  );
}
