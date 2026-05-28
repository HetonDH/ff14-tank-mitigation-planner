import { FileSpreadsheet, Upload } from "lucide-react";
import type { ParseReport, TimelineEvent } from "../types/timeline";
import { formatTime } from "../utils/time";
import { labelsFor } from "../utils/labels";
import type { UiLanguage } from "../types/ui";

interface Props {
  language: UiLanguage;
  file: File | null;
  report: ParseReport | null;
  events: TimelineEvent[];
  onFileChange: (file: File | null) => void;
  onRead: () => void;
  onUseExample: () => void;
}

export function ImportPanel({ language, file, report, events, onFileChange, onRead, onUseExample }: Props) {
  const zh = language === "zh";
  const { eventTypeLabels, severityLabels, timelineTargetLabels } = labelsFor(language);
  return (
    <section className="tool-panel p-4">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><FileSpreadsheet size={18} />{zh ? "导入时间轴" : "Import timeline"}</h2>
      <input className="field w-full" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary flex-1" onClick={onRead} disabled={!file}><Upload size={16} />{zh ? "读取时间轴" : "Read timeline"}</button>
        <button className="btn flex-1" onClick={onUseExample}>{zh ? "使用示例时间轴" : "Use example"}</button>
      </div>
      {report && (
        <div className="mt-4 space-y-2 rounded-md border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-300">
          <div>{zh ? "文件名" : "File"}：{report.fileName}</div>
          <div>{zh ? "读取事件" : "Events"}：{report.eventCount}{zh ? " 条" : ""}</div>
          <div>{zh ? "使用 sheet" : "Sheet"}：{report.sheetName}</div>
          <div>{zh ? "识别列" : "Columns"}：{report.recognizedColumns.length ? report.recognizedColumns.join(zh ? "，" : ", ") : zh ? "未识别" : "None"}</div>
          <div>{zh ? "跳过行" : "Skipped rows"}：{report.skippedRows.length ? report.skippedRows.map((row) => zh ? `${row.row} 行 ${row.reason}` : `Row ${row.row}: ${row.reason}`).join(zh ? "；" : "; ") : zh ? "无" : "None"}</div>
        </div>
      )}
      <div className="mt-4 max-h-[520px] overflow-auto">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">{zh ? "事件列表" : "Events"}</h3>
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-md border border-slate-800 bg-slate-950 p-2 text-xs">
              <div className="flex justify-between text-slate-100"><span>{event.name}</span><span>{formatTime(event.time)}</span></div>
              <div className="mt-1 text-slate-400">{timelineTargetLabels[event.target]} · {eventTypeLabels[event.type]} · {severityLabels[event.severity]}</div>
              <div className="text-slate-500">{zh ? "伤害" : "Damage"}：{event.damage ? Math.round(event.damage).toLocaleString() : zh ? "未填写" : "Empty"}</div>
            </div>
          ))}
          {!events.length && <div className="text-sm text-slate-500">{zh ? "尚未读取事件。" : "No events loaded."}</div>}
        </div>
      </div>
    </section>
  );
}
