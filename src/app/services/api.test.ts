import '@angular/compiler';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injector } from '@angular/core';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from './api';

describe('ApiService bearer authentication', () => {
  let api: ApiService;
  let requests: Array<{ method: string; url: string; options: Record<string, unknown> }>;
  let values: Map<string, string>;

  beforeEach(() => {
    requests = [];
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    const http = {
      request: (method: string, url: string, options: Record<string, unknown>) => {
        requests.push({ method, url, options });
        const body = options['body'] as { action?: string } | undefined;
        if (body?.action === 'login') {
          return of({ success: true, data: { authenticated: true, accessToken: 'token-value' } });
        }
        if (body?.action === 'logout') {
          return of({ success: true, data: { authenticated: false } });
        }
        return of({ success: true, data: [] });
      },
    } as unknown as HttpClient;
    api = Injector.create({ providers: [ApiService, { provide: HttpClient, useValue: http }] }).get(
      ApiService,
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('stores a login token and sends it on protected requests without cookies', async () => {
    await api.login('owner', 'password');
    expect(requests[0].options['body']).toEqual({
      action: 'login',
      username: 'owner',
      password: 'password',
    });
    expect(requests[0].options['withCredentials']).toBe(false);
    expect(values.get('gas-tracker-access-token')).toBe('token-value');

    await api.fills();
    expect(requests[1].options['withCredentials']).toBe(false);
    expect((requests[1].options['headers'] as HttpHeaders).get('Authorization')).toBe(
      'Bearer token-value',
    );
  });

  it('revokes the token on sign-out and clears it locally', async () => {
    await api.login('owner', 'password');
    await api.logout();

    expect(requests[1].options['body']).toEqual({ action: 'logout' });
    expect((requests[1].options['headers'] as HttpHeaders).get('Authorization')).toBe(
      'Bearer token-value',
    );
    expect(values.has('gas-tracker-access-token')).toBe(false);
  });
});
