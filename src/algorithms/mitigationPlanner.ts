import { getSkillsForJob } from "../data/tankJobs";
import type { MitigationAssignment, PlannerResult, PlannerSettings, PlannerWarning, PlayerRole, TankJob } from "../types/mitigation";
import type { TimelineEvent } from "../types/timeline";
import { formatTime, inAnyWindow } from "../utils/time";
import { scoreSkillForEvent, skillMatchesEvent } from "./scoring";

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

function canCover(start: number, duration: number, event: TimelineEvent) {
  return start <= event.time && start + duration >= event.time;
}

function nextStartFor(event: TimelineEvent, duration: number) {
  return Math.max(0, event.time - Math.min(4, Math.floor(duration / 2)));
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

export function planMitigations(input: PlannerInput): PlannerResult {
  const { events, playerRole, settings } = input;
  const warnings: PlannerWarning[] = [];
  const assignments: MitigationAssignment[] = [];
  const mtSkills = getSkillsForJob(input.mainTankJob, input.mainTankLevel);
  const stSkills = getSkillsForJob(input.offTankJob, input.offTankLevel);
  const lastUse = new Map<string, number>();
  let lastPartyMit = -Infinity;

  const candidateEvents = events.filter((event) => event.type !== "mechanic" && (settings.includeAutoAttacks || event.type !== "auto"));
  const autoWindows = candidateEvents.filter((event) => event.type === "auto");
  const autoWindowIds = new Set(autoWindows.map((event) => event.id));
  const pressureEvents = autoWindows.length
    ? [{ ...autoWindows[0], id: "auto-pressure", name: "平 A 压力窗口", time: autoWindows[0].time, duration: Math.max(8, (autoWindows[autoWindows.length - 1]?.time ?? autoWindows[0].time) - autoWindows[0].time + 8), severity: "medium" as const }]
    : [];
  const workEvents = [...candidateEvents.filter((event) => event.type !== "auto"), ...pressureEvents].sort((a, b) => a.time - b.time);

  for (const event of workEvents) {
    const highRisk = event.severity === "high" || event.severity === "lethal" || event.type === "tankbuster";
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
          if (skill.category === "party" && event.target === "party" && event.time - lastPartyMit < settings.partyMitigationSpacing) return false;
          const start = nextStartFor(event, skill.duration);
          const last = lastUse.get(`${role}:${skill.id}`);
          return last === undefined || start - last >= skill.cooldown;
        })
        .map((candidate) => {
          const start = nextStartFor(event, candidate.skill.duration);
          return { ...candidate, start, score: scoreSkillForEvent(candidate.skill, event, start, settings) };
        })
        .filter(({ skill, start }) => canCover(start, skill.duration, event))
        .sort((a, b) => b.score - a.score);

    if (event.target === "bothTanks") {
      for (const requiredRole of ["MT", "ST"] as PlayerRole[]) {
        const chosen = buildValid(requiredRole, true)[0];
        if (!chosen) {
          warnings.push({
            id: `warn-uncovered-${event.id}-${requiredRole}`,
            level: highRisk ? "danger" : "warning",
            eventId: event.id,
            message: `${formatTime(event.time)}「${event.name}」没有给 ${requiredRole} 找到可用减伤。`,
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
          assignment.warning = "落在爆发窗口附近；因覆盖或 CD 需要仍然安排。";
          warnings.push({
            id: `warn-burst-${assignment.id}`,
            level: "info",
            assignmentId: assignment.id,
            message: `${assignment.skillName} 安排在 ${formatTime(assignment.start)}，靠近爆发窗口。`,
          });
        }

        assignments.push(assignment);
        lastUse.set(`${chosen.role}:${chosen.skill.id}`, chosen.start);
      }
      continue;
    }

    const valid = buildValid(desiredRole, false);
    const neededLayers = event.type === "tankbuster" ? (event.severity === "lethal" ? 3 : 2) : 1;
    const chosenList = valid.slice(0, neededLayers);
    if (!chosenList.length) {
      warnings.push({
        id: `warn-uncovered-${event.id}`,
        level: highRisk ? "danger" : "warning",
        eventId: event.id,
        message: `${formatTime(event.time)}「${event.name}」没有找到完全匹配且 CD 可用的减伤。`,
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
        assignment.warning = "落在爆发窗口附近；因覆盖或 CD 需要仍然安排。";
        warnings.push({
          id: `warn-burst-${assignment.id}`,
          level: "info",
          assignmentId: assignment.id,
          message: `${assignment.skillName} 安排在 ${formatTime(assignment.start)}，靠近爆发窗口。`,
        });
      }

      assignments.push(assignment);
      lastUse.set(`${chosen.role}:${chosen.skill.id}`, chosen.start);
      if (chosen.skill.category === "party") lastPartyMit = event.time;
    }
  }

  const coveredIds = new Set(assignments.flatMap((assignment) => assignment.eventIds));
  return {
    assignments,
    warnings,
    summary: {
      eventCount: events.length,
      coveredEventCount: events.filter((event) => coveredIds.has(event.id)).length,
      assignmentCount: assignments.length,
      highRiskCount: events.filter((event) => event.severity === "high" || event.severity === "lethal").length,
      notes: [
        "当前为本地规则算法，优先检查 CD、覆盖、目标、伤害类型与等级。",
        "平 A 会合并成压力窗口，避免每条平 A 都消耗大减伤。",
      ],
    },
  };
}
