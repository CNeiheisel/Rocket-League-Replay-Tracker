import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analysis-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-card.component.html',
  styleUrls: ['./analysis-card.component.css']
})
export class AnalysisCardComponent {
  @Input() analysis: any;

  formatStatName(stat: string): string {
    return stat.replace(/_/g, ' ');
  }
}
