import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AiCoachComponent } from './ai-coach/ai-coach.component';
import { StartScreenComponent } from './start-screen/start-screen.component';
import { PlayersListComponent } from './players-list/players-list.component';
import { ReplayListComponent } from './replay-list/replay-list.component';
import { Player, ReplayMatch, TrendPoint } from './models/replay-tracker.models';
import { ReplayTrackerApiService } from './services/replay-tracker-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AiCoachComponent,
    StartScreenComponent,
    PlayersListComponent,
    ReplayListComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  readonly title = 'Rocket League Replay Tracker';
  activeTab: 'overview' | 'players' | 'replays' | 'aiCoach' = 'overview';
  replayId = '';
  batchReplayIds = '';
  uploadStatus = '';
  loading = true;
  players: Player[] = [];
  matches: ReplayMatch[] = [];
  selectedPlayer: Player | null = null;
  selectedPlayerId: number | null = null;
  filter = { days: 30 };
  trends: TrendPoint[] = [];

  constructor(private readonly replayTrackerApi: ReplayTrackerApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  stripZeros(value: number): number {
    return parseFloat(String(value));
  }

  async loadData(): Promise<void> {
    this.loading = true;
    await Promise.all([this.fetchMatches(), this.fetchPlayers()]).finally(() => {
      this.loading = false;
    });
  }

  async fetchMatches(): Promise<void> {
    try {
      this.matches = await firstValueFrom(this.replayTrackerApi.fetchMatches(20));
    } catch (error) {
      console.error('Error fetching matches:', error);
      this.matches = [];
    }
  }

  async fetchPlayers(): Promise<void> {
    try {
      this.players = await firstValueFrom(this.replayTrackerApi.fetchPlayers());
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
      this.trends = await firstValueFrom(
        this.replayTrackerApi.fetchTrends(this.selectedPlayer.playerId, this.filter.days)
      );
    } catch (error) {
      console.error('Error fetching trends:', error);
      this.trends = [];
    }
  }

  selectPlayer(playerId: number): void {
    const id = Number(playerId);
    if (!id) {
      this.selectedPlayer = null;
      this.trends = [];
      this.selectedPlayerId = null;
      return;
    }

    this.selectedPlayer = this.players.find((player) => player.playerId === id) ?? null;
    this.selectedPlayerId = id;
    this.fetchTrends();
  }

  setActiveTab(tab: 'overview' | 'players' | 'replays' | 'aiCoach'): void {
    this.activeTab = tab;
  }

  async handleReplayImport(): Promise<void> {
    if (!this.replayId.trim()) {
      this.uploadStatus = 'Please enter a replay ID';
      return;
    }

    this.uploadStatus = 'Importing replay...';
    try {
      const response = await firstValueFrom(this.replayTrackerApi.importReplay(this.replayId));

      if (response?.success) {
        this.uploadStatus = 'Import successful';
        this.replayId = '';
        await this.loadData();
        setTimeout(() => (this.uploadStatus = ''), 3000);
      } else {
        this.uploadStatus = 'Import failed';
      }
    } catch (error: any) {
      if (error?.status === 409) {
        this.uploadStatus = 'Replay already imported';
      } else {
        this.uploadStatus = 'Import error';
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
      const response = await firstValueFrom(this.replayTrackerApi.batchImport(ids));

      this.uploadStatus = `Success: ${response.success?.length ?? 0} | Skipped: ${response.skipped?.length ?? 0} | Failed: ${response.failed?.length ?? 0}`;
      this.batchReplayIds = '';
      await this.loadData();
      setTimeout(() => (this.uploadStatus = ''), 5000);
    } catch (error) {
      console.error('Batch import error:', error);
      this.uploadStatus = 'Batch import error';
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
            ? (this.players.reduce((sum, player) => sum + Number(player.averageGoals || 0), 0) / this.players.length).toFixed(2)
            : '0.00'
      },
      {
        label: 'Total MVPs',
        value: this.players.reduce((sum, player) => sum + Number(player.mvpCount || 0), 0)
      }
    ];
  }
}