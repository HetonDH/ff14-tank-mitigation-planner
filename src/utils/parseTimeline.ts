import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { DamageType } from "../types/mitigation";
import type { ParseReport, TimelineEvent, TimelineEventType, TimelineTarget } from "../types/timeline";
import { parseTimeToSeconds } from "./time";

const columnAliases = {
  time: ["time", "时间", "秒", "时间点", "判定", "判定时间"],
  castStart: ["读条", "读条开始", "开始读条"],
  name: ["name", "技能名", "伤害名", "事件名", "机制名", "技能名称", "中文技能名", "技能（中文）", "技能"],
  enName: ["英文技能名", "技能（英文）", "logs英文原文"],
  damage: ["damage", "伤害", "伤害量", "承伤", "基本伤害"],
  type: ["type", "类型", "伤害类型"],
  target: ["target", "目标", "受击目标", "是否为对t或狂暴伤害？", "是否为对T或狂暴伤害？"],
  duration: ["duration", "持续", "持续时间"],
  notes: ["notes", "备注", "技能简介", "状态", "来源"],
} as const;

type CanonicalColumn = keyof typeof columnAliases;

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

function mapColumns(headers: string[]) {
  const mapped = new Map<CanonicalColumn, string>();
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const [canonical, aliases] of Object.entries(columnAliases) as [CanonicalColumn, readonly string[]][]) {
      if (aliases.map((item) => item.replace(/\s+/g, "").toLowerCase()).includes(normalized)) {
        mapped.set(canonical, header);
      }
    }
  }
  return mapped;
}

export function normalizeTarget(value: unknown): TimelineTarget | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (["mt", "main tank", "主t"].includes(text)) return "MT";
  if (["st", "off tank", "副t"].includes(text)) return "ST";
  if (["mt/st", "双t", "双T".toLowerCase(), "both", "both tanks"].includes(text)) return "bothTanks";
  if (["全体", "party", "all", "aoe"].includes(text)) return "party";
  if (["self", "自己"].includes(text)) return "self";
  return null;
}

export function normalizeDamageType(value: unknown): DamageType {
  const text = String(value ?? "").trim().toLowerCase();
  if (["magic", "magical", "魔法", "魔法伤害"].includes(text)) return "magical";
  if (["physical", "物理", "物理伤害"].includes(text)) return "physical";
  if (["true", "真实", "黑暗", "暗黑"].includes(text)) return "all";
  return "all";
}

function parseDamage(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const multiplier = /k/i.test(text) ? 1000 : 1;
  const firstNumber = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!firstNumber) return undefined;
  const parsed = Number(firstNumber[0]) * multiplier;
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : undefined;
}

function parseDamageFromRow(row: Record<string, unknown>, primary: unknown): number | undefined {
  const direct = parseDamage(primary);
  if (direct !== undefined) return direct;
  const candidates = Object.entries(row)
    .filter(([key]) => !["time", "时间", "秒", "时间点", "判定", "判定时间", "读条", "读条开始", "开始读条"].includes(key))
    .map(([, value]) => parseDamage(value))
    .filter((value): value is number => value !== undefined);
  return candidates.length ? Math.max(...candidates) : undefined;
}

function inferTarget(name: string, notes: string, explicit: unknown): TimelineTarget {
  const explicitText = String(explicit ?? "").trim();
  const normalized = normalizeTarget(explicitText);
  if (normalized) return normalized;
  const text = `${name} ${notes}`.toLowerCase();
  if (text.includes("双t") || text.includes("mt/st") || text.includes("换t")) return "bothTanks";
  if (text.includes("死刑") || text.includes("平a") || text.includes("aa") || text.includes("solar ray") || text.includes("tankbuster") || text.includes("顺劈")) return "MT";
  return "party";
}

function inferEventType(name: string, damage: number | undefined, target: TimelineTarget): TimelineEventType {
  const text = name.toLowerCase();
  if (text.includes("平a") || text === "aa" || text.includes("_aa") || text.includes("attack") || text.includes("攻击")) return "auto";
  if (text.includes("死刑") || text.includes("tankbuster") || text.includes("solar ray") || text.includes("顺劈")) return "tankbuster";
  if (damage !== undefined && (target === "party" || target === "bothTanks")) return "aoe";
  if (damage !== undefined && target !== "party") return "tankbuster";
  return "mechanic";
}

