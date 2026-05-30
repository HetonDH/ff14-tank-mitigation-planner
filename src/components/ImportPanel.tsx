import { Upload } from "lucide-react";
import type { ParseReport, TimelineEvent } from "../types/timeline";
import { formatTime } from "../utils/time";
import { labelsFor } from "../utils/labels";
import type { UiLanguage } from "../types/ui";

interface Props {
  language: UiLanguage;
  fflogsUrl: string;
  logFile: File | null;
  logText: string;
  logEncounterId: string;
  isReadingLog: boolean;
  report: ParseReport | null;
  events: TimelineEvent[];
  onSelectEvent: (event: TimelineEvent) => void;
  onFFLogsUrlChange: (url: string) => void;
  onLogFileChange: (file: File | null) => void;
  onLogTextChange: (text: string) => void;
  onLogEncounterChange: (id: string) => void;
  onImportFFLogsUrl: () => void;
  onImportFFLogsTanks: () => void;
  onReadLog: () => void;
}

export function ImportPanel({ language, fflogsUrl, logFile, logText, logEncounterId, isReadingLog, report, events, onSelectEvent, onFFLogsUrlChange, onLogFileChange, onLogTextChange, onLogEncounterChange, onImportFFLogsUrl, onImportFFLogsTanks, onReadLog }: Props) {
  const zh = language === "zh";
  const { eventTypeLabels, severityLabels, timelineTargetLabels } = labelsFor(language);
  return (
    <section className="tool-panel p-3">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Upload size={16} />{zh ? "导入战斗记录" : "Import fight log"}</h2>
      <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-2">
        <div className="mb-2 text-sm font-semibold text-cyan-100">{zh ? "FFLogs 链接导入" : "FFLogs link import"}</div>
        <input
          className="field w-full"
          value={fflogsUrl}
          onChange={(event) => onFFLogsUrlChange(event.target.value)}
          placeholder="https://www.fflogs.com/reports/ABC123#fight=5"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="btn w-full" onClick={onImportFFLogsUrl} disabled={isReadingLog || !fflogsUrl.trim()}>
            <Upload size={16} />{isReadingLog ? (zh ? "正在导入 FFLogs..." : "Importing FFLogs...") : (zh ? "单独导入时间轴" : "Import timeline only")}
          </button>
          <button className="btn btn-primary w-full" onClick={onImportFFLogsTanks} disabled={isReadingLog || !fflogsUrl.trim()}>
            <Upload size={16} />{isReadingLog ? (zh ? "正在导入 FFLogs..." : "Importing FFLogs...") : (zh ? "导入双 T 信息与减伤" : "Import tanks and mitigation")}
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {zh ? "第一个按钮只生成 boss 伤害时间轴；第二个按钮会额外识别当前战斗的 MT/ST 职业和坦克减伤释放记录。" : "The first button imports boss damage only; the second also imports current MT/ST jobs and tank mitigation casts."}
        </div>
        <div className="mt-3 border-t border-cyan-500/10 pt-2 text-xs font-semibold text-cyan-100">{zh ? "日志文件 / JSON 兜底" : "Log file / JSON fallback"}</div>
        <input className="field w-full" type="file" accept=".json,.txt,.log" onChange={(event) => onLogFileChange(event.target.files?.[0] ?? null)} />
        <textarea
          className="field mt-2 h-14 w-full resize-none text-xs"
          value={logText}
          onChange={(event) => onLogTextChange(event.target.value)}
          placeholder={zh ? "粘贴 FFLogs API JSON，或上传 .json/.txt/.log。本地日志只作为实验兜底。" : "Paste FFLogs API JSON, or upload .json/.txt/.log. Local logs are experimental fallback only."}
        />
        <button className="btn mt-2 w-full" onClick={onReadLog} disabled={isReadingLog || (!logFile && !logText.trim())}>
          <Upload size={16} />{isReadingLog ? (zh ? "正在读取日志..." : "Reading log...") : (zh ? "读取日志生成时间轴" : "Read log timeline")}
        </button>
        {report?.encounters?.length ? (
          <label className="mt-2 block text-xs text-slate-400">
            {zh ? "选择日志片段" : "Log segment"}
            <select className="field mt-1 w-full" value={logEncounterId || report.encounters[0]?.id || ""} onChange={(event) => onLogEncounterChange(event.target.value)}>
              {report.encounters.map((encounter) => (
                <option key={encounter.id} value={encounter.id}>{encounter.label}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="mt-2 text-xs text-slate-400">
          {zh ? "会先按区域和时间间隔拆分日志片段，再按 0.9 秒窗口合并同技能多目标伤害。" : "Splits the log by zone/time gaps, then merges same-skill multi-target hits within 0.9s."}
        </div>
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
      <div className="mt-3 max-h-[180px] overflow-auto">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">{zh ? "事件列表" : "Events"}</h3>
        <div className="space-y-2">
          {events.map((event) => (
            <button key={event.id} className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-left text-xs transition hover:border-cyan-400" onClick={() => onSelectEvent(event)}>
              <div className="flex justify-between text-slate-100"><span>{event.name}</span><span>{formatTime(event.time)}</span></div>
              <div className="mt-1 text-slate-400">{timelineTargetLabels[event.target]} · {eventTypeLabels[event.type]} · {severityLabels[event.severity]}</div>
              {event.targetDamageLabel ? <div className="text-slate-500">{event.targetDamageLabel}</div> : null}
              <div className="text-slate-500">{zh ? "伤害" : "Damage"}：{event.damage ? Math.round(event.damage).toLocaleString() : zh ? "未填写" : "Empty"}</div>
            </button>
          ))}
          {!events.length && <div className="text-sm text-slate-500">{zh ? "尚未读取事件。" : "No events loaded."}</div>}
        </div>
      </div>
    </section>
  );
}
