import type { TimelineEvent } from "../types/timeline";
import type { UiLanguage } from "../types/ui";
import { labelsFor } from "../utils/labels";
import { formatTime } from "../utils/time";

interface Props {
  language: UiLanguage;
  events: TimelineEvent[];
  onSelectEvent: (event: TimelineEvent) => void;
}

export function EventList({ language, events, onSelectEvent }: Props) {
  const zh = language === "zh";
  const { eventTypeLabels, severityLabels, timelineTargetLabels } = labelsFor(language);
  return (
    <section className="tool-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{zh ? "事件列表" : "Events"}</h2>
        <span className="text-xs text-slate-500">{events.length}{zh ? " 条" : " events"}</span>
      </div>
      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-auto">
        {events.map((event) => (
          <button key={event.id} className="rounded-md border border-slate-800 bg-slate-950 p-2 text-left text-xs transition hover:border-cyan-400" onClick={() => onSelectEvent(event)}>
            <div className="flex justify-between gap-3 text-slate-100">
              <span className="truncate">{event.name}</span>
              <span className="shrink-0">{formatTime(event.time)}</span>
            </div>
            <div className="mt-1 text-slate-400">{timelineTargetLabels[event.target]} · {eventTypeLabels[event.type]} · {severityLabels[event.severity]}</div>
            {event.targetDamageLabel ? <div className="mt-0.5 truncate text-slate-500">{event.targetDamageLabel}</div> : null}
          </button>
        ))}
        {!events.length && <div className="col-span-2 py-6 text-center text-sm text-slate-500">{zh ? "尚未读取事件。" : "No events loaded."}</div>}
      </div>
    </section>
  );
}
