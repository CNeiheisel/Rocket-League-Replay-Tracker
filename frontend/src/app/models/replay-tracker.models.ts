export interface Player {
  playerId: number;
  playerName: string;
  matchesPlayed: number;
  averageGoals: number;
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  mvpCount: number;
}

export interface MatchPlayer {
  name: string;
  team: 'blue' | 'orange' | string;
}

export interface ReplayMatch {
  matchId: string;
  mapName?: string;
  matchDate?: string;
  gameMode?: string;
  blueScore?: number;
  orangeScore?: number;
  winningTeam?: string;
  players: MatchPlayer[];
}

export interface TrendPoint {
  date: string;
  averageGoals: number;
  averageAssists: number;
  averageSaves: number;
}

export interface ReplayImportResult {
  success?: boolean;
}

export interface BatchImportResult {
  success?: string[];
  skipped?: string[];
  failed?: string[];
}
