import { FileSpreadsheet, Upload } from "lucide-react";
import type { ParseReport, TimelineEvent } from "../types/timeline";
import { formatTime } from "../utils/time";
import { eventTypeLabels, severityLabels, timelineTargetLabels } from "../utils/labels";

interface Props {
  file: File | null;
  report: ParseReport | null;
  events: TimelineEvent[];
  onFileChange: (file: File | null) => void;
  onRead: () => void;
  onUseExample: () => void;
}

export function ImportPanel({ file, report, events, onFileChange, onRead, onUseExample }: Props) {
  return (
    <section className="tool-panel p-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><FileSpreadsheet size={18} />导入时间轴</h2>
      <input className="field w-full" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary flex-1" onClick={onRead} disabled={!file}><Upload size={16} />读取时间轴</button>
        <button className="btn flex-1" onClick={onUseExample}>使用示例时间轴</button>
      </div>
      {report && (
        <div className="mt-4 space-y-2 rounded-md border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-300">
          <div>文件名：{report.fileName}</div>
          <div>读取事件：{report.eventCount} 条</div>
          <div>使用 sheet：{report.sheetName}</div>
          <div>识别列：{report.recognizedColumns.length ? report.recognizedColumns.join("，") : "未识别"}</div>
          <div>跳过行：{report.skippedRows.length ? report.skippedRows.map((row) => `${row.row} 行 ${row.reason}`).join("；") : "无"}</div>
        </div>
      )}
      <div className="mt-4 max-h-[520px] overflow-auto">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">事件列表</h3>
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-md border border-slate-800 bg-slate-950 p-2 text-xs">
              <div className="flex justify-between text-slate-100"><span>{event.name}</span><span>{formatTime(event.time)}</span></div>
              <div className="mt-1 text-slate-400">{timelineTargetLabels[event.target]} · {eventTypeLabels[event.type]} · {severityLabels[event.severity]}</div>
              <div className="text-slate-500">伤害：{event.damage ? Math.round(event.damage).toLocaleString() : "未填写"}</div>
            </div>
          ))}
          {!events.length && <div className="text-sm text-slate-500">尚未读取事件。</div>}
        </div>
      </div>
    </section>
  );
}
