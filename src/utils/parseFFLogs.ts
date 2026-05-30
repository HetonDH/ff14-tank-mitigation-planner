import type { DamageType, TankJob } from "../types/mitigation";
import type { FFLogsAbility, FFLogsActor, FFLogsEvent, FFLogsImportInput } from "../types/fflogs";
import type { LogEncounterOption, ParseReport, TimelineEvent, TimelineEventType, TimelineTarget } from "../types/timeline";

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
const UNKNOWN_ABILITY_PATTERN = /^unknown_[0-9a-f]+$/i;
const HIGH_END_ZONE_PATTERN = /(阿卡狄亚|阿卡迪亚|至天之座|登天斗技场|轻量级|中量级|重量级|零式|绝境战|歼灭战|讨伐战|Arcadion|AAC|Savage|Ultimate|Extreme)/i;
const GROUP_WINDOW_MS = 900;
const AUTO_WINDOW_GAP_MS = 9_000;
const AUTO_TIMELINE_WINDOW_GAP = 9;

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
  return "magical";
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
  if (tankHitCount === 0 && uniqueCount === 1) return { type: damage >= 90000 ? "singleDamage" : "roleMechanic", target: "nonTank", severity: damage >= 90000 ? "high" : "medium" };
  if (tankHitCount === 0 && uniqueCount >= 2) return { type: "roleMechanic", target: "nonTank", severity: damage >= 90000 ? "high" : "medium" };
  return { type: "aoe", target: uniqueCount >= 2 ? "party" : "nonTank", severity: damage >= 90000 ? "high" : "medium" };
}

type ParsedTimelineEvent = TimelineEvent & {
  targetSignature?: string;
  sourceSignature?: string;
  targetCount?: number;
  tankHitCount?: number;
};

interface FFLogsDamageDetail {
  event: FFLogsEvent;
  abilityId: number;
  abilityName: string;
  damage: number;
  target: FFLogsActor;
}

function compactRepeatedTimelineEvents(events: ParsedTimelineEvent[]): TimelineEvent[] {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const result: TimelineEvent[] = [];
  const used = new Set<string>();

  for (const event of sorted) {
    if (used.has(event.id)) continue;
    if (event.type !== "auto") {
      result.push(event);
      used.add(event.id);
      continue;
    }
    const gapLimit = AUTO_TIMELINE_WINDOW_GAP;
    const group = [event];
    used.add(event.id);

    for (const candidate of sorted) {
      if (used.has(candidate.id)) continue;
      const previous = group[group.length - 1];
      if (candidate.time < previous.time) continue;
      if (candidate.time - previous.time > gapLimit) continue;
      if (candidate.name !== event.name) continue;
      if (candidate.type !== event.type) continue;
      group.push(candidate);
      used.add(candidate.id);
    }

    if (group.length === 1) {
      result.push(event);
      continue;
    }

    const first = group[0];
    const last = group[group.length - 1];
    const damages = group.map((item) => item.damage ?? 0).filter((damage) => damage > 0);
    const maxDamage = Math.max(...damages, 0);
    const averageDamage = damages.length ? Math.round(damages.reduce((sum, damage) => sum + damage, 0) / damages.length) : 0;
    const mergedTargetIds = new Set(group.flatMap((item) => item.targetSignature?.split(".").filter(Boolean) ?? []));
    const targetCount = mergedTargetIds.size || Math.max(...group.map((item) => item.targetCount ?? 0), 0);
    const tankHitCount = Math.max(...group.map((item) => item.tankHitCount ?? 0), 0);
    const mergedType: TimelineEventType = first.type === "auto"
      ? "auto"
      : targetCount >= 5
        ? "aoe"
        : tankHitCount >= 2 && targetCount <= 2
          ? "spreadTankbuster"
          : targetCount > 2
            ? "aoe"
            : first.type;
    const mergedTarget: TimelineTarget = mergedType === "aoe"
      ? "party"
      : mergedType === "spreadTankbuster" || mergedType === "sharedTankbuster"
        ? "bothTanks"
        : first.target;
    result.push({
      ...first,
      id: `${first.id}-window`,
      name: first.type === "auto" ? "平 A" : first.name,
      duration: Math.max(first.type === "auto" ? 3 : 1.5, Math.round((last.time - first.time + (first.type === "auto" ? 3 : 1.2)) * 10) / 10),
      damage: first.type === "auto" ? averageDamage || maxDamage || undefined : maxDamage || undefined,
      type: mergedType,
      target: mergedTarget,
      severity: group.some((item) => item.severity === "lethal") ? "lethal" : group.some((item) => item.severity === "high") ? "high" : first.severity,
      notes: `${first.notes ?? ""}${first.notes ? "；" : ""}已合并 ${group.length} 次连续判定，覆盖 ${targetCount || "未知"} 个目标，最高 ${maxDamage.toLocaleString()}，平均 ${averageDamage.toLocaleString()}。`,
    });
  }

  return result.sort((a, b) => a.time - b.time);
}

