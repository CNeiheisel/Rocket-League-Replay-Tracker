import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-start-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './start-screen.component.html',
  styleUrls: ['./start-screen.component.css']
})
export class StartScreenComponent {
  @Input() replayId = '';
  @Input() batchReplayIds = '';
  @Input() uploadStatus = '';

  @Output() replayIdChange = new EventEmitter<string>();
  @Output() batchReplayIdsChange = new EventEmitter<string>();
  @Output() replayImportRequested = new EventEmitter<void>();
  @Output() batchImportRequested = new EventEmitter<void>();

  get statusClass(): string {
    if (!this.uploadStatus) {
      return 'status-info';
    }

    if (this.uploadStatus.includes('Success') || this.uploadStatus.includes('successful')) {
      return 'status-success';
    }

    if (this.uploadStatus.includes('Skipped') || this.uploadStatus.includes('already imported')) {
      return 'status-warning';
    }

    if (this.uploadStatus.includes('failed') || this.uploadStatus.includes('error')) {
      return 'status-error';
    }

    return 'status-info';
  }

  onReplayIdChanged(value: string): void {
    this.replayIdChange.emit(value);
  }

  onBatchReplayIdsChanged(value: string): void {
    this.batchReplayIdsChange.emit(value);
  }

  requestReplayImport(): void {
    this.replayImportRequested.emit();
  }

  requestBatchImport(): void {
    this.batchImportRequested.emit();
  }
}
