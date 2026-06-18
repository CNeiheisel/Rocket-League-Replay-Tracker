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
      .get<MatchApiResponse[]>(`${this.apiUrl}/matches?limit=${limit}`)
      .pipe(map((matches: MatchApiResponse[]) => (Array.isArray(matches) ? matches.map((match: MatchApiResponse) => this.mapMatch(match)) : [])));
  }

  fetchPlayers(): Observable<Player[]> {
    return this.http
      .get<PlayerApiResponse[]>(`${this.apiUrl}/players`)
      .pipe(map((players: PlayerApiResponse[]) => (Array.isArray(players) ? players.map((player: PlayerApiResponse) => this.mapPlayer(player)) : [])));
  }

  fetchTrends(playerId: number, days: number): Observable<TrendPoint[]> {
    return this.http
      .get<TrendApiResponse[]>(`${this.apiUrl}/stats/trends?player_id=${playerId}&days=${days}`)
      .pipe(map((trends: TrendApiResponse[]) => (Array.isArray(trends) ? trends.map((trend: TrendApiResponse) => this.mapTrend(trend)) : [])));
  }

  importReplay(replayId: string): Observable<ReplayImportResult> {
    return this.http.post<ReplayImportResult>(`${this.apiUrl}/replays/import`, { replay_id: replayId });
  }

  batchImport(replayIds: string[]): Observable<BatchImportResult> {
    return this.http.post<BatchImportResult>(`${this.apiUrl}/replays/batch-import`, { replay_ids: replayIds });
  }

  // Analyze a player across all their imported games
  analyzePlayerAcrossGames(playerId: number): Observable<unknown> {
    return new Observable(observer => {
      this.http.get(`${this.apiUrl}/players/${playerId}/match-stats`).subscribe({
        next: (data: unknown) => {
          const d = data as Record<string, unknown>;
          this.http.post(`${this.apiUrl}/analysis/analyze-player`, {
            player_name: d['player_name'],
            aggregated_stats: d['aggregated_stats'],
            recent_games: d['recent_games']
          }).subscribe({
            next: val => observer.next(val),
            error: err => observer.error(err),
            complete: () => observer.complete()
          });
        },
        error: err => observer.error(err)
      });
    });
  }

  // Analyze a specific player in a specific match
  analyzeSingleGame(matchId: string, playerName: string): Observable<unknown> {
    return new Observable(observer => {
      this.http.get(`${this.apiUrl}/matches/${matchId}/player-stats`).subscribe({
        next: (data: unknown) => {
          const d = data as Record<string, unknown>;
          const players = Array.isArray(d['players']) ? d['players'] : [];
          const playerStats = players.find(
            (p: unknown) => (p as Record<string, unknown>)['player_name'] === playerName
          ) as Record<string, unknown> | undefined;

          this.http.post(`${this.apiUrl}/analysis/analyze`, {
            player_name: playerName,
            stats: playerStats ?? {},
            match_info: d['match']
          }).subscribe({
            next: val => observer.next(val),
            error: err => observer.error(err),
            complete: () => observer.complete()
          });
        },
        error: err => observer.error(err)
      });
    });
  }

  analyzePlayer(payload: { stats: Record<string, number>; current_rank: string }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/analysis/analyze`, payload);
  }

  private mapPlayer(player: PlayerApiResponse): Player {
    return {
      playerId: player.player_id,
      playerName: player.player_name,
      matchesPlayed: Number(player.matches_played ?? 0),
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
      blueScore: match.blue_score ?? 0,
      orangeScore: match.orange_score ?? 0,
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