function signature(values: Array<string | number | undefined>) {
  return [...new Set(values.filter((value) => value !== undefined).map(String))].sort().join(".");
}

function detailAbilityKey(detail: FFLogsDamageDetail) {
  return detail.abilityId ? `id:${detail.abilityId}` : `name:${detail.abilityName}`;
}

function buildFFLogsAbilityProfiles(details: FFLogsDamageDetail[], tankIds: Set<number>) {
  const used = new Set<number>();
  const profiles = new Map<string, { maxTargets: number; maxDamage: number; maxTankHits: number }>();

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

    const uniqueTargetIds = new Set(group.map((item) => item.target.id));
    const tankHitCount = group.filter((item) => tankIds.has(item.target.id)).length;
    const maxDamage = Math.max(...group.map((item) => item.damage), 0);
    const key = detailAbilityKey(base);
    const current = profiles.get(key) ?? { maxTargets: 0, maxDamage: 0, maxTankHits: 0 };
    profiles.set(key, {
      maxTargets: Math.max(current.maxTargets, uniqueTargetIds.size),
      maxDamage: Math.max(current.maxDamage, maxDamage),
      maxTankHits: Math.max(current.maxTankHits, tankHitCount),
    });
  }

  return profiles;
}

function classifyWithProfile(
  localClassification: { type: TimelineEventType; target: TimelineTarget; severity: TimelineEvent["severity"] },
  profile: { maxTargets: number; maxDamage: number; maxTankHits: number } | undefined,
  abilityName: string,
  damage: number,
): { type: TimelineEventType; target: TimelineTarget; severity: TimelineEvent["severity"] } {
  if (!profile || AUTO_ATTACK_PATTERN.test(abilityName)) return localClassification;
  const severity = Math.max(damage, profile.maxDamage) >= 140000
    ? "lethal"
    : Math.max(damage, profile.maxDamage) >= 90000
      ? "high"
      : "medium";
  if (profile.maxTargets >= 5) return { type: "aoe" as const, target: "party" as const, severity };
  return localClassification;
}

function targetLabelFor(target: TimelineTarget, tankHitCount: number) {
  if (target === "party") return "对全体的伤害";
  if (target === "bothTanks") return "对双 T 的伤害";
  if (target === "MT" || target === "ST" || tankHitCount > 0) return "对 T 的伤害";
  if (target === "nonTank") return "对非 T 的伤害";
  return undefined;
}

