import type { ParseReport, TimelineEvent, TimelineEventType, TimelineTarget } from "../types/timeline";
import type { DamageType } from "../types/mitigation";
import { parseFFLogsJson } from "./parseFFLogs";

export interface ParsedFFLogsUrl {
  reportCode: string | null;
  fightId: number | null;
  isLastFight: boolean;
}

export function parseFFLogsUrl(input: string): ParsedFFLogsUrl {
  const text = input.trim();
  let reportCode: string | null = null;
  let fightId: number | null = null;
  let isLastFight = false;

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

  return { reportCode, fightId, isLastFight };
}

function mapHealerbookType(type: string | undefined): TimelineEventType {
  if (type === "auto") return "auto";
  if (type === "tankbuster") return "singleTankbuster";
  if (type === "partial_aoe" || type === "partial_final_aoe" || type === "aoe") return "aoe";
  return "aoe";
}

function mapHealerbookTarget(event: Record<string, unknown>, type: TimelineEventType): TimelineTarget {
  const details = Array.isArray(event.playerDamageDetails) ? event.playerDamageDetails : [];
  if (type === "aoe") return "party";
  if (details.length >= 2) return "bothTanks";
  return "MT";
}

function mapHealerbookDamageType(value: unknown): DamageType {
  if (value === "physical" || value === "magical" || value === "all") return value;
  return "all";
}

function timelineFromHealerbookPayload(payload: unknown): { events: TimelineEvent[]; report: ParseReport } | null {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const damageEvents = Array.isArray(root.damageEvents) ? root.damageEvents : null;
  if (!damageEvents) return null;

  const events: TimelineEvent[] = damageEvents.map((raw, index): TimelineEvent => {
    const event = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const type = mapHealerbookType(String(event.type ?? ""));
    const time = Number(event.time ?? event.timestamp ?? 0);
    const damage = Number(event.damage ?? 0);
    const severity: TimelineEvent["severity"] = type === "auto" ? "medium" : type === "aoe" ? "medium" : "high";
    return {
      id: `fflogs-report-${String(event.id ?? index)}`,
      time: Number.isFinite(time) ? time : 0,
      name: String(event.name ?? event.actionName ?? "未知技能"),
      damage: damage > 0 ? damage : undefined,
      type,
      damageType: mapHealerbookDamageType(event.damageType),
      target: mapHealerbookTarget(event, type),
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

export async function importFFLogsReportUrl(url: string): Promise<{ events: TimelineEvent[]; report: ParseReport }> {
  const parsed = parseFFLogsUrl(url);
  if (!parsed.reportCode) throw new Error("无法识别 FFLogs 链接，请使用 reports 链接或报告代码。");

  const proxyBase = (import.meta.env.VITE_FFLOGS_PROXY_BASE ?? "").replace(/\/+$/, "");
  if (!proxyBase) {
    throw new Error("当前是纯前端版本，不能安全直连 FFLogs API。请先使用本地日志/FFLogs JSON，或配置 VITE_FFLOGS_PROXY_BASE 接入 Worker 代理。");
  }

  const params = new URLSearchParams({ reportCode: parsed.reportCode });
  if (!parsed.isLastFight && parsed.fightId !== null) params.set("fightId", String(parsed.fightId));
  const response = await fetch(`${proxyBase}/fflogs/import?${params.toString()}`);
  if (!response.ok) throw new Error(`FFLogs 导入失败：HTTP ${response.status}`);
  const payload = await response.json();
  return timelineFromHealerbookPayload(payload) ?? parseFFLogsJson(payload);
}
