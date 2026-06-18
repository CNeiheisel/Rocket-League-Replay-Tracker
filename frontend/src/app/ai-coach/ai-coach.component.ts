import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AnalysisCardComponent } from '../analysis-card/analysis-card.component';
import { ReplayTrackerApiService } from '../services/replay-tracker-api.service';
import { Player, ReplayMatch } from '../models/replay-tracker.models';

export interface AnalysisAdvice {
  priority: number;
  title: string;
  advice: string;
  drills: string[];
}

export interface AnalysisStrength {
  title: string;
  detail: string;
}

export interface PlayerAnalysis {
  success: boolean;
  overallAssessment: string;
  strengths: AnalysisStrength[];
  advice: AnalysisAdvice[];
  allGaps: unknown[];
  focusForNextGame: string;
}

@Component({
  selector: 'app-ai-coach',
  standalone: true,
  imports: [CommonModule, FormsModule, AnalysisCardComponent],
  templateUrl: './ai-coach.component.html',
  styleUrls: ['./ai-coach.component.css']
})
export class AiCoachComponent implements OnChanges {
  // Passed in from AppComponent so we don't re-fetch
  @Input() players: Player[] = [];
  @Input() matches: ReplayMatch[] = [];

  mode: 'single' | 'across' = 'across';

  // Across games mode
  selectedPlayerId: number | null = null;

  // Single game mode
  selectedMatchId: string | null = null;
  selectedMatchPlayerName: string | null = null;
  matchPlayers: { name: string; team: string }[] = [];

  analysis: PlayerAnalysis | null = null;
  loading = false;
  error = '';

  constructor(private readonly replayTrackerApi: ReplayTrackerApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Reset selections if data changes
    if (changes['matches'] || changes['players']) {
      this.analysis = null;
      this.error = '';
    }
  }

  onMatchSelected(): void {
    this.selectedMatchPlayerName = null;
    this.analysis = null;
    if (!this.selectedMatchId) {
      this.matchPlayers = [];
      return;
    }
    const match = this.matches.find(m => m.matchId === this.selectedMatchId);
    this.matchPlayers = match?.players ?? [];
  }

  get canAnalyze(): boolean {
    if (this.mode === 'across') {
      return this.selectedPlayerId !== null;
    }
    return this.selectedMatchId !== null && this.selectedMatchPlayerName !== null;
  }

  async analyze(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.analysis = null;

    try {
      let response: Record<string, unknown>;

      if (this.mode === 'across') {
        response = await firstValueFrom(
          this.replayTrackerApi.analyzePlayerAcrossGames(this.selectedPlayerId!)
        ) as Record<string, unknown>;
      } else {
        response = await firstValueFrom(
          this.replayTrackerApi.analyzeSingleGame(
            this.selectedMatchId!,
            this.selectedMatchPlayerName!
          )
        ) as Record<string, unknown>;
      }

      this.analysis = this.mapResponse(response);
    } catch (err: unknown) {
      console.error('Analysis failed:', err);
      this.error = 'Analysis failed. Make sure your GROQ_API_KEY is set on Render and replays have been imported.';
    } finally {
      this.loading = false;
    }
  }

  private mapResponse(response: Record<string, unknown>): PlayerAnalysis {
    const advice = Array.isArray(response['advice']) ? response['advice'] : [];
    const strengths = Array.isArray(response['strengths']) ? response['strengths'] : [];

    return {
      success: Boolean(response['success']),
      overallAssessment: String(response['overall_assessment'] ?? ''),
      strengths: strengths.map((s) => {
        const item = s as Record<string, unknown>;
        return {
          title: String(item['title'] ?? ''),
          detail: String(item['detail'] ?? '')
        };
      }),
      advice: advice.map((item) => {
        const a = item as Record<string, unknown>;
        return {
          priority: Number(a['priority'] ?? 0),
          title: String(a['title'] ?? ''),
          advice: String(a['advice'] ?? ''),
          drills: Array.isArray(a['drills']) ? a['drills'].map(String) : []
        };
      }),
      allGaps: [],
      focusForNextGame: String(response['focus_for_next_game'] ?? '')
    };
  }
}