export function parseFFLogsJson(json: unknown): { events: TimelineEvent[]; report: ParseReport } {
  const input = extractFFLogsInput(json);
  const actorMap = new Map(input.actors.filter((actor) => actor?.id).map((actor) => [actor.id, actor]));
  const abilityMap = new Map(input.abilities.filter((ability) => abilityKey(ability)).map((ability) => [abilityKey(ability), ability]));
  const tankActors = input.actors.filter((actor) => normalizeJob(actor.subType ?? actor.type));
  const tankIds = new Set(tankActors.map((actor) => actor.id));
  const skippedRows: ParseReport["skippedRows"] = [];

  const detailMap = new Map<string, FFLogsDamageDetail>();

  input.events
    .filter((event) => event.type === "damage" || event.type === "calculateddamage")
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((event, index) => {
      if (!event.targetID || !actorMap.has(event.targetID)) return;
      if (event.sourceID && actorMap.has(event.sourceID)) return;
      const abilityId = abilityIdOf(event);
      if (abilityId === 500000) return;
      const target = actorMap.get(event.targetID);
      if (!target) {
        skippedRows.push({ row: index + 1, reason: "目标不是玩家", raw: event });
        return;
      }
      const ability = abilityMap.get(abilityId);
      const key = `${event.packetID ?? event.timestamp}-${event.targetID}-${abilityId}`;
      const current = detailMap.get(key);
      const damage = event.type === "damage" ? eventDamage(event) : 0;
      if (current) {
        detailMap.set(key, {
          ...current,
          event: current.event.type === "calculateddamage" ? current.event : event.timestamp < current.event.timestamp ? event : current.event,
          damage: Math.max(current.damage, damage),
        });
      } else {
        detailMap.set(key, {
          event,
          abilityId,
          abilityName: ability?.name ?? `unknown_${abilityId.toString(16)}`,
          damage,
          target,
        });
      }
    });

  const details = [...detailMap.values()]
    .filter((item) => item.damage >= 0)
    .sort((a, b) => a.event.timestamp - b.event.timestamp);

  const timelineEvents: ParsedTimelineEvent[] = [];
  const used = new Set<number>();
  const fightStartTime = input.fightStartTime ?? details[0]?.event.timestamp ?? 0;
  const abilityProfiles = buildFFLogsAbilityProfiles(details, tankIds);

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
    const localClassification = classifyEvent(targets, tankIds, base.abilityName, maxDamage);
    const classification = classifyWithProfile(localClassification, abilityProfiles.get(detailAbilityKey(base)), base.abilityName, maxDamage);
    const relativeTime = Math.max(0, Math.round((base.event.timestamp - fightStartTime) / 10) / 100);
    const targetSignature = signature(targets.map((target) => target.id));
    const sourceSignature = signature(group.map((item) => item.event.sourceID));
    const tankHitCount = targets.filter((target) => tankIds.has(target.id)).length;

    timelineEvents.push({
      id: `fflogs-${base.event.timestamp}-${base.abilityId}-${timelineEvents.length}`,
      time: relativeTime,
      name: base.abilityName,
      damage: maxDamage || undefined,
      targetDamageLabel: targetLabelFor(classification.target, tankHitCount),
      type: classification.type,
      damageType: damageTypeFromAbility(ability),
      target: classification.target,
      severity: classification.severity,
      source: "fflogs",
      sourceId: String(base.abilityId || ""),
      notes: `FFLogs ability=${base.abilityId || "unknown"}，命中 ${targets.length} 人：${targets.map((target) => target.name).join("、")}`,
      targetNames: targets.map((target) => target.name),
      targetSignature,
      sourceSignature,
      targetCount: new Set(targets.map((target) => target.id)).size,
      tankHitCount,
    });
  }

  const compactedEvents = compactRepeatedTimelineEvents(timelineEvents);

  return {
    events: compactedEvents,
    report: {
      fileName: input.title ?? "FFLogs JSON",
      eventCount: compactedEvents.length,
      sheetName: "FFLogs damage events",
      recognizedColumns: ["events", "actors/friendlies", "abilities/masterData"],
      skippedRows,
    },
  };
}

export async function parseFFLogsFile(file: File, encounterId?: string): Promise<{ events: TimelineEvent[]; report: ParseReport }> {
  const text = await file.text();
  return parseFFLogsText(text, file.name, encounterId);
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

function parseActionEffectDamage(parts: string[]): number | undefined {
  const damages: number[] = [];
  for (let index = 8; index <= 22; index += 2) {
    const effectType = parts[index] ?? "";
    const amountText = parts[index + 1] ?? "";
    if (!/^[0-9a-f]+$/i.test(effectType) || !/^[0-9a-f]{4,8}$/i.test(amountText)) continue;
    if (!effectType.endsWith("3")) continue;
    const amount = Number.parseInt(amountText.slice(0, 4), 16);
    if (amount > 0) damages.push(amount);
  }
  return damages.length ? Math.max(...damages) : undefined;
}

interface LocalLogHit {
  row: number;
  timestamp: number;
  timestampText: string;
  zoneId: string;
  zoneName: string;
  sourceId: string;
  targetId: string;
  abilityId: string;
  abilityName: string;
  sourceName: string;
  targetName: string;
  damage?: number;
}

interface LocalLogSegment {
  id: string;
  zoneId: string;
  zoneName: string;
  start: number;
  end: number;
  hits: LocalLogHit[];
}

interface LocalLogSegmentSummary {
  id: string;
  zoneId: string;
  zoneName: string;
  start: number;
  end: number;
  eventCount: number;
}

function compactTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", { hour12: false });
}

