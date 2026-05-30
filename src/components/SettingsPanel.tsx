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

function ToggleRow({ checked, onChange, label, help }: { checked: boolean; onChange: (checked: boolean) => void; label: string; help: string }) {
  return (
    <label className="flex min-h-9 items-center gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <HelpTip text={help} />
    </label>
  );
}

export function SettingsPanel(props: Props) {
  const { settings } = props;
  const zh = props.language === "zh";
  const jobLabel = zh ? jobNames : jobNamesEn;
  return (
    <section className="tool-panel p-2.5">
      <div className="grid grid-cols-[48px_minmax(430px,1fr)_minmax(380px,0.8fr)] gap-2">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-px w-10 bg-gradient-to-r from-cyan-300 to-emerald-300" />
          <div className="flex flex-col gap-2">
            <JobMarker role="MT" job={props.mtJob} active={props.playerRole === "MT"} onClick={() => props.onRoleChange("MT")} />
            <JobMarker role="ST" job={props.stJob} active={props.playerRole === "ST"} onClick={() => props.onRoleChange("ST")} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">{zh ? "双 T 设置" : "Tank setup"}</span>
            <span className="text-slate-500">{zh ? `当前：${props.playerRole}` : `Control: ${props.playerRole}`}</span>
          </div>
          {(["MT", "ST"] as PlayerRole[]).map((role) => {
            const isMt = role === "MT";
            const job = isMt ? props.mtJob : props.stJob;
            return (
              <div key={role} className="mb-1 last:mb-0 grid grid-cols-[42px_minmax(110px,1fr)_64px_96px] items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => props.onRoleChange(role)}
                  className={`h-9 rounded-md border text-xs font-bold ${props.playerRole === role ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300"}`}
                >
                  {role}
                </button>
                <select className="field h-9 w-full px-2 py-1 text-xs" value={job} onChange={(event) => isMt ? props.onMtJobChange(event.target.value as TankJob) : props.onStJobChange(event.target.value as TankJob)}>
                  {jobs.map((item) => <option key={item} value={item}>{jobLabel[item]}</option>)}
                </select>
                <input className="field h-9 w-full px-2 py-1 text-xs" title={zh ? "等级" : "Level"} type="number" min={1} max={100} value={isMt ? props.mtLevel : props.stLevel} disabled={!isMt && props.syncLevels} onChange={(event) => isMt ? props.onMtLevelChange(Number(event.target.value)) : props.onStLevelChange(Number(event.target.value))} />
                <input className="field h-9 w-full px-2 py-1 text-xs" title={zh ? "血量" : "HP"} type="number" min={1} value={isMt ? props.mtHp : props.stHp} onChange={(event) => isMt ? props.onMtHpChange(Number(event.target.value)) : props.onStHpChange(Number(event.target.value))} />
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
          <div className="grid grid-cols-[72px_72px_minmax(0,1fr)] gap-1.5">
            <label className="text-[11px] text-slate-400">
              {zh ? "副本Lv" : "Duty"} <HelpTip text={zh ? "没有导入双 T 信息时，用这个等级过滤技能。" : "Filters skills when tank info was not imported."} />
              <input className="field mt-1 h-8 w-full px-2 py-1 text-xs" type="number" min={1} max={100} value={settings.dutyLevel} onChange={(event) => props.onSettingsChange({ ...settings, dutyLevel: Number(event.target.value) })} />
            </label>
            <label className="text-[11px] text-slate-400">
              {zh ? "提前(s)" : "Lead(s)"} <HelpTip text={zh ? "减伤比伤害判定点提前的秒数，给延迟和服务器结算留缓冲。" : "Seconds before the damage snapshot used as a latency/server buffer."} />
              <input className="field mt-1 h-8 w-full px-2 py-1 text-xs" type="number" min={0} max={5} step={0.5} value={settings.mitigationSafetyBuffer} onChange={(event) => props.onSettingsChange({ ...settings, mitigationSafetyBuffer: Number(event.target.value) })} />
            </label>
            <label className="text-[11px] text-slate-400">
              {zh ? "爆发避让(s)" : "Burst radius(s)"} <HelpTip text={zh ? "开启避让爆发后，尽量避开 60/120 秒爆发点前后这个范围；必要时仍会安排。" : "When enabled, avoids this radius around 60/120s bursts when possible."} />
              <input className="field mt-1 h-8 w-full px-2 py-1 text-xs" type="number" min={0} value={settings.burstWindowRadius} onChange={(event) => props.onSettingsChange({ ...settings, burstWindowRadius: Number(event.target.value) })} />
            </label>
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            <ToggleRow checked={props.syncLevels} onChange={props.onSyncLevelsChange} label={zh ? "同步副本Lv" : "Sync duty"} help={zh ? "只在没有从 FFLogs 识别到等级时使用；不是强制双 T 永远同级。" : "Used when FFLogs did not provide levels; not a permanent forced sync."} />
            <ToggleRow checked={settings.allowInvuln} onChange={(checked) => props.onSettingsChange({ ...settings, allowInvuln: checked })} label={zh ? "允许无敌" : "Invuln"} help={zh ? "允许算法使用无敌处理高危死刑。" : "Allow invulnerability for high-risk tankbusters."} />
            <ToggleRow checked={settings.preferInvulnCheese} onChange={(checked) => props.onSettingsChange({ ...settings, preferInvulnCheese: checked })} label={zh ? "无敌逃课" : "Cheese"} help={zh ? "更积极地用无敌处理可单吃/可逃课机制。" : "Use invulnerability more aggressively for cheeseable mechanics."} />
            <ToggleRow checked={settings.includeAutoAttacks} onChange={(checked) => props.onSettingsChange({ ...settings, includeAutoAttacks: checked })} label={zh ? "考虑平 A" : "Autos"} help={zh ? "把平 A 压力窗口纳入短 CD 规划。" : "Include auto pressure windows in short cooldown planning."} />
            <ToggleRow checked={settings.avoidBurstWindows} onChange={(checked) => props.onSettingsChange({ ...settings, avoidBurstWindows: checked })} label={zh ? "避让爆发" : "Avoid burst"} help={zh ? "默认关闭；开启后尽量避开 60/120 秒爆发附近。" : "Off by default; tries to avoid 60/120s burst windows."} />
            <div className="flex items-center rounded-md border border-slate-800 bg-slate-950/60 px-2 text-[11px] text-slate-500">{zh ? "团减错开固定 15s" : "Party mit gap fixed 15s"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
