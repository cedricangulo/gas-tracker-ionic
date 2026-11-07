import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
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
  private readonly tokenStorage = globalThis.localStorage;
  private accessToken = this.tokenStorage?.getItem('gas-tracker-access-token') ?? '';
  onUnauthorized: (() => void) | null = null;
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http
          .request<ApiResponse<T>>(method, this.baseUrl + path, {
            body,
            withCredentials: false,
            headers: this.accessToken
              ? new HttpHeaders({ Authorization: `Bearer ${this.accessToken}` })
              : undefined,
          })
          .pipe(timeout(12000)),
      );
      if (!response.success)
        throw new ApiError(response.message ?? 'Could not save. Try again.', 500, response.errors);
      return response.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && path !== '/auth.php') {
          this.setAccessToken('');
          this.onUnauthorized?.();
        }
        const errorBody = error.error as ApiResponse<unknown> | null;
        const details = errorBody?.errors ? Object.values(errorBody.errors).join(' ') : '';
        throw new ApiError(
          details ||
            errorBody?.message ||
            (error.status === 0
              ? 'Cannot connect. Your changes are saved on this device.'
              : 'Could not complete the request. Try again.'),
          error.status,
          errorBody?.errors,
        );
      }
      throw new ApiError('Connection timed out. Your changes are saved on this device.', 0);
    }
  }
  fills(): Promise<Fillup[]> {
    return this.request('GET', '/fillups.php');
  }
  settings(): Promise<BikeSettings> {
    return this.request('GET', '/settings.php');
  }
  async authStatus(): Promise<{ authenticated: boolean }> {
    if (!this.accessToken) return { authenticated: false };
    try {
      const response = await this.request<{ authenticated: boolean }>('GET', '/auth.php');
      if (!response.authenticated) this.setAccessToken('');
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) this.setAccessToken('');
      throw error;
    }
  }
  async login(username: string, password: string): Promise<void> {
    this.setAccessToken('');
    const response = await this.request<{ authenticated: boolean; accessToken: string }>(
      'POST',
      '/auth.php',
      { action: 'login', username, password },
    );
    this.setAccessToken(response.accessToken);
  }
  async logout(): Promise<void> {
    try {
      await this.request<{ authenticated: boolean }>('POST', '/auth.php', { action: 'logout' });
    } finally {
      this.setAccessToken('');
    }
  }
  private setAccessToken(token: string): void {
    this.accessToken = token;
    if (token) this.tokenStorage?.setItem('gas-tracker-access-token', token);
    else this.tokenStorage?.removeItem('gas-tracker-access-token');
  }
  async renameStation(from: string, to: string, operationId: string): Promise<BikeSettings> {
    try {
      return await this.request('POST', '/settings.php', {
        operationId,
        stationRename: { from, to },
      });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 0 || error.status >= 500))
        throw new ApiError(
          'Could not confirm the rename. Retry the same name or refresh.',
          error.status,
        );
      throw error;
    }
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
