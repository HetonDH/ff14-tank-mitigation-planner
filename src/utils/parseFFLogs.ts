import type { DamageType, TankJob } from "../types/mitigation";
import type { FFLogsAbility, FFLogsActor, FFLogsEvent, FFLogsImportInput } from "../types/fflogs";
import type { ParseReport, TimelineEvent, TimelineEventType, TimelineTarget } from "../types/timeline";

const TANK_JOB_BY_LOG_TYPE: Record<string, TankJob> = {
  paladin: "PLD",
  gladiator: "PLD",
  warrior: "WAR",
  marauder: "WAR",
  darkknight: "DRK",
  "dark knight": "DRK",
  gunbreaker: "GNB",
};

const AUTO_ATTACK_PATTERN = /^(攻击|attack|attacke|attaque|攻撃|공격|unknown_[0-9a-f]{4})$/i;
const GROUP_WINDOW_MS = 900;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function getByPath(root: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => toRecord(current)[key], root);
}

function normalizeJob(value: unknown): TankJob | null {
  const key = String(value ?? "").replace(/\s+/g, "").toLowerCase();
  return TANK_JOB_BY_LOG_TYPE[key] ?? TANK_JOB_BY_LOG_TYPE[String(value ?? "").trim().toLowerCase()] ?? null;
}

function abilityIdOf(event: FFLogsEvent) {
  return event.abilityGameID ?? event.abilityID ?? 0;
}

function abilityKey(ability: FFLogsAbility) {
  return ability.gameID ?? ability.id ?? 0;
}

function eventDamage(event: FFLogsEvent) {
  if (event.unmitigatedAmount && event.unmitigatedAmount > 0) return event.unmitigatedAmount;
  if (event.multiplier && event.multiplier > 0 && ((event.amount ?? 0) > 0 || (event.absorbed ?? 0) > 0)) {
    return Math.round(((event.amount ?? 0) + (event.absorbed ?? 0)) / event.multiplier);
  }
  return (event.amount ?? 0) + (event.absorbed ?? 0);
}

function damageTypeFromAbility(ability?: FFLogsAbility): DamageType {
  const type = Number(ability?.type);
  if (type === 128) return "physical";
  if (type === 1024) return "magical";
  return "all";
}

function extractFFLogsInput(json: unknown): FFLogsImportInput {
  const root = toRecord(json);
  const report = toRecord(getByPath(root, ["data", "reportData", "report"]) || getByPath(root, ["reportData", "report"]) || root.report || root);
  const eventsNode =
    getByPath(report, ["events", "data"]) ||
    getByPath(root, ["data", "reportData", "report", "events", "data"]) ||
    getByPath(root, ["reportData", "report", "events", "data"]) ||
    root.events ||
    root.data;
  const masterData = toRecord(report.masterData || root.masterData);
  const actors = [
    ...asArray(masterData.actors),
    ...asArray(report.friendlies),
    ...asArray(root.friendlies),
    ...asArray(root.actors),
  ] as FFLogsActor[];
  const abilities = [
    ...asArray(masterData.abilities),
    ...asArray(report.abilities),
    ...asArray(root.abilities),
  ] as FFLogsAbility[];
  const fightStartTime = Number(root.fightStartTime ?? root.startTime ?? root.start ?? report.startTime ?? 0) || undefined;
  return {
    events: asArray(eventsNode) as FFLogsEvent[],
    actors,
    abilities,
    fightStartTime,
    title: String(report.title ?? root.title ?? "FFLogs"),
  };
}

function classifyEvent(targets: FFLogsActor[], tankIds: Set<number>, abilityName: string, damage: number): { type: TimelineEventType; target: TimelineTarget; severity: TimelineEvent["severity"] } {
  const targetIds = targets.map((actor) => actor.id);
  const tankHitCount = targetIds.filter((id) => tankIds.has(id)).length;
  const uniqueCount = new Set(targetIds).size;

  if (AUTO_ATTACK_PATTERN.test(abilityName)) return { type: "auto", target: "MT", severity: "medium" };
  if (uniqueCount >= 5) return { type: "aoe", target: "party", severity: damage >= 90000 ? "high" : "medium" };
  if (tankHitCount >= 2 && uniqueCount <= 2) return { type: "spreadTankbuster", target: "bothTanks", severity: damage >= 140000 ? "lethal" : "high" };
  if (tankHitCount === 1 && uniqueCount === 1) return { type: "singleTankbuster", target: "MT", severity: damage >= 140000 ? "lethal" : "high" };
  if (tankHitCount >= 2) return { type: "sharedTankbuster", target: "bothTanks", severity: damage >= 140000 ? "lethal" : "high" };
  return { type: "aoe", target: uniqueCount >= 3 ? "party" : "self", severity: damage >= 90000 ? "high" : "medium" };
}

