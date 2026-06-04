import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerAnalysis } from '../ai-coach/ai-coach.component';

@Component({
  selector: 'app-analysis-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-card.component.html',
  styleUrls: ['./analysis-card.component.css']
})
export class AnalysisCardComponent {
  @Input() analysis: PlayerAnalysis | null = null;

  formatLabel(value: string): string {
    return value.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  }
}
