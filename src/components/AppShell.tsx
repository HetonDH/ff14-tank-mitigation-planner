import type { ReactNode } from "react";
import { Shield } from "lucide-react";
import type { UiLanguage } from "../types/ui";

interface Props {
  settings: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom?: ReactNode;
  actions: ReactNode;
  language: UiLanguage;
}

export function AppShell({ settings, left, center, right, bottom, actions, language }: Props) {
  const zh = language === "zh";
  return (
    <div className="min-h-screen p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-normal text-slate-50"><Shield className="text-cyan-300" />{zh ? "FF14 坦克减伤排轴" : "FF14 Tank Mitigation Planner"}</h1>
          <p className="mt-1 text-sm text-slate-400">{zh ? "网页端本地工具：导入时间轴、生成推荐、手动拖拽调整。" : "Local web tool: import timelines, generate recommendations, and adjust skills by drag and drop."}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      </header>
      <div className="mb-4">{settings}</div>
      <main className="grid grid-cols-[300px_minmax(620px,1fr)_280px] gap-3">
        <aside>{left}</aside>
        <div>{center}</div>
        <aside className="space-y-4">{right}</aside>
      </main>
      {bottom ? <footer className="mt-4 grid grid-cols-2 gap-4">{bottom}</footer> : null}
    </div>
  );
}