export function parseFFLogsJson(json: unknown): { events: TimelineEvent[]; report: ParseReport } {
  const input = extractFFLogsInput(json);
  const actorMap = new Map(input.actors.filter((actor) => actor?.id).map((actor) => [actor.id, actor]));
  const abilityMap = new Map(input.abilities.filter((ability) => abilityKey(ability)).map((ability) => [abilityKey(ability), ability]));
  const tankActors = input.actors.filter((actor) => normalizeJob(actor.subType ?? actor.type));
  const tankIds = new Set(tankActors.map((actor) => actor.id));
  const skippedRows: ParseReport["skippedRows"] = [];

  const details = input.events
    .filter((event) => event.type === "damage" || event.type === "calculateddamage")
    .filter((event) => event.targetID && actorMap.has(event.targetID))
    .filter((event) => !(event.sourceID && actorMap.has(event.sourceID)))
    .filter((event) => abilityIdOf(event) !== 500000)
    .map((event, index) => {
      const abilityId = abilityIdOf(event);
      const ability = abilityMap.get(abilityId);
      const target = actorMap.get(event.targetID ?? 0);
      if (!target) {
        skippedRows.push({ row: index + 1, reason: "目标不是玩家", raw: event });
      }
      return {
        event,
        abilityId,
        abilityName: ability?.name ?? `unknown_${abilityId.toString(16)}`,
        damage: eventDamage(event),
        target,
      };
    })
    .filter((item) => item.target && item.damage >= 0)
    .sort((a, b) => a.event.timestamp - b.event.timestamp);

  const timelineEvents: TimelineEvent[] = [];
  const used = new Set<number>();
  const fightStartTime = input.fightStartTime ?? details[0]?.event.timestamp ?? 0;

  for (let index = 0; index < details.length; index += 1) {
    if (used.has(index)) continue;
    const base = details[index];
    const group = [base];
    used.add(index);

    for (let next = index + 1; next < details.length; next += 1) {
      if (used.has(next)) continue;
      const candidate = details[next];
      if (candidate.event.timestamp - base.event.timestamp > GROUP_WINDOW_MS) break;
      if (candidate.abilityId === base.abilityId || candidate.abilityName === base.abilityName) {
        group.push(candidate);
        used.add(next);
      }
    }

    const targets = group.map((item) => item.target).filter((actor): actor is FFLogsActor => Boolean(actor));
    const maxDamage = Math.max(...group.map((item) => item.damage), 0);
    const ability = abilityMap.get(base.abilityId);
    const classification = classifyEvent(targets, tankIds, base.abilityName, maxDamage);
    const relativeTime = Math.max(0, Math.round((base.event.timestamp - fightStartTime) / 10) / 100);

    timelineEvents.push({
      id: `fflogs-${base.event.timestamp}-${base.abilityId}-${timelineEvents.length}`,
      time: relativeTime,
      name: base.abilityName,
      damage: maxDamage || undefined,
      type: classification.type,
      damageType: damageTypeFromAbility(ability),
      target: classification.target,
      severity: classification.severity,
      source: "fflogs",
      sourceId: String(base.abilityId || ""),
      notes: `FFLogs ability=${base.abilityId || "unknown"}，命中 ${targets.length} 人：${targets.map((target) => target.name).join("、")}`,
    });
  }

  return {
    events: timelineEvents.sort((a, b) => a.time - b.time),
    report: {
      fileName: input.title ?? "FFLogs JSON",
      eventCount: timelineEvents.length,
      sheetName: "FFLogs damage events",
      recognizedColumns: ["events", "actors/friendlies", "abilities/masterData"],
      skippedRows,
    },
  };
}

export async function parseFFLogsFile(file: File): Promise<{ events: TimelineEvent[]; report: ParseReport }> {
  const text = await file.text();
  return parseFFLogsText(text, file.name);
}

