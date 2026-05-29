import { useMemo, useRef, useState } from "react";
import { BookOpen, Download, Eraser, Sparkles, Upload } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { EventInspector } from "./components/EventInspector";
import { ImportPanel } from "./components/ImportPanel";
import { MitigationTable } from "./components/MitigationTable";
import { SettingsPanel } from "./components/SettingsPanel";
import { SkillPalette } from "./components/SkillPalette";
import { TimelineView } from "./components/TimelineView";
import { WarningPanel } from "./components/WarningPanel";
import { TutorialModal } from "./components/TutorialModal";
import { findSkill, getSkillsForJob, jobNames, jobNamesEn } from "./data/tankJobs";
import { planMitigations } from "./algorithms/mitigationPlanner";
import type { AssignmentTarget, MitigationAssignment, PlannerSettings, PlannerWarning, PlayerRole, TankJob } from "./types/mitigation";
import type { ParseReport, TimelineEvent } from "./types/timeline";
import { parseFFLogsFile, parseFFLogsText } from "./utils/parseFFLogs";
import { importFFLogsReportUrl } from "./utils/fflogsReport";
import { downloadJson, readJsonFile } from "./utils/exportImport";
import type { UiLanguage } from "./types/ui";

const initialSettings: PlannerSettings = {
  allowInvuln: true,
  includeAutoAttacks: true,
  avoidBurstWindows: true,
  preferInvulnCheese: false,
  burstWindows: [60, 120, 180, 240],
  burstWindowRadius: 8,
  partyMitigationSpacing: 15,
  dutyLevel: 100,
  mitigationSafetyBuffer: 2,
};

