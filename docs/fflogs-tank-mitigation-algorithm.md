# FFLogs 坦克减伤算法研究方案

## 目标

一键生成减伤轴不能只按“遇到第一个危险伤害就交大减”。下一版算法要从高分击杀日志里学习常见坦克减伤节奏，再用本地规则求最优解。

## 数据来源

- FFLogs v2 GraphQL：读取报告、战斗、事件、排行榜/排名入口。当前项目已经通过服务端代理读取 `DamageTaken`、`Casts`、`Buffs`、`Debuffs`、`CombatantInfo`。参考：[FFLogs v2 GraphQL schema](https://www.fflogs.com/v2-api-docs/ff/query.doc.html)。
- FF14 Wiki：用于校对技能等级、冷却、持续、目标和文本描述。例如 Nascent Flash 页面说明它 25 秒复唱、可给队友并提供 10% 减伤/护盾；Cover 页面说明它 120 秒复唱、持续 12 秒并替目标承伤。
- XIVAPI 图标：用于技能和职业图标。参考：[XIVAPI v2 文档](https://v2.xivapi.com/docs/welcome/) 与 [XIVAPI 图标文档](https://xivapi.com/docs/Icons?set=misc)。

## 样本口径

第一批研究样本先按“双 T 双方都紫色以上”建立可用样本池；HPS95+ 继续作为高质量子集参考，但不作为唯一条件，避免样本量过小。

- 副本：当期版本零式四层。
- 战斗：只取 boss 已击杀记录。
- 上传时间：限制在该层零式开荒版本窗口内，避免后期装备碾压污染。
- 职业：PLD / WAR / DRK / GNB 各取排行榜前 100 候选。
- 过滤：双 T 均需要 `rankPercent >= 75`；后续可在文档中单独标记 HPS95+ 子集。
- 区域：不限定 NA / EU / JP / CN，但必须保留 region 字段，方便后续分区对比。
- 搭档：记录搭档 T 职业，按 `PLD+WAR`、`DRK+GNB` 等组合分桶。

## 需要抽取的字段

- 战斗信息：reportCode、fightId、encounterId、kill、duration、region、startTime。
- 玩家信息：两名 T 的职业、名字、等级、最大 HP。
- Boss 伤害轴：技能 ID、中文名、英文名、判定时间、伤害、目标、目标职业、伤害类型。
- 坦克减伤：actionId、技能名、释放者、目标、释放时间、持续时间、CD、覆盖到的伤害事件。
- 资源限制：特别记录 DRK MP 与 The Blackest Night 次数。

## 算法方向

1. 先按整场事件优先级分配资源，而不是逐时间顺序贪心。
2. 把每个伤害事件转成需求：
   - AOE：优先雪仇、特色团减、短 CD 单体盾补低血目标。
   - 单体死刑：允许多层减伤，但限制同类硬减过度堆叠。
   - 双 T 分摊/分散死刑：分别计算 MT/ST 需求，并允许无敌逃课。
   - 平 A：合并为压力窗口，优先短 CD。
   - 单体大伤害/职能机制：默认不消耗大减，除非目标是 T 或用户手动标记。
3. 用动态规划/约束搜索在整场范围内优化：
   - CD 不冲突。
   - 覆盖判定点并提前 `mitigationSafetyBuffer`。
   - 每个技能保留后续高危窗口价值，避免前期交光。
   - 团减默认错开 15 秒。
   - 避免爆发窗口默认关闭，开启时只是软惩罚。
4. DRK 特殊规则：
   - The Blackest Night 15 秒 CD，但会影响 MP。
   - 60 秒爆发周期内最多规划 4 次 TBN，除非用户允许更激进方案。
5. 学习高分样本：
   - 统计每个职业/搭档组合对每类事件的首选技能。
   - 统计同类事件之间的 CD 保留习惯。
   - 统计短 CD 覆盖平 A 的密度。
   - 将统计结果转成评分权重，而不是让 AI 直接决定减伤。

## 当前落地顺序

1. 完善 FFLogs 导入：等级、HP、目标姓名、双 T 伤害视图。
2. 增加样本采集脚本：缓存 Top 100 报告元数据和事件摘要。
3. 写 `src/algorithms/tankMitigationPolicy.ts`：职业/搭档权重表。
4. 逐步重写 `mitigationPlanner.ts`：当前先用整场优先级和长 CD 保留惩罚，后续再升级为更完整的约束搜索。
5. 再做分析报告功能，避免当前规则不稳定时“左右脑互博”。
