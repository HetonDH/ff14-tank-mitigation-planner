import { getSkillsForJob } from "../data/tankJobs";
import type { MitigationAssignment, PlannerResult, PlannerSettings, PlannerWarning, PlayerRole, TankJob } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";
import { formatTime, inAnyWindow } from "../utils/time";
import { isTankbusterEvent, mitigationStackGroup, scoreSkillForEvent, skillMatchesEvent } from "./scoring";
import { eventPriority, sampleInformedSkillBonus, shouldAllowHardMitStack } from "./tankMitigationPolicy";

export interface PlannerInput {
  events: TimelineEvent[];
  mainTankJob: TankJob;
  offTankJob: TankJob;
  mainTankLevel: number;
  offTankLevel: number;
  mainTankHp: number;
  offTankHp: number;
  playerRole: PlayerRole;
  partnerJob: TankJob;
  settings: PlannerSettings;
}

function canCover(start: number, duration: number, event: TimelineEvent, settings: PlannerSettings) {
  const safetyBuffer = Math.max(0, settings.mitigationSafetyBuffer ?? 2);
  return start <= Math.max(0, event.time - safetyBuffer) && start + duration >= event.time;
}

function nextStartFor(event: TimelineEvent, duration: number, settings: PlannerSettings) {
  const safetyBuffer = Math.max(0, settings.mitigationSafetyBuffer ?? 2);
  const castLead = event.duration ? Math.min(8, Math.max(3, Math.floor(event.duration / 2))) : 0;
  const activationLead = isTankbusterEvent(event) || event.type === "aoe" ? 4 : 2;
  const lead = Math.min(duration - 1, Math.max(castLead, activationLead) + safetyBuffer);
  return Math.max(0, event.time - lead);
}

function roleForEvent(event: TimelineEvent, playerRole: PlayerRole): PlayerRole {
  if (event.target === "ST") return "ST";
  if (event.target === "MT") return "MT";
  return playerRole;
}

function targetForEvent(event: TimelineEvent): MitigationAssignment["target"] {
  if (event.target === "party") return "party";
  if (event.target === "bothTanks") return "bothTanks";
  if (event.target === "MT") return "MT";
  if (event.target === "ST") return "ST";
  return "self";
}

function stackPenalty(skillIds: Set<string>, groups: Set<string>, skillId: string, group: string) {
  if (skillIds.has(skillId)) return -500;
  if (group === "hardMit" && groups.has("hardMit")) return -55;
  if (group === "partyMit" && groups.has("partyMit")) return -45;
  if (group === "invuln" && groups.size > 0) return -120;
  return 0;
}

function isOffCooldown(uses: number[] | undefined, start: number, cooldown: number) {
  return !uses?.some((usedAt) => Math.abs(start - usedAt) < cooldown);
}

function pushUse(usesByKey: Map<string, number[]>, key: string, start: number) {
  const uses = usesByKey.get(key) ?? [];
  uses.push(start);
  usesByKey.set(key, uses);
}

function countUsesInMinute(usesByKey: Map<string, number[]>, key: string, start: number) {
  const minuteStart = Math.floor(start / 60) * 60;
  return (usesByKey.get(key) ?? []).filter((usedAt) => usedAt >= minuteStart && usedAt < minuteStart + 60).length;
}