function App() {
  const [fflogsUrl, setFflogsUrl] = useState("");
  const [logFile, setLogFile] = useState<File | null>(null);
  const [logText, setLogText] = useState("");
  const [logEncounterId, setLogEncounterId] = useState("");
  const [isReadingLog, setIsReadingLog] = useState(false);
  const [report, setReport] = useState<ParseReport | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [autoAssignments, setAutoAssignments] = useState<MitigationAssignment[]>([]);
  const [manualAssignments, setManualAssignments] = useState<MitigationAssignment[]>([]);
  const [warnings, setWarnings] = useState<PlannerWarning[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [playerRole, setPlayerRole] = useState<PlayerRole>("MT");
  const [mainTankJob, setMainTankJob] = useState<TankJob>("PLD");
  const [offTankJob, setOffTankJob] = useState<TankJob>("WAR");
  const [mtLevel, setMtLevel] = useState(100);
  const [stLevel, setStLevel] = useState(100);
  const [syncLevels, setSyncLevels] = useState(true);
  const [mtHp, setMtHp] = useState(280000);
  const [stHp, setStHp] = useState(280000);
  const [settings, setSettings] = useState<PlannerSettings>(initialSettings);
  const [language, setLanguage] = useState<UiLanguage>("zh");
  const [showTutorial, setShowTutorial] = useState(false);
  const importJsonRef = useRef<HTMLInputElement>(null);

  const manualJob = playerRole === "MT" ? mainTankJob : offTankJob;
  const manualLevel = playerRole === "MT" ? mtLevel : stLevel;
  const skills = useMemo(() => getSkillsForJob(manualJob, manualLevel), [manualJob, manualLevel]);
  const assignments = useMemo(() => [...autoAssignments, ...manualAssignments].sort((a, b) => a.start - b.start), [autoAssignments, manualAssignments]);
  const maxTime = useMemo(() => Math.max(180, ...events.map((event) => event.time + (event.duration ?? 0)), ...assignments.map((item) => item.end)) + 20, [events, assignments]);

  async function readLogTimeline(encounterId = logEncounterId) {
    setIsReadingLog(true);
    try {
      const parsed = logFile
        ? await parseFFLogsFile(logFile, encounterId || undefined)
        : parseFFLogsText(logText, "粘贴日志", encounterId || undefined);
      const firstEncounterId = parsed.report.encounters?.[0]?.id ?? "";
      if (!encounterId && firstEncounterId) setLogEncounterId(firstEncounterId);
      setEvents(parsed.events);
      setReport(parsed.report);
      setAutoAssignments([]);
      setManualAssignments([]);
      setWarnings([]);
      setSelectedEvent(null);
    } finally {
      setIsReadingLog(false);
    }
  }

  async function importFFLogsUrlTimeline() {
    setIsReadingLog(true);
    try {
      const parsed = await importFFLogsReportUrl(fflogsUrl);
      setEvents(parsed.events);
      setReport(parsed.report);
      setLogEncounterId("");
      setAutoAssignments([]);
      setManualAssignments([]);
      setWarnings([]);
      setSelectedEvent(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : language === "zh" ? "FFLogs 导入失败。" : "FFLogs import failed.";
      setReport({
        fileName: "FFLogs 报告链接",
        eventCount: 0,
        sheetName: "FFLogs",
        recognizedColumns: ["reportCode", "fightId"],
        skippedRows: [{ row: 0, reason: message }],
      });
    } finally {
      setIsReadingLog(false);
    }
  }

  async function selectLogEncounter(encounterId: string) {
    setLogEncounterId(encounterId);
    await readLogTimeline(encounterId);
  }

  function generatePlan() {
    const result = planMitigations({
      events,
      mainTankJob,
      offTankJob,
      mainTankLevel: mtLevel,
      offTankLevel: stLevel,
      mainTankHp: mtHp,
      offTankHp: stHp,
      playerRole,
      partnerJob: offTankJob,
      settings: { ...settings, language },
    });
    setAutoAssignments(result.assignments);
    setWarnings(result.warnings);
  }

  function addManualSkill(skillId: string, start: number) {
    const skill = findSkill(skillId);
    if (!skill) return;
    const target = skill.canTargetPartner
      ? (window.prompt(language === "zh" ? "请选择目标：自己 / MT / ST / 全队" : "Choose target: Self / MT / ST / Party", language === "zh" ? "自己" : "Self") ?? (language === "zh" ? "自己" : "Self"))
      : skill.targeting === "party"
        ? (language === "zh" ? "全队" : "Party")
        : (language === "zh" ? "自己" : "Self");
    const normalizedTarget: AssignmentTarget = target.includes("MT") ? "MT" : target.includes("ST") ? "ST" : target.includes("全队") || target.toLowerCase().includes("party") ? "party" : "self";
    const cdConflict = manualAssignments.concat(autoAssignments).some((item) => item.skillId === skill.id && Math.abs(item.start - start) < skill.cooldown);
    const id = `manual-${skill.id}-${Date.now()}`;
    const assignment: MitigationAssignment = {
      id,
      skillId: skill.id,
      skillName: skill.zhName,
      casterRole: playerRole,
      casterJob: manualJob,
      target: normalizedTarget,
      start,
      end: start + skill.duration,
      duration: skill.duration,
      eventIds: events.filter((event) => start <= event.time && start + skill.duration >= event.time).map((event) => event.id),
      source: "manual",
      warning: cdConflict ? (language === "zh" ? "与已有同技能 CD 冲突，已按你的手动操作保留。" : "Cooldown conflict with an existing use of the same skill; manual placement was kept.") : undefined,
    };
    setManualAssignments((current) => [...current, assignment]);
    if (cdConflict) {
      setWarnings((current) => [...current, { id: `warn-${id}`, level: "warning", assignmentId: id, message: language === "zh" ? `${skill.zhName} 在 ${start}s 手动添加时检测到 CD 冲突，已允许继续。` : `${skill.enName} was manually added at ${start}s with a cooldown conflict; it was kept.` }]);
    }
  }

  function moveManualAssignment(assignmentId: string, start: number) {
    setManualAssignments((current) =>
      current.map((assignment) => {
        if (assignment.id !== assignmentId) return assignment;
        const skill = findSkill(assignment.skillId);
        const conflict = current
          .concat(autoAssignments)
          .some((item) => item.id !== assignment.id && item.skillId === assignment.skillId && Math.abs(item.start - start) < (skill?.cooldown ?? assignment.duration));
        return {
          ...assignment,
          start,
          end: start + assignment.duration,
          eventIds: events.filter((event) => start <= event.time && start + assignment.duration >= event.time).map((event) => event.id),
          warning: conflict ? (language === "zh" ? "拖动后可能与已有同技能安排冲突，请检查 CD。" : "This move may conflict with another use of the same skill. Check cooldowns.") : assignment.warning,
        };
      }),
    );
  }

  function updateEvent(nextEvent: TimelineEvent) {
    setEvents((current) => current.map((event) => (event.id === nextEvent.id ? nextEvent : event)));
    setSelectedEvent(nextEvent);
    setAutoAssignments([]);
  }

  function exportJson() {
    downloadJson({
      version: "0.1.0",
      events,
      assignments,
      selectedJobs: { playerRole, mainTankJob, offTankJob, partnerJob: offTankJob, mtLevel, stLevel, mtHp, stHp },
      settings: { ...settings, language },
      warnings,
    });
  }

  async function importJson(fileToImport: File | null) {
    if (!fileToImport) return;
    const data = await readJsonFile(fileToImport);
    setEvents(data.events);
    setAutoAssignments(data.assignments.filter((item) => item.source === "auto"));
    setManualAssignments(data.assignments.filter((item) => item.source === "manual"));
    setPlayerRole(data.selectedJobs.playerRole);
    setMainTankJob(data.selectedJobs.mainTankJob);
    setOffTankJob(data.selectedJobs.offTankJob);
    setMtLevel(data.selectedJobs.mtLevel ?? data.settings.dutyLevel ?? 100);
    setStLevel(data.selectedJobs.stLevel ?? data.settings.dutyLevel ?? 100);
    setMtHp(data.selectedJobs.mtHp ?? 280000);
    setStHp(data.selectedJobs.stHp ?? 280000);
    setSettings({ ...initialSettings, ...data.settings, partyMitigationSpacing: 15, burstWindows: data.settings.burstWindows?.length ? data.settings.burstWindows : initialSettings.burstWindows });
    if (data.settings.language === "zh" || data.settings.language === "en") setLanguage(data.settings.language);
    setWarnings(data.warnings);
    setReport({ fileName: language === "zh" ? "导入 JSON" : "Imported JSON", eventCount: data.events.length, sheetName: "JSON", recognizedColumns: ["events", "assignments", "selectedJobs", "settings", "warnings"], skippedRows: [] });
  }

  return (
    <>
    <AppShell
      language={language}
      actions={
        <>
          <button className="btn" onClick={() => setShowTutorial(true)}><BookOpen size={16} />{language === "zh" ? "新手教程" : "Guide"}</button>
          <button className="btn" onClick={() => setLanguage((current) => current === "zh" ? "en" : "zh")}>{language === "zh" ? "English" : "中文"}</button>
          <button className="btn btn-primary" onClick={generatePlan} disabled={!events.length}><Sparkles size={16} />{language === "zh" ? "一键生成最佳减伤" : "Generate best plan"}</button>
          <button className="btn" onClick={() => setAutoAssignments([])}><Eraser size={16} />{language === "zh" ? "清空自动排轴" : "Clear auto plan"}</button>
          <button className="btn" onClick={() => setManualAssignments([])}><Eraser size={16} />{language === "zh" ? "清空手动排轴" : "Clear manual plan"}</button>
          <button className="btn" onClick={exportJson}><Download size={16} />{language === "zh" ? "导出 JSON" : "Export JSON"}</button>
          <button className="btn" onClick={() => importJsonRef.current?.click()}><Upload size={16} />{language === "zh" ? "导入 JSON" : "Import JSON"}</button>
          <input ref={importJsonRef} className="hidden" type="file" accept=".json" onChange={(event) => importJson(event.target.files?.[0] ?? null)} />
        </>
      }
      settings={
        <SettingsPanel
          playerRole={playerRole}
          mtJob={mainTankJob}
          stJob={offTankJob}
          mtLevel={mtLevel}
          stLevel={stLevel}
          mtHp={mtHp}
          stHp={stHp}
          syncLevels={syncLevels}
          settings={settings}
          language={language}
          onRoleChange={setPlayerRole}
          onMtJobChange={(job) => { setMainTankJob(job); setAutoAssignments([]); }}
          onStJobChange={(job) => { setOffTankJob(job); setAutoAssignments([]); }}
          onMtLevelChange={(level) => { setMtLevel(level); if (syncLevels) setStLevel(level); setSettings((current) => ({ ...current, dutyLevel: level })); setAutoAssignments([]); }}
          onStLevelChange={(level) => { setStLevel(level); setAutoAssignments([]); }}
          onMtHpChange={(hp) => { setMtHp(hp); setAutoAssignments([]); }}
          onStHpChange={(hp) => { setStHp(hp); setAutoAssignments([]); }}
          onSyncLevelsChange={(sync) => { setSyncLevels(sync); if (sync) setStLevel(mtLevel); setAutoAssignments([]); }}
          onSettingsChange={(next) => { setSettings(next); setAutoAssignments([]); }}
        />
      }
      left={<ImportPanel language={language} fflogsUrl={fflogsUrl} logFile={logFile} logText={logText} logEncounterId={logEncounterId} isReadingLog={isReadingLog} report={report} events={events} onFFLogsUrlChange={setFflogsUrl} onLogFileChange={(nextFile) => { setLogFile(nextFile); setLogEncounterId(""); }} onLogTextChange={(text) => { setLogText(text); setLogEncounterId(""); }} onLogEncounterChange={selectLogEncounter} onImportFFLogsUrl={importFFLogsUrlTimeline} onReadLog={() => readLogTimeline()} />}
      center={
        <div className="space-y-3">
          <TimelineView language={language} events={events} assignments={assignments} maxTime={maxTime} onSelectEvent={setSelectedEvent} onDropSkill={addManualSkill} onMoveAssignment={moveManualAssignment} onDeleteManual={(id) => setManualAssignments((current) => current.filter((item) => item.id !== id))} skills={skills} />
          <div className="grid grid-cols-2 gap-3">
            <MitigationTable language={language} assignments={assignments} />
            <WarningPanel language={language} warnings={warnings} />
          </div>
        </div>
      }
      right={<><SkillPalette language={language} skills={skills} activeRole={playerRole} activeJobName={(language === "zh" ? jobNames : jobNamesEn)[manualJob]} /><EventInspector language={language} event={selectedEvent} assignments={assignments} onUpdateEvent={updateEvent} /></>}
    />
    {showTutorial ? <TutorialModal language={language} onClose={() => setShowTutorial(false)} /> : null}
    </>
  );
}

export default App;
