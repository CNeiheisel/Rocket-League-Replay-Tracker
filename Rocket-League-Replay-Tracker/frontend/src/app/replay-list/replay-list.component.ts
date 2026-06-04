import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReplayMatch } from '../models/replay-tracker.models';

@Component({
  selector: 'app-replay-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './replay-list.component.html',
  styleUrls: ['./replay-list.component.css']
})
export class ReplayListComponent {
  @Input() matches: ReplayMatch[] = [];

  getTeamPlayers(match: ReplayMatch, team: string): string[] {
    return match.players.filter((player) => player.team === team).map((player) => player.name);
  }

  getScoreClass(match: ReplayMatch, team: string): string {
    const isWinner = match.winningTeam === team;
    if (team === 'blue') {
      return isWinner ? 'score-blue winner' : 'score-blue';
    }

    return isWinner ? 'score-orange winner' : 'score-orange';
  }
}