function segmentId(zoneId: string, zoneName: string, start: number) {
  return `enc-${zoneId || "zone"}-${start}-${zoneName.replace(/[^\w\u4e00-\u9fa5-]+/g, "_").slice(0, 24)}`;
}

function isHighEndZone(zoneName: string) {
  return HIGH_END_ZONE_PATTERN.test(zoneName);
}

function extractDutyNameFromSystemLine(line: string): { type: "start" | "end" | "pop"; name: string } | null {
  const parts = line.split("|");
  if (parts[0] !== "00") return null;
  const message = parts.slice(3, -1).join("|");
  const popMatch = message.match(/Duty pop:\s*([^|]+)/i);
  if (popMatch?.[1]) return { type: "pop", name: popMatch[1].trim() };
  const startMatch = message.match(/[“「](.+?)[”」]任务开始/);
  if (startMatch?.[1]) return { type: "start", name: startMatch[1].trim() };
  const endMatch = message.match(/[“「](.+?)[”」]任务结束/);
  if (endMatch?.[1]) return { type: "end", name: endMatch[1].trim() };
  return null;
}

function parseLocalLogLine(line: string, row: number, zoneId: string, zoneName: string): { zoneId: string; zoneName: string; hit?: LocalLogHit; skipped?: ParseReport["skippedRows"][number] } {
    const trimmed = line.trim();
    if (!trimmed) return { zoneId, zoneName };
    const parts = trimmed.split("|");
    if (parts[0] === "01") {
      return { zoneId: parts[2] || zoneId, zoneName: parts[3] || zoneName };
    }
    if (parts.length < 8) {
      return { zoneId, zoneName, skipped: { row, reason: "不是可识别的分隔日志行", raw: line } };
    }
    const type = parts[0];
    if (type !== "21" && type !== "22" && type.toLowerCase() !== "damage") return { zoneId, zoneName };
    const timestampText = parts[1] ?? "";
    const timestamp = Date.parse(timestampText);
    if (!Number.isFinite(timestamp)) {
      return { zoneId, zoneName, skipped: { row, reason: "无法识别时间戳", raw: line } };
    }
    const abilityId = parts[4] || "";
    const abilityName = parts[5] || parts[4] || "未知技能";
    const sourceId = parts[2] || "";
    const targetId = parts[6] || "";
    const sourceName = parts[3] || "";
    const targetName = parts[7] || "";
    const damage = parseActionEffectDamage(parts);
    if (!targetName || (!abilityId && !abilityName)) {
      return { zoneId, zoneName, skipped: { row, reason: "缺少技能或目标", raw: line } };
    }
    return { zoneId, zoneName, hit: { row, timestamp, timestampText, zoneId, zoneName, sourceId, targetId, abilityId, abilityName, sourceName, targetName, damage } };
}

function isPlayerActorId(id: string) {
  return /^10[0-9a-f]{6}$/i.test(id);
}

function isEnemyActorId(id: string) {
  return /^4[0-9a-f]{7}$/i.test(id);
}

function isBossTimelineHit(hit: LocalLogHit) {
  return isEnemyActorId(hit.sourceId) && isPlayerActorId(hit.targetId);
}

function filterHighEndTimelineHits(hits: LocalLogHit[]) {
  const sourceScores = new Map<string, { id: string; name: string; named: number; auto: number; maxDamage: number }>();
  for (const hit of hits) {
    const score = sourceScores.get(hit.sourceId) ?? { id: hit.sourceId, name: hit.sourceName || "未知敌人", named: 0, auto: 0, maxDamage: 0 };
    if (AUTO_ATTACK_PATTERN.test(hit.abilityName)) score.auto += 1;
    else if (!UNKNOWN_ABILITY_PATTERN.test(hit.abilityName)) score.named += 1;
    score.maxDamage = Math.max(score.maxDamage, hit.damage ?? 0);
    sourceScores.set(hit.sourceId, score);
  }
  const bossSourceIds = new Set(
    [...sourceScores.values()]
      .filter((source) => source.named >= 1 || source.auto >= 2 || source.maxDamage >= 20000)
      .map((source) => source.id),
  );

  return hits.filter((hit) => {
    if (UNKNOWN_ABILITY_PATTERN.test(hit.abilityName)) return false;
    if (AUTO_ATTACK_PATTERN.test(hit.abilityName)) return bossSourceIds.has(hit.sourceId);
    return true;
  });
}

