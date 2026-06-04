import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../models/replay-tracker.models';

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.css']
})
export class PlayersListComponent {
  @Input() players: Player[] = [];
  @Input() selectedPlayerId: number | null = null;
  @Output() playerSelected = new EventEmitter<number>();

  selectPlayer(playerId: number): void {
    this.playerSelected.emit(playerId);
  }
}
