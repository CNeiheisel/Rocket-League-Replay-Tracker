import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Singleton service that pings /api/health once on app start.
 * Both AppComponent and ReplayShowcaseComponent await `ready`
 * before making their own data requests, so the Render cold start
 * only blocks once regardless of how many components need the backend.
 */
@Injectable({ providedIn: 'root' })
export class BackendWarmupService {
  /** Resolves when the backend has responded to at least one request */
  readonly ready: Promise<void>;

  constructor(private readonly http: HttpClient) {
    this.ready = this.warmUp();

    // Keep backend alive every 14 minutes so it never cold-starts again
    // during an active session.
    setInterval(() => {
      this.http.get(`${environment.apiUrl}/health`).subscribe({ error: () => {} });
    }, 14 * 60 * 1000);
  }

  private async warmUp(): Promise<void> {
    try {
      await firstValueFrom(this.http.get(`${environment.apiUrl}/health`));
    } catch {
      // Even if health fails, we unblock — data requests will make their
      // own retry/error handling. Better to try than hang forever.
    }
  }
}