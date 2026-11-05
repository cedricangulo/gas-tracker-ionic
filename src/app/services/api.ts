import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, BikeSettings, Fillup, Mutation } from '../models/tracker';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http
          .request<ApiResponse<T>>(method, this.baseUrl + path, { body })
          .pipe(timeout(12000)),
      );
      if (!response.success)
        throw new ApiError(response.message ?? 'API request failed.', 500, response.errors);
      return response.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof HttpErrorResponse) {
        const body = error.error as ApiResponse<unknown> | null;
        const details = body?.errors ? Object.values(body.errors).join(' ') : '';
        throw new ApiError(
          details ||
            body?.message ||
            (error.status === 0
              ? 'PHP API is unreachable. Check Apache and MySQL in XAMPP.'
              : 'The PHP API could not complete this request.'),
          error.status,
          body?.errors,
        );
      }
      throw new ApiError('The PHP API timed out. Your changes are saved on this device.', 0);
    }
  }
  fills(): Promise<Fillup[]> {
    return this.request('GET', '/fillups.php');
  }
  settings(): Promise<BikeSettings> {
    return this.request('GET', '/settings.php');
  }
  async mutate(op: Mutation): Promise<void> {
    if (op.kind === 'settings')
      await this.request('POST', '/settings.php', { operationId: op.operationId, ...op.settings });
    else if (op.kind === 'delete')
      await this.request('DELETE', '/fillups.php?id=' + encodeURIComponent(op.id), {
        operationId: op.operationId,
      });
    else
      await this.request(
        op.kind === 'create' ? 'POST' : 'PUT',
        '/fillups.php' + (op.kind === 'update' ? '?id=' + encodeURIComponent(op.fill.id) : ''),
        { operationId: op.operationId, ...op.fill },
      );
  }
}