function parsePossibleDamage(value: string): number | undefined {
  const text = value.trim();
  if (!text) return undefined;
  if (/^\d+$/.test(text)) {
    const parsed = Number(text);
    return parsed >= 1000 ? parsed : undefined;
  }
  if (/^[0-9a-f]+$/i.test(text)) {
    const parsed = Number.parseInt(text.slice(0, 8), 16);
    return parsed >= 1000 && parsed < 10_000_000 ? parsed : undefined;
  }
  return undefined;
}

function parseLocalCombatLog(text: string, fileName = "本地日志"): { events: TimelineEvent[]; report: ParseReport } {
  const skippedRows: ParseReport["skippedRows"] = [];
  const rawHits: Array<{ row: number; timestamp: number; abilityId: string; abilityName: string; targetName: string; damage?: number }> = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const row = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;
    const parts = trimmed.split("|");
    if (parts.length < 8) {
      skippedRows.push({ row, reason: "不是可识别的分隔日志行", raw: line });
      return;
    }
    const type = parts[0];
    if (type !== "21" && type !== "22" && type.toLowerCase() !== "damage") return;
    const timestampText = parts[1] ?? "";
    const timestamp = Date.parse(timestampText);
    if (!Number.isFinite(timestamp)) {
      skippedRows.push({ row, reason: "无法识别时间戳", raw: line });
      return;
    }
    const abilityId = parts[4] || "";
    const abilityName = parts[5] || parts[4] || "未知技能";
    const targetName = parts[7] || "";
    const damage = parts.slice(8, 18).map(parsePossibleDamage).find((value): value is number => value !== undefined);
    if (!targetName || (!abilityId && !abilityName)) {
      skippedRows.push({ row, reason: "缺少技能或目标", raw: line });
      return;
    }
    rawHits.push({ row, timestamp, abilityId, abilityName, targetName, damage });
  });

  rawHits.sort((a, b) => a.timestamp - b.timestamp);
  const start = rawHits[0]?.timestamp ?? 0;
  const used = new Set<number>();
  const events: TimelineEvent[] = [];

  for (let index = 0; index < rawHits.length; index += 1) {
    if (used.has(index)) continue;
    const base = rawHits[index];
    const group = [base];
    used.add(index);
    for (let next = index + 1; next < rawHits.length; next += 1) {
      if (used.has(next)) continue;
      const candidate = rawHits[next];
      if (candidate.timestamp - base.timestamp > GROUP_WINDOW_MS) break;
      if (candidate.abilityId === base.abilityId || candidate.abilityName === base.abilityName) {
        group.push(candidate);
        used.add(next);
      }
    }
    const uniqueTargets = new Set(group.map((hit) => hit.targetName));
    const maxDamage = Math.max(...group.map((hit) => hit.damage ?? 0), 0);
    const isAuto = AUTO_ATTACK_PATTERN.test(base.abilityName);
    const type: TimelineEventType = isAuto ? "auto" : uniqueTargets.size >= 5 ? "aoe" : uniqueTargets.size >= 2 ? "spreadTankbuster" : "singleTankbuster";
    events.push({
      id: `local-log-${base.timestamp}-${base.abilityId || events.length}`,
      time: Math.round((base.timestamp - start) / 10) / 100,
      name: base.abilityName,
      damage: maxDamage || undefined,
      type,
      damageType: "all",
      target: type === "aoe" ? "party" : type === "spreadTankbuster" ? "bothTanks" : "MT",
      severity: type === "aoe" ? (maxDamage >= 90000 ? "high" : "medium") : maxDamage >= 140000 ? "lethal" : "high",
      source: "localLog",
      sourceId: base.abilityId,
      sourceRow: base.row,
      notes: `本地日志实验解析，命中 ${uniqueTargets.size} 个目标：${[...uniqueTargets].join("、")}`,
    });
  }

  return {
    events,
    report: {
      fileName,
      eventCount: events.length,
      sheetName: "本地日志实验解析",
      recognizedColumns: ["21/22 ability lines", "timestamp", "ability", "target", "damage"],
      skippedRows,
    },
  };
}

export function parseFFLogsText(text: string, fileName = "FFLogs / 本地日志"): { events: TimelineEvent[]; report: ParseReport } {
  try {
    return parseFFLogsJson(JSON.parse(text));
  } catch {
    return parseLocalCombatLog(text, fileName);
  }
}