export function planMitigations(input: PlannerInput): PlannerResult {
  const { events, playerRole, settings } = input;
  const zh = settings.language !== "en";
  const warnings: PlannerWarning[] = [];
  const assignments: MitigationAssignment[] = [];
  const mtSkills = getSkillsForJob(input.mainTankJob, input.mainTankLevel);
  const stSkills = getSkillsForJob(input.offTankJob, input.offTankLevel);
  const usesByKey = new Map<string, number[]>();
  const partyMitUses: number[] = [];

  const candidateEvents = events.filter((event) => event.type !== "mechanic" && event.type !== "roleMechanic" && event.target !== "nonTank" && (settings.includeAutoAttacks || event.type !== "auto"));
  const autoWindows = candidateEvents.filter((event) => event.type === "auto");
  const autoWindowIds = new Set(autoWindows.map((event) => event.id));
  const pressureEvents = autoWindows.length
    ? [{ ...autoWindows[0], id: "auto-pressure", name: zh ? "平 A 压力窗口" : "Auto pressure window", time: autoWindows[0].time, duration: Math.max(8, (autoWindows[autoWindows.length - 1]?.time ?? autoWindows[0].time) - autoWindows[0].time + 8), severity: "medium" as const }]
    : [];
  const workEvents = [...candidateEvents.filter((event) => event.type !== "auto"), ...pressureEvents]
    .sort((a, b) => eventPriority(b) - eventPriority(a) || a.time - b.time);

  for (const event of workEvents) {
    const highRisk = event.severity === "high" || event.severity === "lethal" || isTankbusterEvent(event);
    const availableSkillPools = [
      { role: "MT" as PlayerRole, job: input.mainTankJob, skills: mtSkills },
      { role: "ST" as PlayerRole, job: input.offTankJob, skills: stSkills },
    ];
    const desiredRole = roleForEvent(event, playerRole);
    const candidates = availableSkillPools.flatMap((pool) =>
      pool.skills.map((skill) => ({ skill, role: pool.role, job: pool.job })),
    );
    const buildValid = (requiredRole: PlayerRole, forceSingleTankTools: boolean) =>
      candidates
        .filter(({ skill, role }) => {
          const tankLevel = role === "MT" ? input.mainTankLevel : input.offTankLevel;
          if (skill.minLevel > tankLevel) return false;
          if (skill.isInvuln && (!settings.allowInvuln || (!highRisk && !settings.preferInvulnCheese))) return false;
          if (!skillMatchesEvent(skill, event)) return false;
          if (forceSingleTankTools && skill.category === "party") return false;
          if (role !== requiredRole && (skill.category === "personal" || skill.category === "invuln")) return false;
          if (skill.category === "target" && role !== requiredRole && !skill.canTargetPartner) return false;
          if (!forceSingleTankTools && skill.category === "personal" && event.target !== "bothTanks" && role !== requiredRole) return false;
          if (!forceSingleTankTools && skill.category === "target" && event.target !== "bothTanks" && !skill.canTargetPartner && role !== requiredRole) return false;
          if (skill.category === "party" && event.target === "party" && partyMitUses.some((usedAt) => Math.abs(event.time - usedAt) < settings.partyMitigationSpacing)) return false;
          const start = nextStartFor(event, skill.duration, settings);
          const key = `${role}:${skill.id}`;
          if (skill.id === "drk-the-blackest-night" && countUsesInMinute(usesByKey, key, start) >= 4) return false;
          return isOffCooldown(usesByKey.get(key), start, skill.cooldown);
        })
        .map((candidate) => {
          const start = nextStartFor(event, candidate.skill.duration, settings);
          const partnerJob = candidate.role === "MT" ? input.offTankJob : input.mainTankJob;
          return { ...candidate, start, score: scoreSkillForEvent(candidate.skill, event, start, settings) + sampleInformedSkillBonus(candidate.skill, event, 0, candidate.job, partnerJob) };
        })
        .filter(({ skill, start }) => canCover(start, skill.duration, event, settings))
        .sort((a, b) => b.score - a.score);

    if (event.target === "bothTanks") {
      for (const requiredRole of ["MT", "ST"] as PlayerRole[]) {
        const chosen = buildValid(requiredRole, true)[0];
        if (!chosen) {
          warnings.push({
            id: `warn-uncovered-${event.id}-${requiredRole}`,
            level: highRisk ? "danger" : "warning",
            eventId: event.id,
            message: zh ? `${formatTime(event.time)}「${event.name}」没有给 ${requiredRole} 找到可用减伤。` : `${formatTime(event.time)} "${event.name}" has no available mitigation for ${requiredRole}.`,
          });
          continue;
        }

        const assignment: MitigationAssignment = {
          id: `auto-${event.id}-${requiredRole}-${chosen.skill.id}`,
          skillId: chosen.skill.id,
          skillName: chosen.skill.zhName,
          casterRole: chosen.role,
          casterJob: chosen.job,
          target: requiredRole,
          start: chosen.start,
          end: chosen.start + chosen.skill.duration,
          duration: chosen.skill.duration,
          eventIds: [event.id],
          source: "auto",
        };

        if (settings.avoidBurstWindows && inAnyWindow(chosen.start, settings.burstWindows, settings.burstWindowRadius)) {
          assignment.warning = zh ? "落在爆发窗口附近；因覆盖或 CD 需要仍然安排。" : "Near a burst window; kept because coverage or cooldown requires it.";
          warnings.push({
            id: `warn-burst-${assignment.id}`,
            level: "info",
            assignmentId: assignment.id,
            message: zh ? `${assignment.skillName} 安排在 ${formatTime(assignment.start)}，靠近爆发窗口。` : `${assignment.skillName} is scheduled at ${formatTime(assignment.start)}, near a burst window.`,
          });
        }

        assignments.push(assignment);
        pushUse(usesByKey, `${chosen.role}:${chosen.skill.id}`, chosen.start);
        if (chosen.skill.category === "party") partyMitUses.push(event.time);
      }
      continue;
    }

    const valid = buildValid(desiredRole, false);
    const neededLayers = isTankbusterEvent(event) ? (event.severity === "lethal" ? 3 : 2) : event.type === "aoe" && event.severity === "high" ? 2 : 1;
    const chosenList = [];
    const usedSkillIds = new Set<string>();
    const usedGroups = new Set<string>();
    for (let index = 0; index < neededLayers; index += 1) {
      const chosen = valid
        .filter((candidate) => !usedSkillIds.has(candidate.skill.id))
        .filter((candidate) => shouldAllowHardMitStack(event) || mitigationStackGroup(candidate.skill) !== "hardMit" || !usedGroups.has("hardMit"))
        .map((candidate) => {
          const group = mitigationStackGroup(candidate.skill);
          return {
            ...candidate,
            adjustedScore: candidate.score
              + sampleInformedSkillBonus(candidate.skill, event, index, candidate.job, candidate.role === "MT" ? input.offTankJob : input.mainTankJob)
              + stackPenalty(usedSkillIds, usedGroups, candidate.skill.id, group),
          };
        })
        .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];
      if (!chosen) break;
      chosenList.push(chosen);
      usedSkillIds.add(chosen.skill.id);
      usedGroups.add(mitigationStackGroup(chosen.skill));
    }
    if (!chosenList.length) {
      warnings.push({
        id: `warn-uncovered-${event.id}`,
        level: highRisk ? "danger" : "warning",
        eventId: event.id,
        message: zh ? `${formatTime(event.time)}「${event.name}」没有找到完全匹配且 CD 可用的减伤。` : `${formatTime(event.time)} "${event.name}" has no fully matching mitigation off cooldown.`,
      });
      continue;
    }

    for (const chosen of chosenList) {
      const assignment: MitigationAssignment = {
        id: `auto-${event.id}-${chosen.skill.id}-${assignments.length}`,
        skillId: chosen.skill.id,
        skillName: chosen.skill.zhName,
        casterRole: chosen.role,
        casterJob: chosen.job,
        target: targetForEvent(event),
        start: chosen.start,
        end: chosen.start + chosen.skill.duration,
        duration: chosen.skill.duration,
        eventIds: event.id === "auto-pressure" ? [...autoWindowIds] : [event.id],
        source: "auto",
      };

      if (settings.avoidBurstWindows && inAnyWindow(chosen.start, settings.burstWindows, settings.burstWindowRadius)) {
        assignment.warning = zh ? "落在爆发窗口附近；因覆盖或 CD 需要仍然安排。" : "Near a burst window; kept because coverage or cooldown requires it.";
        warnings.push({
          id: `warn-burst-${assignment.id}`,
          level: "info",
          assignmentId: assignment.id,
          message: zh ? `${assignment.skillName} 安排在 ${formatTime(assignment.start)}，靠近爆发窗口。` : `${assignment.skillName} is scheduled at ${formatTime(assignment.start)}, near a burst window.`,
        });
      }

      assignments.push(assignment);
      pushUse(usesByKey, `${chosen.role}:${chosen.skill.id}`, chosen.start);
      if (chosen.skill.category === "party") partyMitUses.push(event.time);
    }

    if (isTankbusterEvent(event) && chosenList.filter((chosen) => mitigationStackGroup(chosen.skill) === "hardMit").length > 1) {
      warnings.push({
        id: `warn-hardmit-stack-${event.id}`,
        level: "info",
        eventId: event.id,
        message: zh ? `${formatTime(event.time)}「${event.name}」叠加了多个硬减；硬减为乘算，收益会递减，建议确认是否真的需要。` : `${formatTime(event.time)} "${event.name}" stacks multiple hard mitigations. Percent mitigation is multiplicative, so returns diminish; please confirm it is needed.`,
      });
    }
  }

  const coveredIds = new Set(assignments.flatMap((assignment) => assignment.eventIds));
  return {
    assignments: assignments.sort((a, b) => a.start - b.start),
    warnings,
    summary: {
      eventCount: events.length,
      coveredEventCount: events.filter((event) => coveredIds.has(event.id)).length,
      assignmentCount: assignments.length,
      highRiskCount: events.filter((event) => event.severity === "high" || event.severity === "lethal").length,
      notes: [
        zh ? "当前为本地规则算法，优先检查 CD、覆盖、目标、伤害类型与等级。" : "This is a local rules-based planner that checks cooldowns, coverage, targets, damage type, and level.",
        zh ? `减伤会尽量提前开启，当前额外预留 ${settings.mitigationSafetyBuffer ?? 2} 秒判定缓冲。` : `Mitigation is scheduled early with an extra ${settings.mitigationSafetyBuffer ?? 2}s safety buffer.`,
        zh ? "死刑会避免过度堆叠同类硬减，优先组合大减、短 CD、支援减或无敌。" : "Tank busters try to avoid overstacking the same hard mitigation group and prefer mixed layers.",
        zh ? "平 A 会合并成压力窗口，避免每条平 A 都消耗大减伤。" : "Autos are merged into pressure windows to avoid spending large cooldowns on every auto.",
      ],
    },
  };
}
