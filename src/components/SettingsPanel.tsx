import type { PlannerSettings, PlayerRole, TankJob } from "../types/mitigation";
import { jobNames, jobNamesEn } from "../data/tankJobs";
import type { UiLanguage } from "../types/ui";
import { jobIconUrls } from "../utils/icons";

interface Props {
  playerRole: PlayerRole;
  mtJob: TankJob;
  stJob: TankJob;
  mtLevel: number;
  stLevel: number;
  mtHp: number;
  stHp: number;
  syncLevels: boolean;
  settings: PlannerSettings;
  language: UiLanguage;
  onRoleChange: (role: PlayerRole) => void;
  onMtJobChange: (job: TankJob) => void;
  onStJobChange: (job: TankJob) => void;
  onMtLevelChange: (level: number) => void;
  onStLevelChange: (level: number) => void;
  onMtHpChange: (hp: number) => void;
  onStHpChange: (hp: number) => void;
  onSyncLevelsChange: (sync: boolean) => void;
  onSettingsChange: (settings: PlannerSettings) => void;
}

const jobs: TankJob[] = ["PLD", "WAR", "DRK", "GNB"];

function JobMarker({ role, job, active, onClick }: { role: PlayerRole; job: TankJob; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border bg-slate-950 shadow-lg transition ${active ? "border-cyan-300 ring-2 ring-cyan-300/40" : "border-slate-700 hover:border-slate-500"}`}
      title={role}
    >
      <span className="absolute text-[11px] font-bold text-slate-500">{job}</span>
      <img className="h-10 w-10 object-contain" src={jobIconUrls[job]} alt="" />
      <span className={`absolute -right-2 -top-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${role === "MT" ? "bg-cyan-400 text-cyan-950" : "bg-emerald-400 text-emerald-950"}`}>{role}</span>
    </button>
  );
}

export function SettingsPanel(props: Props) {
  const { settings } = props;
  const zh = props.language === "zh";
  const jobLabel = zh ? jobNames : jobNamesEn;
  return (
    <section className="tool-panel p-4">
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <div className="relative flex flex-col items-center justify-start pt-5">
          <div className="absolute top-12 h-[92px] w-px bg-gradient-to-b from-cyan-300 via-slate-500 to-emerald-300" />
          <JobMarker role="MT" job={props.mtJob} active={props.playerRole === "MT"} onClick={() => props.onRoleChange("MT")} />
          <div className="h-8" />
          <JobMarker role="ST" job={props.stJob} active={props.playerRole === "ST"} onClick={() => props.onRoleChange("ST")} />
          <div className="mt-2 text-center text-[10px] text-slate-500">{zh ? "当前操控" : "Control"}</div>
        </div>
        <div className="space-y-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <div className="grid grid-cols-[1fr_140px_180px_auto] items-end gap-3">
          <label className="text-xs text-slate-400">
            {zh ? "职业" : "Job"}
            <select className="field mt-1 w-full" value={props.mtJob} onChange={(event) => props.onMtJobChange(event.target.value as TankJob)}>
              {jobs.map((job) => <option key={job} value={job}>{jobLabel[job]}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {zh ? "等级" : "Level"}
            <input className="field mt-1 w-full" type="number" min={1} max={100} value={props.mtLevel} onChange={(event) => props.onMtLevelChange(Number(event.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {zh ? "血量" : "HP"}
            <input className="field mt-1 w-full" type="number" min={1} value={props.mtHp} onChange={(event) => props.onMtHpChange(Number(event.target.value))} />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300">
            <input type="checkbox" checked={props.syncLevels} onChange={(event) => props.onSyncLevelsChange(event.target.checked)} />
            {zh ? "等级同步" : "Sync levels"}
          </label>
        </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <div className="grid grid-cols-[1fr_140px_180px_auto] items-end gap-3">
          <label className="text-xs text-slate-400">
            {zh ? "职业" : "Job"}
            <select className="field mt-1 w-full" value={props.stJob} onChange={(event) => props.onStJobChange(event.target.value as TankJob)}>
              {jobs.map((job) => <option key={job} value={job}>{jobLabel[job]}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {zh ? "等级" : "Level"}
            <input className="field mt-1 w-full" type="number" min={1} max={100} value={props.stLevel} onChange={(event) => props.onStLevelChange(Number(event.target.value))} disabled={props.syncLevels} />
          </label>
          <label className="text-xs text-slate-400">
            {zh ? "血量" : "HP"}
            <input className="field mt-1 w-full" type="number" min={1} value={props.stHp} onChange={(event) => props.onStHpChange(Number(event.target.value))} />
          </label>
          <div className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300">{zh ? "点左侧图标切换操控" : "Click left icon to control"}</div>
        </div>
        </div>

        <div className="grid grid-cols-[1.2fr_130px_130px_1fr] gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <div className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300">
          <div className="font-semibold text-slate-100">{zh ? "爆发窗口" : "Burst windows"}</div>
          <div className="mt-1 text-slate-400">{zh ? "默认避让 60 秒小爆发、120 秒大爆发/团辅循环" : "Avoids 60s minor bursts and 120s raid buff windows by default"}</div>
        </div>
        <label className="text-xs text-slate-400">
          {zh ? "避让半径" : "Avoid radius"}
          <input className="field mt-1 w-full" type="number" min={0} value={settings.burstWindowRadius} onChange={(event) => props.onSettingsChange({ ...settings, burstWindowRadius: Number(event.target.value) })} />
        </label>
        <label className="text-xs text-slate-400">
          {zh ? "判定提前" : "Safety lead"}
          <input className="field mt-1 w-full" type="number" min={0} max={5} step={0.5} value={settings.mitigationSafetyBuffer} onChange={(event) => props.onSettingsChange({ ...settings, mitigationSafetyBuffer: Number(event.target.value) })} />
        </label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.allowInvuln} onChange={(event) => props.onSettingsChange({ ...settings, allowInvuln: event.target.checked })} />{zh ? "允许无敌" : "Allow invuln"}</label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.preferInvulnCheese} onChange={(event) => props.onSettingsChange({ ...settings, preferInvulnCheese: event.target.checked })} />{zh ? "优先无敌逃课" : "Prefer invuln cheese"}</label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.includeAutoAttacks} onChange={(event) => props.onSettingsChange({ ...settings, includeAutoAttacks: event.target.checked })} />{zh ? "考虑平 A" : "Include autos"}</label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.avoidBurstWindows} onChange={(event) => props.onSettingsChange({ ...settings, avoidBurstWindows: event.target.checked })} />{zh ? "避让爆发" : "Avoid burst"}</label>
        </div>
        </div>
      </div>
      </div>
    </section>
  );
}
