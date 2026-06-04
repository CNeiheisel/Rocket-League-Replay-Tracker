import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AnalysisCardComponent } from '../analysis-card/analysis-card.component';
import { ReplayTrackerApiService } from '../services/replay-tracker-api.service';

interface PlayerMetrics {
  score: number;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  shootingPercentage: number;
  boostUsage: number;
  averageSpeed: number;
  timeSupersonic: number;
  timeBoostLow: number;
}

interface AnalysisAdvice {
  priority: number;
  title: string;
  advice: string;
  drills: string[];
}

interface AnalysisGap {
  stat: string;
  gap: number;
  gapPercentage: number;
}

export interface PlayerAnalysis {
  success: boolean;
  overallAssessment: string;
  advice: AnalysisAdvice[];
  allGaps: AnalysisGap[];
}

@Component({
  selector: 'app-ai-coach',
  standalone: true,
  imports: [CommonModule, FormsModule, AnalysisCardComponent],
  templateUrl: './ai-coach.component.html',
  styleUrls: ['./ai-coach.component.css']
})
export class AiCoachComponent {
  playerMetrics: PlayerMetrics = {
    score: 450,
    goals: 1.1,
    assists: 0.7,
    saves: 1.6,
    shots: 4.2,
    shootingPercentage: 30,
    boostUsage: 52,
    averageSpeed: 1050,
    timeSupersonic: 22,
    timeBoostLow: 23
  };
  currentRank = 'Gold';
  analysis: PlayerAnalysis | null = null;
  loading = false;

  ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Grand Champion', 'Supersonic Legend'];
  metricKeys = Object.keys(this.playerMetrics) as Array<keyof PlayerMetrics>;

  constructor(private readonly replayTrackerApi: ReplayTrackerApiService) {}

  formatLabel(value: string): string {
    return value.replace(/([A-Z])/g, ' $1').trim();
  }

  async analyzePlayer(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(
        this.replayTrackerApi.analyzePlayer({
          stats: this.toApiMetrics(),
          current_rank: this.currentRank
        })
      );
      this.analysis = this.mapAnalysisResponse(response as Record<string, unknown>);
    } catch (error) {
      console.error('Analysis failed:', error);
      this.analysis = {
        success: false,
        overallAssessment: 'Analysis failed. Check backend connectivity.',
        advice: [],
        allGaps: []
      };
    } finally {
      this.loading = false;
    }
  }

  private toApiMetrics(): Record<string, number> {
    return {
      score: this.playerMetrics.score,
      goals: this.playerMetrics.goals,
      assists: this.playerMetrics.assists,
      saves: this.playerMetrics.saves,
      shots: this.playerMetrics.shots,
      shooting_percentage: this.playerMetrics.shootingPercentage,
      boost_usage: this.playerMetrics.boostUsage,
      avg_speed: this.playerMetrics.averageSpeed,
      time_supersonic: this.playerMetrics.timeSupersonic,
      time_boost_0_25: this.playerMetrics.timeBoostLow
    };
  }

  private mapAnalysisResponse(response: Record<string, unknown>): PlayerAnalysis {
    const advice = Array.isArray(response['advice']) ? response['advice'] : [];
    const allGaps = Array.isArray(response['all_gaps']) ? response['all_gaps'] : [];

    return {
      success: Boolean(response['success']),
      overallAssessment: String(response['overall_assessment'] ?? ''),
      advice: advice.map((item) => {
        const typedItem = item as Record<string, unknown>;
        return {
          priority: Number(typedItem['priority'] ?? 0),
          title: String(typedItem['title'] ?? ''),
          advice: String(typedItem['advice'] ?? ''),
          drills: Array.isArray(typedItem['drills'])
            ? typedItem['drills'].map((drill) => String(drill))
            : []
        };
      }),
      allGaps: allGaps.map((item) => {
        const typedItem = item as Record<string, unknown>;
        return {
          stat: String(typedItem['stat'] ?? ''),
          gap: Number(typedItem['gap'] ?? 0),
          gapPercentage: Number(typedItem['gap_percentage'] ?? 0)
        };
      })
    };
  }
}
