# FF14 Tank Mitigation Planner

一个网页端 FF14 坦克减伤排轴工具。

它可以读取 Excel / CSV 时间轴，配置 MT/ST 职业与等级，然后生成初步减伤建议。你也可以手动把技能拖到时间轴上调整，并导出 JSON 保存方案。

## 功能

- 支持骑士、战士、暗黑骑士、绝枪战士
- 支持 MT/ST 双坦设置
- 支持 Excel / CSV 导入
- 支持 FFLogs 报告链接入口、FFLogs 事件 JSON、本地日志实验导入
- 支持事件类型：机制、平 A、单体死刑、双 T 分摊死刑、双 T 分散死刑、AOE
- 支持一键生成减伤与手动拖拽调整
- 支持中文 / English 界面切换
- 支持导入 / 导出 JSON
- 排轴规则参考常见高难减伤轴思路：死刑优先组合不同类别减伤，避免同类硬减过度重叠；平 A 优先短 CD 小减；AOE 优先团减和雪仇；技能会尽量提前开启
- FFLogs 标准导入参考 healerbook 的思路：报告链接解析为 `reportCode + fightId`，再交给代理读取 FFLogs 标准事件流

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的本地地址，通常是：

```text
http://localhost:5173
```

如果使用本机 E 盘便携环境：

```powershell
E:\ff14-tank-mitigation-planner\dev.ps1
```

## 构建

```bash
npm run build
```

构建产物在 `dist/`，可部署到 Vercel / Netlify / GitHub Pages。

## 说明

当前算法是本地规则算法，不接后端，也不接 OpenAI API。  
FFLogs API 直连需要 OAuth 密钥和代理服务。纯前端不能安全保存密钥，所以报告链接入口需要配置 `VITE_FFLOGS_PROXY_BASE` 指向 Worker/后端代理；未配置时可以先上传或粘贴 FFLogs 事件 JSON。本地 `.log/.txt` 为实验解析，需要用真实样本继续校对。
它会检查技能等级、CD、覆盖时间、目标和伤害属性，但仍需要玩家根据副本机制自行校对。
硬减是乘算，多个百分比减伤叠加会有收益递减；工具会降低重复硬减的优先级，但高危死刑仍可能保守叠减并给出提示。
