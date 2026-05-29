# FF14 Tank Mitigation Planner

一个网页端 FF14 坦克减伤排轴工具。

它可以读取 FFLogs 链接或日志文件，配置 MT/ST 职业与等级，然后生成初步减伤建议。你也可以手动把技能拖到时间轴上调整，并导出 JSON 保存方案。

## 功能

- 支持骑士、战士、暗黑骑士、绝枪战士
- 支持 MT/ST 双坦设置
- 支持 FFLogs 报告链接导入
- 支持 FFLogs 事件 JSON / 本地日志文件兜底导入
- 支持事件类型：机制、平 A、单体死刑、双 T 分摊死刑、双 T 分散死刑、AOE
- 支持一键生成减伤与手动拖拽调整
- 支持中文 / English 界面切换
- 支持导入 / 导出 JSON
- 排轴规则参考常见高难减伤轴思路：死刑优先组合不同类别减伤，避免同类硬减过度重叠；平 A 优先短 CD 小减；AOE 优先团减和雪仇；技能会尽量提前开启
- FFLogs 标准导入：报告链接解析为 `reportCode + fightId`，再交给代理读取标准事件流

## 本地运行

复制环境变量模板：

```bash
cp .env.example .env.local
```

填入 FFLogs 凭据：

```text
FFLOGS_CLIENT_ID=你的 FFLogs Client ID
FFLOGS_CLIENT_SECRET=你的 FFLogs Client Secret
FFLOGS_REGION=cn
```

然后运行：

```bash
npm install
npm run dev
```

打开终端显示的本地地址，通常是：

```text
http://localhost:5173
```

现在 `npm run dev` 会同时启动网页和本地 `/api/fflogs/import`，可以直接粘贴 FFLogs 链接测试。

如果使用本机 E 盘便携环境：

```powershell
E:\ff14-tank-mitigation-planner\dev.ps1
```

## 构建

```bash
npm run build
```

构建产物在 `dist/`，可部署到 Vercel / Netlify / GitHub Pages。

## Vercel FFLogs 导入

本项目已内置 Vercel Serverless API：`/api/fflogs/import`。

在 Vercel 项目里添加环境变量：

```text
FFLOGS_CLIENT_ID=你的 FFLogs Client ID
FFLOGS_CLIENT_SECRET=你的 FFLogs Client Secret
FFLOGS_REGION=cn
```

部署后，在页面左侧粘贴类似下面的链接即可导入：

```text
https://www.fflogs.com/reports/ABC123#fight=5
```

`zh.fflogs.com` / `www.fflogs.com` 链接都可以贴；如果区域不匹配，代理会尝试在国服区和国际区之间自动 fallback。

如果前端和代理分开部署，再额外设置：

```text
VITE_FFLOGS_PROXY_BASE=https://你的代理域名/api
```

## 说明

当前算法是本地规则算法，不接后端，也不接 OpenAI API。  
FFLogs API 直连需要 OAuth 密钥，所以报告链接导入通过 Vercel `/api` 代理完成；本地 `.log/.txt` 仍是实验解析，需要用真实样本继续校对。
它会检查技能等级、CD、覆盖时间、目标和伤害属性，但仍需要玩家根据副本机制自行校对。
硬减是乘算，多个百分比减伤叠加会有收益递减；工具会降低重复硬减的优先级，但高危死刑仍可能保守叠减并给出提示。
