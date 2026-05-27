# FF14 坦克减伤排轴

这是一个网页端本地工具，用于把 FF14 副本时间轴转换成坦克减伤建议。用户可以上传 Excel 或 CSV，选择自己的职责、职业和搭档职业，一键生成推荐减伤，也可以把右侧技能池里的技能拖到时间轴上手动调整。

本项目不是 ACT 插件、浏览器插件或桌面端应用。所有逻辑暂时只在浏览器本地运行，不需要后端，也没有接入真实 OpenAI API。

## 当前功能

- 支持 MT/ST 双坦配置：职业、等级、血量。
- 支持中文/英文界面切换。
- 内置“新手教程”弹窗。
- 支持 Excel / CSV 时间轴导入，并自动扫描多个 sheet。
- 事件类型拆分为：机制、平 A、死刑、AOE。
- 伤害属性拆分为：全类型、物理、魔法。
- 一键生成减伤时，死刑会尝试多层叠减，双 T 死刑会分别给 MT/ST 排轴。
- AOE 优先团减与雪仇，也允许单体小减伤作为补充。
- 默认避让 60 秒小爆发和 120 秒团辅大爆发窗口。
- 团减错开秒数固定为 15 秒。
- 可开启“优先无敌逃课”，用于更积极地安排无敌处理高危死刑或双人死刑。
- 手动拖拽减伤到时间轴，手动减伤可再次拖动调整时间，双击删除。
- CD 冲突会生成警告，并在时间轴和表格中红色高亮。
- 支持导出/导入 JSON 保存排轴状态。

## 本地启动

```bash
npm install
npm run dev
```

启动后访问终端显示的本地地址，通常是 `http://localhost:5173`。

当前这台机器也已配置 E 盘便携 Node.js：

- Node.js：`E:\tools\node-v24.16.0-win-x64`
- 项目：`E:\ff14-tank-mitigation-planner`

如果系统全局 `npm` 不可用，可以直接运行：

```powershell
E:\ff14-tank-mitigation-planner\dev.ps1
```

或手动执行：

```powershell
$env:Path = "E:\tools\node-v24.16.0-win-x64;" + $env:Path
cd E:\ff14-tank-mitigation-planner
npm run dev
```

## 构建

```bash
npm run build
```

构建产物会输出到 `dist/`，可以部署到 Vercel、Netlify 或静态文件服务。

如果使用 E 盘便携 Node.js，也可以运行：

```powershell
E:\ff14-tank-mitigation-planner\build.ps1
```

## 部署到 Vercel

1. 把项目推送到 Git 仓库。
2. 在 Vercel 新建项目并选择该仓库。
3. Framework Preset 选择 `Vite`。
4. Build Command 使用 `npm run build`。
5. Output Directory 使用 `dist`。

不需要配置后端服务或环境变量。

## GitHub Pages

如果部署在用户站点根路径，例如 `https://name.github.io/`，通常不需要额外配置。

如果部署在仓库子路径，例如 `https://name.github.io/repo-name/`，需要在 `vite.config.ts` 中添加：

```ts
export default defineConfig({
  base: "/repo-name/",
  plugins: [react()],
});
```

## Excel / CSV 模板格式

首行需要是列名。支持的列如下：

| 列 | 支持写法 | 说明 |
| --- | --- | --- |
| 时间 | `time` / `时间` / `秒` / `时间点` | 支持 `90`、`01:30`、`1:30`、`00:01:30` |
| 事件名 | `name` / `技能名` / `伤害名` / `事件名` | 必填 |
| 伤害 | `damage` / `伤害` / `伤害量` | 可选 |
| 类型 | `type` / `类型` / `伤害类型` | 可选，未填按全类型处理 |
| 目标 | `target` / `目标` / `受击目标` | 可选，未填按 MT |
| 持续 | `duration` / `持续` / `持续时间` | 可选 |
| 备注 | `notes` / `备注` | 可选 |

## 支持的 target 写法

- `MT`
- `ST`
- `MT/ST`
- `双T`
- `全体`
- `party`
- `all`
- `self`

## 支持的 type 写法

- `magic` / `魔法` / `魔法伤害`
- `physical` / `物理` / `物理伤害`
- `true` / `真实`
- `auto` / `平A` / `auto attack`

## 当前算法限制

- 当前是一版规则算法，会检查技能等级、CD、覆盖时间、目标、事件类型、伤害属性、无敌开关和团减错开。
- 平 A 会合并为压力窗口，避免每一条平 A 都使用大减伤。
- 无敌只会优先分配给高危死刑或高危双 T 事件，但尚未完整模拟团队站位、分摊人数、治疗资源和真实血量。
- 部分 7.4 技能数值需要继续校对，代码中已对暗黑骑士「暗影卫」和绝枪战士「大星云」添加 TODO 备注。
- 当前不会模拟 FF14 的全部增益叠乘公式，只做排轴推荐和冲突提示。

## 后续如何接 AI

未来 AI 适合接在 `src/algorithms/mitigationPlanner.ts` 之后，作为“解释、优化建议、候选方案排序”的增强层，而不是替代核心规则算法。

建议路径：

1. 保留 `mitigationPlanner.ts` 作为确定性的基础排轴引擎。
2. 新增 `src/algorithms/aiAdvisor.ts`，输入 `events`、`assignments`、`settings`、`warnings`。
3. AI 只返回中文解释、风险点、可选替代方案，不直接绕过 CD 和覆盖检查。
4. 所有 AI 建议再进入本地校验函数，确认技能等级、CD、时间覆盖和目标合法。
