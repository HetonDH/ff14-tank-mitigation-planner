import { findSkill, tankSkills } from "../data/tankJobs";
import type { ParseReport, TimelineEvent, TimelineEventType, TimelineTarget } from "../types/timeline";
import type { DamageType, MitigationAssignment, PlayerRole, TankJob } from "../types/mitigation";
import { parseFFLogsJson } from "./parseFFLogs";

export interface ParsedFFLogsUrl {
  reportCode: string | null;
  fightId: number | null;
  isLastFight: boolean;
  region: "cn" | "www";
}

export interface ImportedTankInfo {
  mtJob: TankJob;
  stJob: TankJob;
  mtName: string;
  stName: string;
  mtLevel?: number;
  stLevel?: number;
  mtHp?: number;
  stHp?: number;
}

export interface FFLogsTankMitigationImport {
  events: TimelineEvent[];
  assignments: MitigationAssignment[];
  tankInfo: ImportedTankInfo | null;
  report: ParseReport;
}

const TANK_JOB_BY_LOG_TYPE: Record<string, TankJob> = {
  paladin: "PLD",
  gladiator: "PLD",
  warrior: "WAR",
  marauder: "WAR",
  darkknight: "DRK",
  "dark knight": "DRK",
  gunbreaker: "GNB",
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function normalizeJob(value: unknown): TankJob | null {
  const spaced = String(value ?? "").trim().toLowerCase();
  const compact = spaced.replace(/\s+/g, "");
  return TANK_JOB_BY_LOG_TYPE[compact] ?? TANK_JOB_BY_LOG_TYPE[spaced] ?? null;
}

export function parseFFLogsUrl(input: string): ParsedFFLogsUrl {
  const text = input.trim();
  let reportCode: string | null = null;
  let fightId: number | null = null;
  let isLastFight = false;
  let region: "cn" | "www" = "cn";

  try {
    const parsedUrl = new URL(text);
    if (parsedUrl.hostname.startsWith("www.")) region = "www";
  } catch {
    // 纯报告代码默认按国服区域尝试，代理会再 fallback 到国际区。
  }

  const reportMatch = text.match(/reports\/(a:[a-zA-Z0-9]+|[a-zA-Z0-9]+)/);
  if (reportMatch) {
    reportCode = reportMatch[1];
  } else {
    const codeMatch = text.match(/^(a:[a-zA-Z0-9]+|[a-zA-Z0-9]+)(?:[#?]|$)/);
    if (codeMatch && !/^https?:\/\//i.test(text)) reportCode = codeMatch[1];
  }

  const fightMatch = text.match(/[#?&]fight=(\d+|last)/);
  if (fightMatch?.[1] === "last") {
    isLastFight = true;
  } else if (fightMatch?.[1]) {
    fightId = Number(fightMatch[1]);
  } else if (reportCode) {
    isLastFight = true;
  }

  return { reportCode, fightId, isLastFight, region };
}

function mapImportedTimelineType(type: string | undefined): TimelineEventType {
  if (type === "auto") return "auto";
  if (type === "tankbuster") return "singleTankbuster";
  if (type === "partial_aoe" || type === "partial_final_aoe" || type === "aoe") return "aoe";
  return "aoe";
}

function mapImportedTimelineTarget(event: Record<string, unknown>, type: TimelineEventType): TimelineTarget {
  const details = Array.isArray(event.playerDamageDetails) ? event.playerDamageDetails : [];
  if (type === "aoe") return "party";
  if (details.length >= 2) return "bothTanks";
  return "MT";
}

function mapImportedTimelineDamageType(value: unknown): DamageType {
  if (value === "physical" || value === "magical" || value === "all") return value;
  return "all";
}

function timelineFromImportedPayload(payload: unknown): { events: TimelineEvent[]; report: ParseReport } | null {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const damageEvents = Array.isArray(root.damageEvents) ? root.damageEvents : null;
  if (!damageEvents) return null;

  const events: TimelineEvent[] = damageEvents.map((raw, index): TimelineEvent => {
    const event = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const type = mapImportedTimelineType(String(event.type ?? ""));
    const time = Number(event.time ?? event.timestamp ?? 0);
    const damage = Number(event.damage ?? 0);
    const severity: TimelineEvent["severity"] = type === "auto" ? "medium" : type === "aoe" ? "medium" : "high";
    return {
      id: `fflogs-report-${String(event.id ?? index)}`,
      time: Number.isFinite(time) ? time : 0,
      name: String(event.name ?? event.actionName ?? "未知技能"),
      damage: damage > 0 ? damage : undefined,
      targetDamageLabel: mapImportedTimelineTarget(event, type) === "party" ? "对全体的伤害" : undefined,
      type,
      damageType: mapImportedTimelineDamageType(event.damageType),
      target: mapImportedTimelineTarget(event, type),
      severity,
      source: "fflogs",
      sourceId: String(event.abilityId ?? event.actionId ?? event.packetId ?? ""),
      notes: "通过 FFLogs 标准事件流导入。",
    };
  }).sort((a, b) => a.time - b.time);

  return {
    events,
    report: {
      fileName: String(root.name ?? root.title ?? "FFLogs 报告"),
      eventCount: events.length,
      sheetName: String(root.encounter && typeof root.encounter === "object" ? (root.encounter as Record<string, unknown>).displayName ?? (root.encounter as Record<string, unknown>).name ?? "FFLogs damageEvents" : "FFLogs damageEvents"),
      recognizedColumns: ["damageEvents", "time", "name", "type", "damage", "playerDamageDetails"],
      skippedRows: [],
    },
  };
}

async function fetchFFLogsPayload(url: string): Promise<unknown> {
  const parsed = parseFFLogsUrl(url);
  if (!parsed.reportCode) throw new Error("无法识别 FFLogs 链接，请使用 reports 链接或报告代码。");

  const proxyBase = (import.meta.env.VITE_FFLOGS_PROXY_BASE ?? "/api").replace(/\/+$/, "");
  const params = new URLSearchParams({ reportCode: parsed.reportCode });
  params.set("region", parsed.region);
  if (!parsed.isLastFight && parsed.fightId !== null) params.set("fightId", String(parsed.fightId));
  const response = await fetch(`${proxyBase}/fflogs/import?${params.toString()}`);
  if (!response.ok) throw new Error(`FFLogs 导入失败：HTTP ${response.status}`);
  return response.json();
}

export async function importFFLogsReportUrl(url: string): Promise<{ events: TimelineEvent[]; report: ParseReport }> {
  const payload = await fetchFFLogsPayload(url);
  return timelineFromImportedPayload(payload) ?? parseFFLogsJson(payload);
}

function abilityIdOf(event: Record<string, unknown>) {
  const ability = toRecord(event.ability);
  return Number(event.abilityGameID ?? event.abilityID ?? ability.gameID ?? ability.id ?? 0);
}

function eventDamage(event: Record<string, unknown>) {
  return Number(event.unmitigatedAmount ?? event.amount ?? 0) || 0;
}

function actorMaxHpFromEvents(events: Record<string, unknown>[], actorId: number) {
  let maxHp = 0;
  for (const event of events) {
    const targetResources = toRecord(event.targetResources);
    const sourceResources = toRecord(event.sourceResources);
    if (Number(event.targetID) === actorId) maxHp = Math.max(maxHp, Number(targetResources.maxHitPoints ?? event.maxHitPoints ?? 0) || 0);
    if (Number(event.sourceID) === actorId) maxHp = Math.max(maxHp, Number(sourceResources.maxHitPoints ?? 0) || 0);
  }
  return maxHp || undefined;
}

function actorLevelFromEvents(events: Record<string, unknown>[], actorId: number) {
  for (const event of events) {
    if (Number(event.sourceID) !== actorId && Number(event.targetID) !== actorId) continue;
    const level = Number(event.level ?? toRecord(event.sourceResources).level ?? toRecord(event.targetResources).level ?? 0);
    if (level > 0) return level;
  }
  return undefined;
}

function relativeSeconds(timestamp: unknown, fightStartTime: number) {
  return Math.max(0, Math.round((Number(timestamp) - fightStartTime) / 10) / 100);
}

function assignmentTargetFor(skillId: string, casterRole: PlayerRole, targetRole: PlayerRole | null): MitigationAssignment["target"] {
  const skill = findSkill(skillId);
  if (!skill) return "self";
  if (skill.targeting === "party") return "party";
  if (skill.targeting === "bothTanks") return "bothTanks";
  if (skill.canTargetPartner && targetRole) return targetRole;
  if (skill.targeting === "selected" && targetRole) return targetRole;
  return targetRole && targetRole !== casterRole ? targetRole : "self";
}

function parseFFLogsTankMitigations(payload: unknown, timeline: { events: TimelineEvent[]; report: ParseReport }): FFLogsTankMitigationImport {
  const root = toRecord(payload);
  const events = Array.isArray(root.events) ? root.events.map(toRecord) : [];
  const actors = Array.isArray(root.actors) ? root.actors.map(toRecord) : [];
  const fightStartTime = Number(root.fightStartTime ?? events[0]?.timestamp ?? 0) || 0;
  const tankActors = actors
    .map((actor) => ({ actor, job: normalizeJob(actor.subType ?? actor.type) }))
    .filter((item): item is { actor: Record<string, unknown>; job: TankJob } => Boolean(item.job));
  const tankIds = new Set(tankActors.map((item) => Number(item.actor.id)));
  const damageTakenByTank = new Map<number, { hits: number; damage: number }>();

  for (const event of events) {
    if (event.type !== "damage" && event.type !== "calculateddamage") continue;
    const targetId = Number(event.targetID);
    if (!tankIds.has(targetId)) continue;
    const current = damageTakenByTank.get(targetId) ?? { hits: 0, damage: 0 };
    current.hits += 1;
    current.damage += eventDamage(event);
    damageTakenByTank.set(targetId, current);
  }

  const mitigationCastSourceIds = new Set<number>();
  const knownSkillActionIds = new Set(tankSkills.map((skill) => skill.actionId).filter((id): id is number => Boolean(id)));
  for (const event of events) {
    if (event.type === "cast" && knownSkillActionIds.has(abilityIdOf(event))) {
      mitigationCastSourceIds.add(Number(event.sourceID));
    }
  }

  const activeTankActors = tankActors.filter((item) => {
    const actorId = Number(item.actor.id);
    return damageTakenByTank.has(actorId) || mitigationCastSourceIds.has(actorId) || Boolean(actorMaxHpFromEvents(events, actorId));
  });
  const orderedTanks = [...(activeTankActors.length >= 2 ? activeTankActors : tankActors)].sort((a, b) => {
    const aStats = damageTakenByTank.get(Number(a.actor.id)) ?? { hits: 0, damage: 0 };
    const bStats = damageTakenByTank.get(Number(b.actor.id)) ?? { hits: 0, damage: 0 };
    return bStats.hits - aStats.hits || bStats.damage - aStats.damage;
  });
  const mt = orderedTanks[0] ?? tankActors[0];
  const st = orderedTanks[1] ?? tankActors.find((item) => item !== mt);
  const roleByActorId = new Map<number, PlayerRole>();
  if (mt) roleByActorId.set(Number(mt.actor.id), "MT");
  if (st) roleByActorId.set(Number(st.actor.id), "ST");

  const skillByActionId = new Map(tankSkills.filter((skill) => skill.actionId).map((skill) => [skill.actionId, skill]));
  const importedAssignments: MitigationAssignment[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (event.type !== "cast") continue;
    const sourceId = Number(event.sourceID);
    const casterRole = roleByActorId.get(sourceId);
    if (!casterRole) continue;
    const skill = skillByActionId.get(abilityIdOf(event));
    if (!skill) continue;
    const targetRole = roleByActorId.get(Number(event.targetID)) ?? null;
    const start = relativeSeconds(event.timestamp, fightStartTime);
    const key = `${sourceId}:${skill.id}:${Math.round(start * 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    importedAssignments.push({
      id: `log-${sourceId}-${skill.id}-${Math.round(start * 1000)}`,
      skillId: skill.id,
      skillName: skill.zhName,
      casterRole,
      casterJob: skill.job === "COMMON" ? (casterRole === "MT" ? mt?.job : st?.job) ?? "COMMON" : skill.job,
      target: assignmentTargetFor(skill.id, casterRole, targetRole),
      start,
      end: start + skill.duration,
      duration: skill.duration,
      eventIds: timeline.events.filter((timelineEvent) => start <= timelineEvent.time && start + skill.duration >= timelineEvent.time).map((timelineEvent) => timelineEvent.id),
      source: "log",
    });
  }

  const mtActorId = mt ? Number(mt.actor.id) : 0;
  const stActorId = st ? Number(st.actor.id) : 0;
  const tankInfo = mt && st
    ? {
      mtJob: mt.job,
      stJob: st.job,
      mtName: String(mt.actor.name ?? "MT"),
      stName: String(st.actor.name ?? "ST"),
      mtLevel: Number(mt.actor.level) || actorLevelFromEvents(events, mtActorId),
      stLevel: Number(st.actor.level) || actorLevelFromEvents(events, stActorId),
      mtHp: actorMaxHpFromEvents(events, mtActorId),
      stHp: actorMaxHpFromEvents(events, stActorId),
    }
    : null;

  const mtName = tankInfo?.mtName;
  const stName = tankInfo?.stName;
  const eventsWithTankTargets = timeline.events.map((event) => {
    const names = event.targetNames ?? [];
    const hitsMt = Boolean(mtName && names.includes(mtName));
    const hitsSt = Boolean(stName && names.includes(stName));
    const target = hitsMt && hitsSt ? "bothTanks" : hitsMt ? "MT" : hitsSt ? "ST" : event.target;
    return {
      ...event,
      target,
      targetDamageLabel: names.length ? `对 ${names.map((name) => name === mtName ? `MT ${name}` : name === stName ? `ST ${name}` : name).join("、")} 的伤害` : event.targetDamageLabel,
    };
  });

  return {
    events: eventsWithTankTargets,
    assignments: importedAssignments.sort((a, b) => a.start - b.start),
    tankInfo,
    report: {
      ...timeline.report,
      recognizedColumns: [...timeline.report.recognizedColumns, "actors(type=Player)", "friendly casts", "tank mitigation actionId"],
      skippedRows: [
        ...timeline.report.skippedRows,
        ...(tankInfo ? [] : [{ row: 0, reason: "没有识别到两名坦克，已只导入时间轴。" }]),
        ...(importedAssignments.length ? [] : [{ row: 0, reason: "没有从当前战斗识别到坦克减伤释放记录。" }]),
      ],
    },
  };
}

export async function importFFLogsReportUrlWithTankMitigations(url: string): Promise<FFLogsTankMitigationImport> {
  const payload = await fetchFFLogsPayload(url);
  const timeline = timelineFromImportedPayload(payload) ?? parseFFLogsJson(payload);
  return parseFFLogsTankMitigations(payload, timeline);
}