function severityFrom(row: Record<string, unknown>, damage?: number, type?: TimelineEventType): TimelineEvent["severity"] {
  const text = `${row.name ?? ""} ${row.notes ?? ""}`.toLowerCase();
  if (text.includes("死刑") || text.includes("tankbuster") || text.includes("tb")) return damage && damage > 150000 ? "lethal" : "high";
  if (text.includes("平a") || text.includes("_aa") || text === "aa") return "medium";
  if (damage && damage >= 140000) return "lethal";
  if (damage && damage >= 90000) return "high";
  if (type === "auto") return "medium";
  return "medium";
}

function rowsToEvents(rows: Record<string, unknown>[], fileName: string, sheetName: string): { events: TimelineEvent[]; report: ParseReport } {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columns = mapColumns(headers);
  const skippedRows: ParseReport["skippedRows"] = [];
  const events: TimelineEvent[] = [];

  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const get = (name: CanonicalColumn) => {
      const header = columns.get(name);
      return header ? row[header] : undefined;
    };
    const time = parseTimeToSeconds(get("time"));
    if (time === null) {
      skippedRows.push({ row: rowNo, reason: "无法识别时间", raw: row });
      return;
    }
    const name = String(get("name") || get("enName") || "").trim();
    if (!name) {
      skippedRows.push({ row: rowNo, reason: "事件名为空", raw: row });
      return;
    }
    const notes = [get("notes"), get("enName")].filter(Boolean).join(" / ");
    const target = inferTarget(name, notes, get("target"));
    const damage = parseDamageFromRow(row, get("damage"));
    const duration = parseTimeToSeconds(get("duration")) ?? undefined;
    const damageType = normalizeDamageType(get("type"));
    const type = inferEventType(name, damage, target);
    events.push({
      id: `evt-${index}-${Math.round(time * 1000)}`,
      time,
      name,
      damage: Number.isFinite(damage) ? damage : undefined,
      type,
      damageType,
      target,
      duration,
      notes: notes || undefined,
      severity: severityFrom({ name, notes }, damage, type),
      sourceRow: rowNo,
    });
  });

  events.sort((a, b) => a.time - b.time);
  return {
    events,
    report: {
      fileName,
      eventCount: events.length,
      sheetName,
      recognizedColumns: [...columns.entries()].map(([key, value]) => `${key}: ${value}`),
      skippedRows,
    },
  };
}

function sheetRowsToObjects(rows: unknown[][]): Record<string, unknown>[] | null {
  let bestHeaderIndex = -1;
  let bestScore = 0;
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const headers = rows[index].map((cell) => String(cell ?? "").trim());
    const mapped = mapColumns(headers);
    const score = (mapped.has("time") ? 4 : 0) + (mapped.has("name") ? 3 : 0) + (mapped.has("damage") ? 1 : 0) + (mapped.has("type") ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestHeaderIndex = index;
    }
  }
  if (bestHeaderIndex < 0 || bestScore < 7) return null;
  const seen = new Map<string, number>();
  const headers = rows[bestHeaderIndex].map((cell, index) => {
    const base = String(cell || `未命名列${index + 1}`).trim();
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
  return rows.slice(bestHeaderIndex + 1).map((row) => {
    const object: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      object[header] = row[index] ?? "";
    });
    return object;
  });
}

export async function parseTimelineFile(file: File): Promise<{ events: TimelineEvent[]; report: ParseReport }> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    return rowsToEvents(parsed.data, file.name, "CSV");
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const attempts = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false, blankrows: false });
    const flexibleRows = sheetRowsToObjects(matrix);
    const rows = flexibleRows ?? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    return rowsToEvents(rows, file.name, sheetName);
  });
  const best = attempts.sort((a, b) => b.events.length - a.events.length)[0];
  if (!best) {
    return rowsToEvents([], file.name, "未找到可解析 sheet");
  }
  return best;
}