function scanLocalCombatLog(text: string, encounterId?: string): { segments: LocalLogSegmentSummary[]; selected?: LocalLogSegment; skippedRows: ParseReport["skippedRows"] } {
  const segments: LocalLogSegmentSummary[] = [];
  const skippedRows: ParseReport["skippedRows"] = [];
  let current: LocalLogSegment | null = null;
  let selected: LocalLogSegment | undefined;
  let latestValid: LocalLogSegment | undefined;
  let zoneId = "";
  let zoneName = "未知区域";
  let pendingDutyName = "";
  let activeDutyName = "";
  let row = 0;
  let cursor = 0;

  function keepSkipped(skipped: ParseReport["skippedRows"][number]) {
    if (skippedRows.length < 50) skippedRows.push(skipped);
  }

  function finalizeCurrent() {
    if (!current || current.hits.length < 5 || current.end - current.start < 10_000) {
      current = null;
      return;
    }
    const summary: LocalLogSegmentSummary = {
      id: current.id,
      zoneId: current.zoneId,
      zoneName: current.zoneName,
      start: current.start,
      end: current.end,
      eventCount: current.hits.length,
    };
    segments.push(summary);
    if (current.id === encounterId) selected = current;
    latestValid = current;
    current = null;
  }

  while (cursor <= text.length) {
    const nextBreak = text.indexOf("\n", cursor);
    const line = nextBreak === -1 ? text.slice(cursor) : text.slice(cursor, nextBreak);
    cursor = nextBreak === -1 ? text.length + 1 : nextBreak + 1;
    row += 1;

    const dutySignal = extractDutyNameFromSystemLine(line);
    if (dutySignal?.type === "pop") {
      pendingDutyName = dutySignal.name;
    } else if (dutySignal?.type === "start") {
      activeDutyName = dutySignal.name;
      pendingDutyName = "";
    } else if (dutySignal?.type === "end" && dutySignal.name === activeDutyName) {
      activeDutyName = "";
    }

    const parsed = parseLocalLogLine(line, row, zoneId, zoneName);
    zoneId = parsed.zoneId;
    zoneName = parsed.zoneName;
    if (parsed.skipped) keepSkipped(parsed.skipped);
    const hit = parsed.hit;
    if (!hit || ["冲刺", "传送"].includes(hit.abilityName)) continue;
    if (!isBossTimelineHit(hit)) continue;
    if (!hit.damage || hit.damage <= 0) continue;
    const dutyName = activeDutyName || pendingDutyName;
    const effectiveZoneName = isHighEndZone(dutyName) ? dutyName : hit.zoneName;
    if (!isHighEndZone(effectiveZoneName)) continue;
    hit.zoneName = effectiveZoneName;
    hit.zoneId = isHighEndZone(dutyName) ? `duty:${dutyName}` : hit.zoneId;

    const shouldStart = !current || hit.zoneId !== current.zoneId || hit.zoneName !== current.zoneName;
    if (shouldStart) {
      finalizeCurrent();
      current = { id: segmentId(hit.zoneId, hit.zoneName, hit.timestamp), zoneId: hit.zoneId, zoneName: hit.zoneName, start: hit.timestamp, end: hit.timestamp, hits: [hit] };
    } else if (current) {
      current.hits.push(hit);
      current.end = hit.timestamp;
    }
  }
  finalizeCurrent();

  if (!encounterId) selected = latestValid;
  return { segments, selected, skippedRows };
}

