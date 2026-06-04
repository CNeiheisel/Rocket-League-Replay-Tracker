import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { AnalysisCardComponent } from '../analysis-card/analysis-card.component';

@Component({
  selector: 'app-ai-coach',
  standalone: true,
  imports: [CommonModule, FormsModule, AnalysisCardComponent],
  templateUrl: './ai-coach.component.html',
  styleUrls: ['./ai-coach.component.css']
})
export class AiCoachComponent {
  playerStats = {
    score: 450,
    goals: 1.1,
    assists: 0.7,
    saves: 1.6,
    shots: 4.2,
    shooting_percentage: 30,
    boost_usage: 52,
    avg_speed: 1050,
    time_supersonic: 22,
    time_boost_0_25: 23
  };
  currentRank = 'Gold';
  analysis: any = null;
  loading = false;

  ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Grand Champion', 'Supersonic Legend'];
  objectKeys = Object.keys;

  constructor(private http: HttpClient) {}

  formatStatName(stat: string): string {
    return stat.replace(/_/g, ' ');
  }

  async analyzePlayer(): Promise<void> {
    this.loading = true;
    try {
      this.analysis = await this.http
        .post(`${environment.apiUrl}/analysis/analyze`, {
          stats: this.playerStats,
          current_rank: this.currentRank
        })
        .toPromise();
    } catch (error) {
      console.error('Analysis failed:', error);
      this.analysis = { success: false, overall_assessment: 'Analysis failed. Check backend connectivity.' };
    } finally {
      this.loading = false;
    }
  }
}
