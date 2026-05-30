import { useState } from "react";
import { FileText, Link2, Upload } from "lucide-react";
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
  const [tab, setTab] = useState<"fflogs" | "local">("fflogs");
  return (
    <section className="tool-panel p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Upload size={15} />{zh ? "战斗记录" : "Fight log"}</h2>
        <div className="flex rounded-md border border-slate-700 bg-slate-950 p-0.5 text-xs">
          <button className={`flex items-center gap-1 rounded px-2 py-1 ${tab === "fflogs" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-400"}`} onClick={() => setTab("fflogs")} type="button"><Link2 size={13} />FFLogs</button>
          <button className={`flex items-center gap-1 rounded px-2 py-1 ${tab === "local" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-400"}`} onClick={() => setTab("local")} type="button"><FileText size={13} />{zh ? "本地" : "Local"}</button>
        </div>
      </div>
      <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-2">
        {tab === "fflogs" ? (
          <>
            <input
              className="field h-9 w-full px-2 py-1 text-xs"
              value={fflogsUrl}
              onChange={(event) => onFFLogsUrlChange(event.target.value)}
              placeholder="https://www.fflogs.com/reports/ABC123#fight=5"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn h-9 w-full px-2 py-1 text-xs" onClick={onImportFFLogsUrl} disabled={isReadingLog || !fflogsUrl.trim()}>
                <Upload size={14} />{isReadingLog ? (zh ? "导入中..." : "Importing...") : (zh ? "只导入时间轴" : "Timeline only")}
              </button>
              <button className="btn btn-primary h-9 w-full px-2 py-1 text-xs" onClick={onImportFFLogsTanks} disabled={isReadingLog || !fflogsUrl.trim()}>
                <Upload size={14} />{isReadingLog ? (zh ? "导入中..." : "Importing...") : (zh ? "导入双 T/减伤" : "Tanks + mit")}
              </button>
            </div>
            <div className="mt-1.5 text-[11px] leading-4 text-slate-400">
              {zh ? "推荐入口。第二个按钮会额外识别 MT/ST 职业、等级、血量和已释放的坦克减伤。" : "Recommended. The second button also imports MT/ST jobs, levels, HP, and tank mitigation casts."}
            </div>
          </>
        ) : (
          <>
            <input className="field h-9 w-full px-2 py-1 text-xs" type="file" accept=".json,.txt,.log" onChange={(event) => onLogFileChange(event.target.files?.[0] ?? null)} />
            <textarea
              className="field mt-2 h-12 w-full resize-none px-2 py-1 text-xs"
              value={logText}
              onChange={(event) => onLogTextChange(event.target.value)}
              placeholder={zh ? "粘贴 FFLogs API JSON，或上传 .json/.txt/.log。" : "Paste FFLogs API JSON, or upload .json/.txt/.log."}
            />
            <button className="btn mt-2 h-9 w-full px-2 py-1 text-xs" onClick={onReadLog} disabled={isReadingLog || (!logFile && !logText.trim())}>
              <Upload size={14} />{isReadingLog ? (zh ? "读取中..." : "Reading...") : (zh ? "读取日志生成时间轴" : "Read log timeline")}
            </button>
            {report?.encounters?.length ? (
              <label className="mt-2 block text-xs text-slate-400">
                {zh ? "日志片段" : "Segment"}
                <select className="field mt-1 h-8 w-full px-2 py-1 text-xs" value={logEncounterId || report.encounters[0]?.id || ""} onChange={(event) => onLogEncounterChange(event.target.value)}>
                  {report.encounters.map((encounter) => (
                    <option key={encounter.id} value={encounter.id}>{encounter.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="mt-1.5 text-[11px] leading-4 text-slate-400">
              {zh ? "本地日志仍是兜底入口，正式测试优先用 FFLogs 链接。" : "Local logs are still a fallback; prefer FFLogs links for testing."}
            </div>
          </>
        )}
      </div>
      {report && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-slate-700 bg-slate-950/70 p-2 text-[11px] text-slate-300">
          <div className="truncate">{zh ? "来源" : "Source"}：{report.fileName}</div>
          <div>{zh ? "事件" : "Events"}：{report.eventCount}{zh ? " 条" : ""}</div>
          <div className="truncate">{zh ? "数据" : "Data"}：{report.sheetName}</div>
          <div className="truncate">{zh ? "字段" : "Columns"}：{report.recognizedColumns.length ? report.recognizedColumns.join(zh ? "，" : ", ") : zh ? "未识别" : "None"}</div>
          <div className="col-span-2 truncate">{zh ? "跳过" : "Skipped"}：{report.skippedRows.length ? report.skippedRows.slice(0, 3).map((row) => zh ? `${row.row} 行 ${row.reason}` : `Row ${row.row}: ${row.reason}`).join(zh ? "；" : "; ") : zh ? "无" : "None"}</div>
        </div>
      )}
      <div className="mt-2 max-h-[150px] overflow-auto">
        <div className="mb-1 text-xs font-semibold text-slate-300">{zh ? "事件列表" : "Events"}</div>
        <div className="space-y-1.5">
          {events.map((event) => (
            <button key={event.id} className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-left text-[11px] transition hover:border-cyan-400" onClick={() => onSelectEvent(event)}>
              <div className="flex justify-between text-slate-100"><span>{event.name}</span><span>{formatTime(event.time)}</span></div>
              <div className="mt-1 text-slate-400">{timelineTargetLabels[event.target]} · {eventTypeLabels[event.type]} · {severityLabels[event.severity]}</div>
              {event.targetDamageLabel ? <div className="text-slate-500">{event.targetDamageLabel}</div> : null}
            </button>
          ))}
          {!events.length && <div className="text-sm text-slate-500">{zh ? "尚未读取事件。" : "No events loaded."}</div>}
        </div>
      </div>
    </section>
  );
}