function optionForSegment(segment: LocalLogSegmentSummary): LogEncounterOption {
  const duration = Math.round((segment.end - segment.start) / 1000);
  return {
    id: segment.id,
    label: `${compactTime(segment.start)} - ${compactTime(segment.end)} · ${segment.zoneName} · ${segment.eventCount} 条`,
    zoneName: segment.zoneName,
    startTime: compactTime(segment.start),
    endTime: compactTime(segment.end),
    duration,
    eventCount: segment.eventCount,
  };
}

function buildAutoAttackEvents(autoHits: LocalLogHit[], start: number): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const hitsBySource = new Map<string, LocalLogHit[]>();
  for (const hit of autoHits) {
    const key = `${hit.sourceId}:${hit.abilityId || hit.abilityName}`;
    hitsBySource.set(key, [...(hitsBySource.get(key) ?? []), hit]);
  }

  for (const hits of hitsBySource.values()) {
    const sorted = [...hits].sort((a, b) => a.timestamp - b.timestamp);
    let group: LocalLogHit[] = [];

    function flush() {
      if (!group.length) return;
      const first = group[0];
      const last = group[group.length - 1];
      const damages = group.map((hit) => hit.damage ?? 0).filter((damage) => damage > 0);
      const maxDamage = Math.max(...damages, 0);
      const averageDamage = damages.length ? Math.round(damages.reduce((sum, damage) => sum + damage, 0) / damages.length) : 0;
      const uniqueTargets = new Set(group.map((hit) => hit.targetName));
      const duration = Math.max(3, Math.round((last.timestamp - first.timestamp) / 1000) + 3);
      events.push({
        id: `local-log-auto-${first.sourceId}-${first.timestamp}-${events.length}`,
        time: Math.round((first.timestamp - start) / 10) / 100,
        name: "平 A",
        damage: averageDamage || maxDamage || undefined,
        targetDamageLabel: `对 ${[...uniqueTargets].join("、")} 的伤害`,
        type: "auto",
        damageType: "all",
        target: uniqueTargets.size >= 2 ? "bothTanks" : "MT",
        duration,
        severity: maxDamage >= 50000 ? "high" : maxDamage >= 20000 ? "medium" : "low",
        source: "localLog",
        sourceId: first.abilityId,
        sourceRow: first.row,
        notes: `平 A 窗口：来源 ${first.sourceName}，${group.length} 次，平均 ${averageDamage.toLocaleString()}，最高 ${maxDamage.toLocaleString()}，目标 ${[...uniqueTargets].join("、")}`,
        targetNames: [...uniqueTargets],
      });
      group = [];
    }

    for (const hit of sorted) {
      const previous = group[group.length - 1];
      if (previous && hit.timestamp - previous.timestamp > AUTO_WINDOW_GAP_MS) flush();
      group.push(hit);
    }
    flush();
  }

  return events;
}

function buildAbilityProfiles(rawSorted: LocalLogHit[]) {
  const used = new Set<number>();
  const profiles = new Map<string, { maxTargets: number; maxDamage: number }>();

  for (let index = 0; index < rawSorted.length; index += 1) {
    if (used.has(index)) continue;
    const base = rawSorted[index];
    const group = [base];
    used.add(index);
    for (let next = index + 1; next < rawSorted.length; next += 1) {
      if (used.has(next)) continue;
      const candidate = rawSorted[next];
      if (candidate.timestamp - base.timestamp > GROUP_WINDOW_MS) break;
      if (candidate.abilityName === base.abilityName) {
        group.push(candidate);
        used.add(next);
      }
    }
    const uniqueTargetCount = new Set(group.map((hit) => hit.targetName)).size;
    const maxDamage = Math.max(...group.map((hit) => hit.damage ?? 0), 0);
    const current = profiles.get(base.abilityName) ?? { maxTargets: 0, maxDamage: 0 };
    profiles.set(base.abilityName, {
      maxTargets: Math.max(current.maxTargets, uniqueTargetCount),
      maxDamage: Math.max(current.maxDamage, maxDamage),
    });
  }

  return profiles;
}

