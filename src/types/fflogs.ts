export interface FFLogsActor {
  id: number;
  name: string;
  type?: string;
  subType?: string;
  server?: string;
}

export interface FFLogsAbility {
  gameID?: number;
  id?: number;
  name: string;
  type?: string | number;
}

export interface FFLogsEvent {
  type: string;
  timestamp: number;
  sourceID?: number;
  targetID?: number;
  abilityGameID?: number;
  abilityID?: number;
  packetID?: number;
  amount?: number;
  unmitigatedAmount?: number;
  absorbed?: number;
  multiplier?: number;
  overkill?: number;
  tick?: boolean;
  targetResources?: {
    hitPoints?: number;
    maxHitPoints?: number;
  };
}

export interface FFLogsImportInput {
  events: FFLogsEvent[];
  actors: FFLogsActor[];
  abilities: FFLogsAbility[];
  fightStartTime?: number;
  title?: string;
}
