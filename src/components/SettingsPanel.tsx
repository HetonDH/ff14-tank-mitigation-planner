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

function HelpTip({ text }: { text: string }) {
  return <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-400" title={text}>?</span>;
}

function JobMarker({ role, job, active, onClick }: { role: PlayerRole; job: TankJob; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950 shadow-lg transition ${active ? "border-cyan-300 ring-2 ring-cyan-300/40" : "border-slate-700 hover:border-slate-500"}`}
      title={role}
    >
      <span className="absolute text-[9px] font-bold text-slate-500">{job}</span>
      <img className="h-8 w-8 object-contain" src={jobIconUrls[job]} alt="" />
      <span className={`absolute -right-2 -top-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${role === "MT" ? "bg-cyan-400 text-cyan-950" : "bg-emerald-400 text-emerald-950"}`}>{role}</span>
    </button>
  );
}

export function SettingsPanel(props: Props) {
  const { settings } = props;
  const zh = props.language === "zh";
  const jobLabel = zh ? jobNames : jobNamesEn;
  return (
    <section className="tool-panel p-3">
      <div className="grid grid-cols-[58px_minmax(0,1fr)_minmax(270px,0.8fr)] gap-2">
        <div className="relative flex flex-col items-center justify-start pt-5">
          <div className="absolute top-10 h-[74px] w-px bg-gradient-to-b from-cyan-300 via-slate-500 to-emerald-300" />
          <JobMarker role="MT" job={props.mtJob} active={props.playerRole === "MT"} onClick={() => props.onRoleChange("MT")} />
          <div className="h-6" />
          <JobMarker role="ST" job={props.stJob} active={props.playerRole === "ST"} onClick={() => props.onRoleChange("ST")} />
          <div className="mt-2 text-center text-[10px] text-slate-500">{zh ? "当前操控" : "Control"}</div>
        </div>
        <div className="space-y-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
        <div className="grid grid-cols-[1fr_86px_130px] items-end gap-3">
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
        </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
        <div className="grid grid-cols-[1fr_86px_130px] items-end gap-3">
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
        </div>
        </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2">
        <label className="text-xs text-slate-400">
          {zh ? "副本等级" : "Duty level"} <HelpTip text={zh ? "没有导入双 T 信息时，可用这个等级过滤技能；勾选同步后 MT/ST 等级跟随副本等级。" : "Used to filter skills when tank info is not imported. Sync makes MT/ST levels follow this duty level."} />
          <input className="field mt-1 w-full" type="number" min={1} max={100} value={settings.dutyLevel} onChange={(event) => props.onSettingsChange({ ...settings, dutyLevel: Number(event.target.value) })} />
        </label>
        <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300">
          <input type="checkbox" checked={props.syncLevels} onChange={(event) => props.onSyncLevelsChange(event.target.checked)} />
          {zh ? "同步副本等级" : "Sync duty level"}
          <HelpTip text={zh ? "只在没有从 FFLogs 识别到玩家等级时使用；不是强制让双 T 永远同级。" : "Used when FFLogs does not provide player levels; it is not a forced permanent MT/ST sync."} />
        </label>
        <label className="text-xs text-slate-400">
          {zh ? "避让半径" : "Avoid radius"} <HelpTip text={zh ? "开启避让爆发后，算法会尽量避开 60/120 秒爆发点前后这个范围；必要时仍会安排并提示。" : "When burst avoidance is enabled, the planner avoids this many seconds around 60/120s burst marks unless coverage requires it."} />
          <input className="field mt-1 w-full" type="number" min={0} value={settings.burstWindowRadius} onChange={(event) => props.onSettingsChange({ ...settings, burstWindowRadius: Number(event.target.value) })} />
          <div className="mt-1 text-[10px] text-slate-500">{zh ? "单位：秒" : "Unit: seconds"}</div>
        </label>
        <label className="text-xs text-slate-400">
          {zh ? "判定提前" : "Safety lead"} <HelpTip text={zh ? "减伤会比伤害判定点提前这段时间，用来给服务器结算和延迟留缓冲。" : "Mitigation is placed this many seconds before the damage snapshot to account for latency and server timing."} />
          <input className="field mt-1 w-full" type="number" min={0} max={5} step={0.5} value={settings.mitigationSafetyBuffer} onChange={(event) => props.onSettingsChange({ ...settings, mitigationSafetyBuffer: Number(event.target.value) })} />
          <div className="mt-1 text-[10px] text-slate-500">{zh ? "单位：秒" : "Unit: seconds"}</div>
        </label>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.allowInvuln} onChange={(event) => props.onSettingsChange({ ...settings, allowInvuln: event.target.checked })} />{zh ? "允许无敌" : "Allow invuln"}<HelpTip text={zh ? "允许算法使用无敌处理高危死刑。" : "Allow invulnerability for high-risk tankbusters."} /></label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.preferInvulnCheese} onChange={(event) => props.onSettingsChange({ ...settings, preferInvulnCheese: event.target.checked })} />{zh ? "优先无敌逃课" : "Prefer invuln"}<HelpTip text={zh ? "更积极地用无敌处理可单吃/可逃课机制。" : "More aggressively use invulnerability for cheeseable mechanics."} /></label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.includeAutoAttacks} onChange={(event) => props.onSettingsChange({ ...settings, includeAutoAttacks: event.target.checked })} />{zh ? "考虑平 A" : "Include autos"}<HelpTip text={zh ? "把平 A 压力窗口也纳入短 CD 减伤规划。" : "Include auto-attack pressure windows in short cooldown planning."} /></label>
          <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2"><input type="checkbox" checked={settings.avoidBurstWindows} onChange={(event) => props.onSettingsChange({ ...settings, avoidBurstWindows: event.target.checked })} />{zh ? "避让爆发" : "Avoid burst"}<HelpTip text={zh ? "默认关闭；开启后尽量避开 60/120 秒爆发附近。" : "Off by default; when enabled, avoids 60/120s burst windows when possible."} /></label>
        </div>
        </div>
      </div>
    </section>
  );
}
