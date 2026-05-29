import { useState } from "react";
import type { MitigationAssignment, MitigationSkill } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";
import type { UiLanguage } from "../types/ui";
import { findSkill } from "../data/tankJobs";
import { labelsFor } from "../utils/labels";
import { formatTime } from "../utils/time";
import { xivIconUrl } from "../utils/icons";

interface Props {
  language: UiLanguage;
  events: TimelineEvent[];
  assignments: MitigationAssignment[];
  maxTime: number;
  onSelectEvent: (event: TimelineEvent) => void;
  onDropSkill: (skillId: string, start: number) => void;
  onMoveAssignment: (assignmentId: string, start: number) => void;
  onDeleteManual: (assignmentId: string) => void;
  skills: MitigationSkill[];
}

export function TimelineView({ language, events, assignments, maxTime, onSelectEvent, onDropSkill, onMoveAssignment, onDeleteManual }: Props) {
  const zh = language === "zh";
  const { assignmentTargetLabels, eventTypeLabels, timelineTargetLabels } = labelsFor(language);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(10);
  const safeMax = Math.max(maxTime, 180);
  const width = Math.max(900, safeMax * pixelsPerSecond);
  const tickStep = pixelsPerSecond >= 22 ? 1 : pixelsPerSecond >= 12 ? 5 : pixelsPerSecond >= 7 ? 10 : 30;
  const eventLaneTop = 36;
  const eventHeight = 56;
  const eventGap = 16;
  const assignmentHeight = 46;
  const assignmentGap = 7;

  function xFor(time: number) {
    return (time / safeMax) * width;
  }

  function eventClass(event: TimelineEvent) {
    if (event.type === "mechanic") return "border-sky-300/60 bg-sky-400/15 text-sky-50 hover:bg-sky-400/25";
    if (event.type === "auto") return "border-slate-300/60 bg-slate-300/20 text-slate-50 hover:bg-slate-300/30";
    if (event.target === "party" || event.type === "aoe") return "border-yellow-300/70 bg-yellow-400/20 text-yellow-50 hover:bg-yellow-400/30";
    return "border-red-400/70 bg-red-500/20 text-red-50 hover:bg-red-500/30";
  }

  function judgmentLineClass(event: TimelineEvent) {
    if (event.type === "mechanic") return "border-sky-200 text-sky-200";
    if (event.type === "auto") return "border-slate-100 text-slate-100";
    if (event.target === "party" || event.type === "aoe") return "border-yellow-100 text-yellow-100";
    return "border-red-200 text-red-200";
  }

  const eventLaneEnds: number[] = [];
  const eventBlocks = [...events]
    .sort((a, b) => a.time - b.time)
    .map((event) => {
      const left = xFor(event.time);
      const eventWidth = Math.max(event.type === "auto" ? 150 : 132, (event.duration ?? 5) * pixelsPerSecond);
      const lane = eventLaneEnds.findIndex((end) => left > end + 14);
      const laneIndex = lane >= 0 ? lane : eventLaneEnds.length;
      eventLaneEnds[laneIndex] = left + eventWidth;
      return { event, left, width: eventWidth, top: eventLaneTop + laneIndex * (eventHeight + eventGap) };
    });
  const eventLaneCount = Math.max(1, eventLaneEnds.length);

  function buildAssignmentBlocks(role: "MT" | "ST", top: number) {
    const laneEnds: number[] = [];
    const blocks = assignments
      .filter((assignment) => assignment.casterRole === role)
      .sort((a, b) => a.start - b.start)
      .map((assignment) => {
        const left = xFor(assignment.start);
        const blockWidth = Math.max(136, assignment.duration * pixelsPerSecond);
        const lane = laneEnds.findIndex((end) => left > end + 8);
        const laneIndex = lane >= 0 ? lane : laneEnds.length;
        laneEnds[laneIndex] = left + blockWidth;
        return {
          assignment,
          left,
          width: blockWidth,
          top: top + laneIndex * (assignmentHeight + assignmentGap),
        };
      });
    return { blocks, laneCount: Math.max(1, laneEnds.length) };
  }

  const mtLaneTop = eventLaneTop + eventLaneCount * (eventHeight + eventGap) + 22;
  const mtAssignmentLayer = buildAssignmentBlocks("MT", mtLaneTop);
  const stLaneTop = mtLaneTop + mtAssignmentLayer.laneCount * (assignmentHeight + assignmentGap) + 34;
  const stAssignmentLayer = buildAssignmentBlocks("ST", stLaneTop);
  const canvasHeight = stLaneTop + stAssignmentLayer.laneCount * (assignmentHeight + assignmentGap) + 28;
  const assignmentBlocks = [...mtAssignmentLayer.blocks, ...stAssignmentLayer.blocks];

  return (
    <section className="tool-panel flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2">
        <h2 className="text-base font-semibold">{zh ? "减伤时间轴" : "Mitigation timeline"}</h2>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          {zh ? "时间缩放" : "Scale"}
          <input
            type="range"
            min={4}
            max={28}
            value={pixelsPerSecond}
            onChange={(event) => setPixelsPerSecond(Number(event.target.value))}
          />
          <span className="w-16 text-right">{pixelsPerSecond}px/{zh ? "秒" : "s"}</span>
        </label>
      </div>
      <div
        className="relative overflow-auto bg-slate-950"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const payload = event.dataTransfer.getData("text/plain");
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left + event.currentTarget.scrollLeft;
          const start = Math.max(0, Math.round((x / width) * safeMax));
          if (payload.startsWith("move-assignment:")) {
            onMoveAssignment(payload.replace("move-assignment:", ""), start);
          } else {
            onDropSkill(payload, start);
          }
        }}
      >
        <div className="relative" style={{ width, height: canvasHeight }}>
          {Array.from({ length: Math.ceil(safeMax / tickStep) + 1 }).map((_, index) => {
            const time = index * tickStep;
            return (
              <div key={time} className={`absolute top-0 h-full border-l ${time % 30 === 0 ? "border-slate-700" : "border-slate-900"}`} style={{ left: xFor(time) }}>
                <div className="sticky top-0 bg-slate-950 px-1 text-[10px] text-slate-500">{pixelsPerSecond >= 22 || time % 30 === 0 ? formatTime(time) : `${time}s`}</div>
              </div>
            );
          })}
          <div className="absolute left-0 top-[32px] h-px w-full bg-slate-800" />
          <div className="absolute left-0 h-px w-full bg-slate-800" style={{ top: mtLaneTop - 4 }} />
          <div className="absolute left-0 h-px w-full bg-slate-800" style={{ top: stLaneTop - 4 }} />
          <div className="absolute left-3 top-3 text-xs text-slate-500">{zh ? "事件" : "Events"}</div>
          <div className="absolute left-14 text-xs text-cyan-200" style={{ top: mtLaneTop - 26 }}>MT {zh ? "减伤轴" : "mitigation"}</div>
          <div className="absolute left-14 text-xs text-emerald-200" style={{ top: stLaneTop - 26 }}>ST {zh ? "减伤轴" : "mitigation"}</div>

          {eventBlocks.map(({ event, left, top, width: eventWidth }) => (
            <div key={event.id}>
              <div
                className={`pointer-events-none absolute z-20 border-l-2 ${judgmentLineClass(event)}`}
                style={{ left, top: Math.max(0, top - 18), height: eventHeight + 22 }}
              >
                <div className="absolute -left-px top-0 -translate-x-full rounded bg-slate-950/95 px-1 py-0.5 text-[10px] font-semibold shadow-sm">
                  {formatTime(event.time)}
                </div>
              </div>
              <button
                className={`absolute z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] leading-tight ${eventClass(event)}`}
                style={{ left, top, width: eventWidth, height: eventHeight }}
                onClick={() => onSelectEvent(event)}
                title={`${event.name} · ${timelineTargetLabels[event.target]} · ${eventTypeLabels[event.type]} · ${formatTime(event.time)}${event.duration ? `-${formatTime(event.time + event.duration)}` : ""}${event.damage ? ` · ${Math.round(event.damage).toLocaleString()} ${zh ? "伤害" : "damage"}` : ""}${event.notes ? `\n${event.notes}` : ""}`}
              >
                <div className="truncate font-semibold">{event.name}</div>
                <div className="truncate">{timelineTargetLabels[event.target]} · {eventTypeLabels[event.type]}</div>
                <div className="truncate">{event.damage ? `${Math.round(event.damage).toLocaleString()} ${zh ? "伤害" : "damage"}` : ""}</div>
              </button>
            </div>
          ))}

          {assignmentBlocks.map(({ assignment, left, top, width: assignmentWidth }) => (
            (() => {
              const hasConflict = assignment.warning?.includes("冲突") || assignment.warning?.toLowerCase().includes("conflict") || false;
              const skill = findSkill(assignment.skillId);
              const lineTone = assignment.casterRole === "MT" ? "border-cyan-200 text-cyan-100" : "border-emerald-200 text-emerald-100";
              return (
            <div key={assignment.id}>
              <div
                className={`pointer-events-none absolute z-20 border-l-2 ${lineTone}`}
                style={{ left, top: Math.max(0, top - 13), height: assignmentHeight + 15 }}
              >
                <div className="absolute -left-px top-0 -translate-x-full rounded bg-slate-950/95 px-1 py-0.5 text-[10px] font-semibold shadow-sm">
                  {formatTime(assignment.start)}
                </div>
              </div>
            <button
              className={`absolute rounded-md border px-2 py-1 text-left text-[11px] ${hasConflict ? "border-red-400 bg-red-500/30 text-red-50" : assignment.source === "auto" ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-50" : assignment.source === "log" ? "border-violet-400/50 bg-violet-500/15 text-violet-50" : "border-emerald-400/50 bg-emerald-500/15 text-emerald-50"}`}
              style={{ left, top, width: assignmentWidth, height: assignmentHeight }}
              onDoubleClick={() => assignment.source === "manual" && onDeleteManual(assignment.id)}
              draggable={assignment.source === "manual"}
              onDragStart={(event) => {
                if (assignment.source === "manual") {
                  event.dataTransfer.setData("text/plain", `move-assignment:${assignment.id}`);
                }
              }}
              title={`${formatTime(assignment.start)} · ${assignment.source === "manual" ? (zh ? "拖动可调整时间，双击删除手动减伤" : "Drag to adjust time, double-click to delete manual mitigation") : assignment.warning ?? ""}`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {skill?.icon ? <img className="h-6 w-6 shrink-0 rounded border border-white/10" src={xivIconUrl(skill.icon)} alt="" /> : null}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{zh ? assignment.skillName : skill?.enName ?? assignment.skillName}</div>
                  <div className="truncate text-[10px] opacity-85">{formatTime(assignment.start)} · {assignment.casterRole} → {assignmentTargetLabels[assignment.target]}</div>
                </div>
              </div>
            </button>
            </div>
              );
            })()
          ))}
        </div>
      </div>
    </section>
  );
}
