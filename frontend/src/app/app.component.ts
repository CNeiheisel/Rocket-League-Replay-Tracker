import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiCoachComponent } from './ai-coach/ai-coach.component';
import { environment } from '../environments/environment';

interface Player {
  player_id: number;
  player_name: string;
  matches_played: number;
  avg_goals: number;
  total_goals: number;
  total_assists: number;
  total_saves: number;
  mvp_count: number;
}

interface Match {
  match_id: string;
  map_name?: string;
  match_date?: string;
  game_mode?: string;
  blue_score?: number;
  orange_score?: number;
  winning_team?: string;
  players?: { name: string; team: string }[];
}

interface Trend {
  date: string;
  avg_goals: number;
  avg_assists: number;
  avg_saves: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, AiCoachComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Rocket League Replay Tracker';
  activeTab = 'overview';
  replayId = '';
  batchReplayIds = '';
  uploadStatus = '';
  loading = true;
  players: Player[] = [];
  matches: Match[] = [];
  selectedPlayer?: Player;
  selectedPlayerId: number | '' = '';
  filter = { days: 30 };
  trends: Trend[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  stripZeros(value: number): number {
    return parseFloat(String(value));
  }

  hasTeamPlayers(match: Match, team: string): boolean {
    return Array.isArray((match as any).players) && ((match as any).players as any[]).some((p) => p.team === team);
  }

  getScoreStyle(match: Match, team: string) {
    const isWinner = match.winning_team === team;
    const blueGradient = 'linear-gradient(to right, #3b82f6, #2563eb)';
    const orangeGradient = 'linear-gradient(to right, #f97316, #dc2626)';
    const blueFallback = 'rgba(59, 130, 246, 0.3)';
    const orangeFallback = 'rgba(249, 115, 22, 0.3)';

    return {
      padding: '8px 16px',
      'border-radius': '8px',
      background: team === 'blue' ? (isWinner ? blueGradient : blueFallback) : isWinner ? orangeGradient : orangeFallback,
      color: 'white'
    } as any;
  }

  loadData(): void {
    this.loading = true;
    Promise.all([this.fetchMatches(), this.fetchPlayers()]).finally(() => {
      this.loading = false;
    });
  }

  async fetchMatches(): Promise<void> {
    try {
      const data = await this.http
        .get<Match[]>(`${environment.apiUrl}/ballchasing/matches?limit=20`)
        .toPromise();
      this.matches = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching matches:', error);
      this.matches = [];
    }
  }

  async fetchPlayers(): Promise<void> {
    try {
      const data = await this.http.get<Player[]>(`${environment.apiUrl}/players`).toPromise();
      this.players = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching players:', error);
      this.players = [];
    }
  }

  async fetchTrends(): Promise<void> {
    if (!this.selectedPlayer) {
      this.trends = [];
      return;
    }

    try {
      const data = await this.http
        .get<Trend[]>(
          `${environment.apiUrl}/stats/trends?player_id=${this.selectedPlayer.player_id}&days=${this.filter.days}`
        )
        .toPromise();
      this.trends = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching trends:', error);
      this.trends = [];
    }
  }

  selectPlayer(playerId: number | string): void {
    const id = Number(playerId);
    if (!id) {
      this.selectedPlayer = undefined;
      this.trends = [];
      this.selectedPlayerId = '';
      return;
    }

    this.selectedPlayer = this.players.find((player) => player.player_id === id);
    this.selectedPlayerId = id;
    this.fetchTrends();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  async handleReplayImport(): Promise<void> {
    if (!this.replayId.trim()) {
      this.uploadStatus = 'Please enter a replay ID';
      return;
    }

    this.uploadStatus = 'Importing replay...';
    try {
      const response: any = await this.http
        .post(`${environment.apiUrl}/replays/import`, { replay_id: this.replayId })
        .toPromise();

      if (response?.success) {
        this.uploadStatus = '✓ Import successful!';
        this.replayId = '';
        await this.loadData();
        setTimeout(() => (this.uploadStatus = ''), 3000);
      } else {
        this.uploadStatus = '✗ Import failed';
      }
    } catch (error: any) {
      if (error?.status === 409) {
        this.uploadStatus = '⚠ Replay already imported';
      } else {
        this.uploadStatus = '✗ Import error';
      }
      console.error('Import error:', error);
    }
  }

  async handleBatchImport(): Promise<void> {
    const ids = this.batchReplayIds
      .split('\n')
      .map((id) => id.trim())
      .filter((id) => id);

    if (!ids.length) {
      this.uploadStatus = 'Please enter replay IDs';
      return;
    }

    this.uploadStatus = `Importing ${ids.length} replays...`;
    try {
      const response: any = await this.http
        .post(`${environment.apiUrl}/replays/batch-import`, { replay_ids: ids })
        .toPromise();

      this.uploadStatus = `✓ Success: ${response.success?.length ?? 0} | ⚠ Skipped: ${response.skipped?.length ?? 0} | ✗ Failed: ${response.failed?.length ?? 0}`;
      this.batchReplayIds = '';
      await this.loadData();
      setTimeout(() => (this.uploadStatus = ''), 5000);
    } catch (error) {
      console.error('Batch import error:', error);
      this.uploadStatus = '✗ Batch import error';
    }
  }

  get overviewStats() {
    return [
      {
        label: 'Total Matches',
        value: this.matches.length
      },
      {
        label: 'Total Players',
        value: this.players.length
      },
      {
        label: 'Avg Goals/Game',
        value:
          this.players.length > 0
            ? (this.players.reduce((sum, p) => sum + Number(p.avg_goals || 0), 0) / this.players.length).toFixed(2)
            : '0.00'
      },
      {
        label: 'Total MVPs',
        value: this.players.reduce((sum, p) => sum + Number(p.mvp_count || 0), 0)
      }
    ];
  }
}