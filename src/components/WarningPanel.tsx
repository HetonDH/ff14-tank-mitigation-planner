import type { PlannerWarning } from "../types/mitigation";

interface Props {
  warnings: PlannerWarning[];
}

export function WarningPanel({ warnings }: Props) {
  return (
    <section className="tool-panel p-4">
      <h2 className="mb-3 text-base font-semibold">提示与警告</h2>
      <div className="max-h-56 space-y-2 overflow-auto">
        {warnings.map((warning) => (
          <div key={warning.id} className={`rounded-md border p-3 text-sm ${warning.level === "danger" ? "border-red-400/50 bg-red-500/10 text-red-100" : warning.level === "warning" ? "border-amber-400/50 bg-amber-500/10 text-amber-100" : "border-sky-400/50 bg-sky-500/10 text-sky-100"}`}>
            {warning.message}
          </div>
        ))}
        {!warnings.length && <div className="text-sm text-slate-500">暂无提示。</div>}
      </div>
    </section>
  );
}
