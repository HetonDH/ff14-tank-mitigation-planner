import type { PlannerWarning } from "../types/mitigation";
import type { UiLanguage } from "../types/ui";

interface Props {
  language: UiLanguage;
  warnings: PlannerWarning[];
}

export function WarningPanel({ language, warnings }: Props) {
  const zh = language === "zh";
  const meta = {
    danger: { title: zh ? "危险" : "Danger", className: "border-red-400/50 bg-red-500/10 text-red-100" },
    warning: { title: zh ? "注意" : "Warning", className: "border-amber-400/50 bg-amber-500/10 text-amber-100" },
    info: { title: zh ? "提示" : "Info", className: "border-sky-400/50 bg-sky-500/10 text-sky-100" },
  } as const;
  return (
    <section className="tool-panel p-3">
      <h2 className="mb-2 text-sm font-semibold">{zh ? "提示与警告" : "Warnings"}</h2>
      <div className="max-h-56 space-y-2 overflow-auto">
        {warnings.map((warning) => {
          const item = meta[warning.level];
          return (
          <div key={warning.id} className={`rounded-md border p-2.5 text-xs ${item.className}`}>
            <div className="mb-1 font-semibold">{item.title}</div>
            <div className="leading-5">{warning.message}</div>
          </div>
          );
        })}
        {!warnings.length && <div className="text-sm text-slate-500">{zh ? "暂无提示。" : "No warnings."}</div>}
      </div>
    </section>
  );
}