function eventsFromLocalHits(rawHits: LocalLogHit[], start: number): TimelineEvent[] {
  const autoHits = rawHits.filter((hit) => AUTO_ATTACK_PATTERN.test(hit.abilityName));
  const rawSorted = rawHits.filter((hit) => !AUTO_ATTACK_PATTERN.test(hit.abilityName)).sort((a, b) => a.timestamp - b.timestamp);
  const abilityProfiles = buildAbilityProfiles(rawSorted);
  const used = new Set<number>();
  const events: TimelineEvent[] = buildAutoAttackEvents(autoHits, start);

  for (let index = 0; index < rawSorted.length; index += 1) {
    if (used.has(index)) continue;
    const base = rawSorted[index];
    const group = [base];
    used.add(index);
    for (let next = index + 1; next < rawSorted.length; next += 1) {
      if (used.has(next)) continue;
      const candidate = rawSorted[next];
      if (candidate.timestamp - base.timestamp > GROUP_WINDOW_MS) break;
      if (candidate.abilityName === base.abilityName) {
        group.push(candidate);
        used.add(next);
      }
    }
    const uniqueTargets = new Set(group.map((hit) => hit.targetName));
    const maxDamage = Math.max(...group.map((hit) => hit.damage ?? 0), 0);
    const profile = abilityProfiles.get(base.abilityName);
    const profileTargetCount = profile?.maxTargets ?? uniqueTargets.size;
    const type: TimelineEventType = profileTargetCount >= 5 ? "aoe" : profileTargetCount >= 2 ? "spreadTankbuster" : "singleTankbuster";
    events.push({
      id: `local-log-${base.timestamp}-${base.abilityId || events.length}`,
      time: Math.round((base.timestamp - start) / 10) / 100,
      name: base.abilityName,
      damage: maxDamage || undefined,
      targetDamageLabel: `对 ${[...uniqueTargets].join("、")} 的伤害`,
      type,
      damageType: "all",
      target: type === "aoe" ? "party" : type === "spreadTankbuster" ? "bothTanks" : "MT",
      severity: type === "aoe" ? (maxDamage >= 90000 ? "high" : "medium") : maxDamage >= 140000 ? "lethal" : "high",
      source: "localLog",
      sourceId: base.abilityId,
      sourceRow: base.row,
      notes: `本地日志实验解析，来源 ${base.sourceName}，命中 ${uniqueTargets.size} 个玩家：${[...uniqueTargets].join("、")}`,
      targetNames: [...uniqueTargets],
    });
  }
  return events.sort((a, b) => a.time - b.time);
}

function parseLocalCombatLog(text: string, fileName = "本地日志", encounterId?: string): { events: TimelineEvent[]; report: ParseReport } {
  const { segments, selected, skippedRows } = scanLocalCombatLog(text, encounterId);
  const selectedHits = selected ? filterHighEndTimelineHits(selected.hits) : [];
  const start = selected?.start ?? selectedHits[0]?.timestamp ?? 0;
  const events = eventsFromLocalHits(selectedHits, start);
  const noHighEndMessage = !segments.length
    ? [{ row: 0, reason: "未识别到零式/八人高难/大型任务记录。请确认日志中包含阿卡狄亚、零式、绝境战、歼灭战或 Savage/Ultimate/Extreme 区域。" }]
    : [];
  const noEventMessage = segments.length && !events.length
    ? [{ row: 0, reason: "已识别到大型任务片段，但没有解析出敌方对玩家的伤害事件。可能需要补充该副本的日志格式或区域关键词。" }]
    : [];

  return {
    events,
    report: {
      fileName,
      eventCount: events.length,
      sheetName: selected ? `${selected.zoneName} ${compactTime(selected.start)}-${compactTime(selected.end)}` : "本地日志片段扫描",
      recognizedColumns: ["21/22 ability lines", "timestamp", "ability", "target", "damage"],
      skippedRows: [...noHighEndMessage, ...noEventMessage, ...(skippedRows.length >= 50 ? [...skippedRows, { row: 0, reason: "跳过行较多，仅显示前 50 条。" }] : skippedRows)],
      encounters: [...segments].reverse().map(optionForSegment),
    },
  };
}

export function parseFFLogsText(text: string, fileName = "FFLogs / 本地日志", encounterId?: string): { events: TimelineEvent[]; report: ParseReport } {
  try {
    return parseFFLogsJson(JSON.parse(text));
  } catch {
    return parseLocalCombatLog(text, fileName, encounterId);
  }
}
