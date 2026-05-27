export function parseTimeToSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{3,4}(\.\d+)?$/.test(text)) {
    const numeric = Number(text);
    const minutes = Math.floor(numeric / 100);
    const seconds = numeric - minutes * 100;
    if (seconds < 60) return minutes * 60 + seconds;
  }
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function parseBurstWindows(text: string): number[] {
  return text
    .split(/[,，\s]+/)
    .map((item) => parseTimeToSeconds(item))
    .filter((item): item is number => item !== null)
    .sort((a, b) => a - b);
}

export function inAnyWindow(time: number, windows: number[], radius: number): boolean {
  return windows.some((window) => Math.abs(time - window) <= radius);
}
