export type FlagKind = "country" | "state" | null;

export interface Flag {
  kind: FlagKind;
  code: string | null;
  label: string;
}

export interface Team {
  key: string;
  number: number;
  nickname: string;
  city: string | null;
  state_prov: string | null;
  country: string | null;
  hasAvatar: boolean;
  flag: Flag;
}

export type AllianceStatus = "won" | "eliminated" | "playing" | "unknown";

export interface AllianceRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface Alliance {
  seed: number;
  name: string;
  picks: string[];
  status: AllianceStatus;
  record: AllianceRecord | null;
  double_elim_round: string | null;
}

export type Color = "red" | "blue";

export interface SideInfo {
  seed: number | null;
  teams: string[];
  score: number | null;
}

export interface Slot {
  id: string;
  level: "sf";
  set: number;
  round: BracketRoundLabel;
  played: boolean;
  red: SideInfo;
  blue: SideInfo;
  winner: Color | null;
  time: number | null;
}

export interface GrandFinalGame {
  match_number: number;
  played: boolean;
  red: SideInfo;
  blue: SideInfo;
  winner: Color | null;
  time: number | null;
}

export interface AwardRecipient {
  teamKey: string | null;
  awardee: string | null;
}

export interface Award {
  name: string;
  awardType: number;
  recipients: AwardRecipient[];
}

export interface DivisionEvent {
  key: string;
  name: string;
  type: 3 | 4;
  teamKeys: string[];
  alliances: Alliance[];
  slots: Slot[];
  grandFinal: { games: GrandFinalGame[] };
  awards: Award[];
}

export interface Snapshot {
  year: number;
  updatedAt: string;
  divisions: (DivisionEvent | null)[];
  einstein: DivisionEvent | null;
  revealEinstein: boolean;
  teams: Record<string, Team>;
}

export type BracketRoundLabel =
  | "UB R1"
  | "UB R2"
  | "UB Final"
  | "LB R1"
  | "LB R2"
  | "LB R3"
  | "LB Final";

export interface BracketSlotDef {
  id: string;
  level: "sf";
  set: number;
  round: BracketRoundLabel;
}

export const BRACKET_SLOTS: BracketSlotDef[] = [
  { id: "sf-1", level: "sf", set: 1, round: "UB R1" },
  { id: "sf-2", level: "sf", set: 2, round: "UB R1" },
  { id: "sf-3", level: "sf", set: 3, round: "UB R1" },
  { id: "sf-4", level: "sf", set: 4, round: "UB R1" },
  { id: "sf-5", level: "sf", set: 5, round: "LB R1" },
  { id: "sf-6", level: "sf", set: 6, round: "LB R1" },
  { id: "sf-7", level: "sf", set: 7, round: "UB R2" },
  { id: "sf-8", level: "sf", set: 8, round: "UB R2" },
  { id: "sf-9", level: "sf", set: 9, round: "LB R2" },
  { id: "sf-10", level: "sf", set: 10, round: "LB R2" },
  { id: "sf-11", level: "sf", set: 11, round: "UB Final" },
  { id: "sf-12", level: "sf", set: 12, round: "LB R3" },
  { id: "sf-13", level: "sf", set: 13, round: "LB Final" },
];
