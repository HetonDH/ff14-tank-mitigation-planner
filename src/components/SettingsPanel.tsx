import type { PlannerSettings, PlayerRole, TankJob } from "../types/mitigation";
import { jobNames } from "../data/tankJobs";
import type { UiLanguage } from "../types/ui";

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

export function SettingsPanel(props: Props) {
  const { settings } = props;
  const zh = props.language === "zh";
  return (
    <section className="tool-panel p-4">
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <div className="grid grid-cols-[56px_1fr_140px_180px_auto] items-end gap-3">
          <div className="pb-2 text-sm font-semibold text-cyan-200">MT</div>
          <label className="text-xs text-slate-400">
            {zh ? "职业" : "Job"}
            <select className="field mt-1 w-full" value={props.mtJob} onChange={(event) => props.onMtJobChange(event.target.value as TankJob)}>
              {jobs.map((job) => <option key={job} value={job}>{jobNames[job]}</option>)}
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
        <div className="grid grid-cols-[56px_1fr_140px_180px_auto] items-end gap-3">
          <div className="pb-2 text-sm font-semibold text-emerald-200">ST</div>
          <label className="text-xs text-slate-400">
            {zh ? "职业" : "Job"}
            <select className="field mt-1 w-full" value={props.stJob} onChange={(event) => props.onStJobChange(event.target.value as TankJob)}>
              {jobs.map((job) => <option key={job} value={job}>{jobNames[job]}</option>)}
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
          <label className="text-xs text-slate-400">
            {zh ? "当前操控" : "Control"}
            <select className="field mt-1 w-full" value={props.playerRole} onChange={(event) => props.onRoleChange(event.target.value as PlayerRole)}>
              <option value="MT">MT</option>
              <option value="ST">ST</option>
            </select>
          </label>
        </div>
        </div>

        <div className="grid grid-cols-[1.2fr_140px_1fr] gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <div className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300">
          <div className="font-semibold text-slate-100">{zh ? "爆发窗口" : "Burst windows"}</div>
          <div className="mt-1 text-slate-400">{zh ? "默认避让 60 秒小爆发、120 秒大爆发/团辅循环" : "Avoids 60s minor bursts and 120s raid buff windows by default"}</div>
        </div>
        <label className="text-xs text-slate-400">
          {zh ? "避让半径" : "Avoid radius"}
          <input className="field mt-1 w-full" type="number" min={0} value={settings.burstWindowRadius} onChange={(event) => props.onSettingsChange({ ...settings, burstWindowRadius: Number(event.target.value) })} />
        </label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.allowInvuln} onChange={(event) => props.onSettingsChange({ ...settings, allowInvuln: event.target.checked })} />{zh ? "允许无敌" : "Allow invuln"}</label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.preferInvulnCheese} onChange={(event) => props.onSettingsChange({ ...settings, preferInvulnCheese: event.target.checked })} />{zh ? "优先无敌逃课" : "Prefer invuln cheese"}</label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.includeAutoAttacks} onChange={(event) => props.onSettingsChange({ ...settings, includeAutoAttacks: event.target.checked })} />{zh ? "考虑平 A" : "Include autos"}</label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.avoidBurstWindows} onChange={(event) => props.onSettingsChange({ ...settings, avoidBurstWindows: event.target.checked })} />{zh ? "避让爆发" : "Avoid burst"}</label>
        </div>
        </div>
      </div>
    </section>
  );
}
