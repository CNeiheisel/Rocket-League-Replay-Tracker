import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BatchImportResult,
  Player,
  ReplayImportResult,
  ReplayMatch,
  TrendPoint
} from '../models/replay-tracker.models';

interface PlayerApiResponse {
  player_id: number;
  player_name: string;
  matches_played: number;
  avg_goals: number;
  total_goals: number;
  total_assists: number;
  total_saves: number;
  mvp_count: number;
}

interface MatchApiResponse {
  match_id: string;
  map_name?: string;
  match_date?: string;
  game_mode?: string;
  blue_score?: number;
  orange_score?: number;
  winning_team?: string;
  players?: { name: string; team: string }[];
}

interface TrendApiResponse {
  date: string;
  avg_goals: number;
  avg_assists: number;
  avg_saves: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReplayTrackerApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  fetchMatches(limit = 20): Observable<ReplayMatch[]> {
    return this.http
      .get<MatchApiResponse[]>(`${this.apiUrl}/ballchasing/matches?limit=${limit}`)
      .pipe(map((matches) => (Array.isArray(matches) ? matches.map((match) => this.mapMatch(match)) : [])));
  }

  fetchPlayers(): Observable<Player[]> {
    return this.http
      .get<PlayerApiResponse[]>(`${this.apiUrl}/players`)
      .pipe(map((players) => (Array.isArray(players) ? players.map((player) => this.mapPlayer(player)) : [])));
  }

  fetchTrends(playerId: number, days: number): Observable<TrendPoint[]> {
    return this.http
      .get<TrendApiResponse[]>(`${this.apiUrl}/stats/trends?player_id=${playerId}&days=${days}`)
      .pipe(map((trends) => (Array.isArray(trends) ? trends.map((trend) => this.mapTrend(trend)) : [])));
  }

  importReplay(replayId: string): Observable<ReplayImportResult> {
    return this.http.post<ReplayImportResult>(`${this.apiUrl}/replays/import`, { replay_id: replayId });
  }

  batchImport(replayIds: string[]): Observable<BatchImportResult> {
    return this.http.post<BatchImportResult>(`${this.apiUrl}/replays/batch-import`, { replay_ids: replayIds });
  }

  analyzePlayer(payload: { stats: Record<string, number>; current_rank: string }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/analysis/analyze`, payload);
  }

  private mapPlayer(player: PlayerApiResponse): Player {
    return {
      playerId: player.player_id,
      playerName: player.player_name,
      matchesPlayed: player.matches_played,
      averageGoals: Number(player.avg_goals ?? 0),
      totalGoals: Number(player.total_goals ?? 0),
      totalAssists: Number(player.total_assists ?? 0),
      totalSaves: Number(player.total_saves ?? 0),
      mvpCount: Number(player.mvp_count ?? 0)
    };
  }

  private mapMatch(match: MatchApiResponse): ReplayMatch {
    return {
      matchId: match.match_id,
      mapName: match.map_name,
      matchDate: match.match_date,
      gameMode: match.game_mode,
      blueScore: match.blue_score,
      orangeScore: match.orange_score,
      winningTeam: match.winning_team,
      players: Array.isArray(match.players) ? match.players : []
    };
  }

  private mapTrend(trend: TrendApiResponse): TrendPoint {
    return {
      date: trend.date,
      averageGoals: Number(trend.avg_goals ?? 0),
      averageAssists: Number(trend.avg_assists ?? 0),
      averageSaves: Number(trend.avg_saves ?? 0)
    };
  }
}
