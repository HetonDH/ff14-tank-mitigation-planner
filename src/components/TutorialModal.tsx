import { X } from "lucide-react";
import type { UiLanguage } from "../types/ui";

interface Props {
  language: UiLanguage;
  onClose: () => void;
}

const copy = {
  zh: {
    title: "新手教程",
    close: "关闭",
    steps: [
      ["1. 选择双 T", "在顶部设置 MT/ST 的职业、等级和血量。等级会影响技能池，血量后续用于更精细的伤害风险判断。"],
      ["2. 导入时间轴", "上传 Excel 或 CSV 后点击“读取时间轴”。工具会自动扫描多个 sheet，选择最像时间轴的表。"],
      ["3. 认识减伤分类", "大减通常指铁壁和各职业 120 秒主减；小减/特色减多用于平 A 或补死刑；支援减可以给搭档 T；团减用于 AOE；无敌是长 CD 的逃课资源。硬减为乘算，多个同类硬减叠太多会收益递减。"],
      ["4. 校对事件", "点击时间轴上的事件，在右侧详情里把类型改成机制、平 A、单体死刑、双 T 分摊死刑、双 T 分散死刑或 AOE，并校对伤害属性。机制不会参与自动排轴。"],
      ["5. 一键生成", "点击“一键生成最佳减伤”。工具会提前数秒安排技能，死刑尝试大减、小减、特色减组合，AOE 优先团减和雪仇，平 A 优先短 CD 小减。"],
      ["6. 手动调整", "切换“当前操控”后，右侧技能池会显示对应 T 的技能。拖到时间轴上添加，拖动减伤块可调整时间，双击删除。"],
      ["7. 保存方案", "用“导出 JSON”保存当前时间轴、设置、减伤和警告；之后可用“导入 JSON”恢复。"],
    ],
  },
  en: {
    title: "Quick Start",
    close: "Close",
    steps: [
      ["1. Set both tanks", "Configure MT/ST jobs, levels, and HP at the top. Level controls the available skill pool."],
      ["2. Import timeline", "Upload an Excel or CSV file and click Read Timeline. The tool scans sheets and picks the best timeline-like one."],
      ["3. Learn mitigation groups", "Big mits are Rampart and 120s job defensives; short/unique mits help autos and tankbusters; support mits can cover your co-tank; party mits cover AOE; invulns are long-cooldown cheese tools. Hard mitigation stacks multiplicatively, so repeated hard mits have diminishing returns."],
      ["4. Check events", "Click an event and set its type to Mechanic, Auto, Single buster, Shared tank buster, Split tank buster, or AOE. Mechanics are ignored by auto planning."],
      ["5. Generate plan", "Click Generate Best Plan. Skills are scheduled a few seconds early, tankbusters combine big/short/support mitigation, AOE prefers party mitigation/Reprisal, and autos prefer short cooldowns."],
      ["6. Adjust manually", "Switch Current Control to MT or ST. Drag skills from the palette, drag blocks to move them, and double-click manual blocks to delete."],
      ["7. Save", "Export JSON to save events, settings, assignments, and warnings; import JSON to restore later."],
    ],
  },
};

export function TutorialModal({ language, onClose }: Props) {
  const text = copy[language];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <section className="w-full max-w-3xl rounded-lg border border-cyan-500/40 bg-slate-950 shadow-glow">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-xl font-semibold text-slate-50">{text.title}</h2>
          <button className="btn" onClick={onClose} aria-label={text.close}><X size={16} />{text.close}</button>
        </header>
        <div className="grid gap-3 p-5">
          {text.steps.map(([title, body]) => (
            <div key={title} className="rounded-md border border-slate-800 bg-slate-900/70 p-4">
              <div className="font-semibold text-cyan-100">{title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
