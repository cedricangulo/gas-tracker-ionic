import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError, ApiService } from './api';
import { vi } from 'vitest';
import providers from '../testing/providers.test-support';
import { TrackerStore } from './tracker-store';
import { createTestStore } from '../testing/context.test-support';

import { Auth } from './auth';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});

describe('Auth', () => {
  let service: Auth;
  let api: {
    authStatus: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let store: ReturnType<typeof createTestStore>;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    api = {
      authStatus: vi.fn(async () => ({ authenticated: false })),
      login: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
    };
    store = createTestStore();
    router = { navigateByUrl: vi.fn(async () => true) };
    TestBed.configureTestingModule({
      providers: [
        ...providers,
        { provide: Auth, useFactory: () => new Auth() },
        ...providers,
        { provide: Auth, useFactory: () => new Auth() },
        { provide: ApiService, useValue: api },
        { provide: TrackerStore, useValue: store },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts the local store after a successful shared-account login', async () => {
    await service.login('owner', 'secret');
    expect(service.authenticated()).toBe(true);
    expect(store.init).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem('gas-tracker-authenticated')).toBe('true');
  });

  it('uses the server session on startup and clears an expired login marker', async () => {
    window.localStorage.setItem('gas-tracker-authenticated', 'true');
    api.authStatus.mockResolvedValue({ authenticated: false });
    await service.init();
    expect(service.authenticated()).toBe(false);
    expect(window.localStorage.getItem('gas-tracker-authenticated')).toBeNull();
  });

  it('keeps the cached session when starting offline without a stored API token', async () => {
    window.localStorage.setItem('gas-tracker-authenticated', 'true');
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    api.authStatus.mockResolvedValue({ authenticated: false });

    await service.init();

    expect(service.authenticated()).toBe(true);
    expect(window.localStorage.getItem('gas-tracker-authenticated')).toBe('true');
    expect(store.init).toHaveBeenCalledOnce();
  });

  it('keeps the cached session when the saved token cannot be checked because the API is unreachable', async () => {
    window.localStorage.setItem('gas-tracker-authenticated', 'true');
    api.authStatus.mockRejectedValue(new ApiError('offline', 0));

    await service.init();

    expect(service.authenticated()).toBe(true);
    expect(window.localStorage.getItem('gas-tracker-authenticated')).toBe('true');
    expect(store.init).toHaveBeenCalledOnce();
  });

  it('keeps the cached session when the API returns a temporary gateway error', async () => {
    window.localStorage.setItem('gas-tracker-authenticated', 'true');
    api.authStatus.mockRejectedValue(new ApiError('Gateway timeout', 504));

    await service.init();

    expect(service.authenticated()).toBe(true);
    expect(window.localStorage.getItem('gas-tracker-authenticated')).toBe('true');
    expect(store.init).toHaveBeenCalledOnce();
  });

  it('clears the cached session when the server explicitly rejects the saved token', async () => {
    window.localStorage.setItem('gas-tracker-authenticated', 'true');
    api.authStatus.mockRejectedValue(new ApiError('Sign in again.', 401));

    await service.init();

    expect(service.authenticated()).toBe(false);
    expect(window.localStorage.getItem('gas-tracker-authenticated')).toBeNull();
    expect(store.init).not.toHaveBeenCalled();
  });

  it('does not create an offline session without a prior successful login', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    api.authStatus.mockResolvedValue({ authenticated: false });

    await service.init();

    expect(service.authenticated()).toBe(false);
    expect(store.init).not.toHaveBeenCalled();
  });

  it('clears local access and routes to sign in after an unauthorized API response', async () => {
    await service.login('owner', 'secret');
    const apiService = TestBed.inject(ApiService) as ApiService & {
      onUnauthorized: (() => void) | null;
    };
    apiService.onUnauthorized?.();
    expect(service.authenticated()).toBe(false);
    expect(window.localStorage.getItem('gas-tracker-authenticated')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('records login failures without marking the account as signed in', async () => {
    api.login.mockRejectedValue(new ApiError('The username or password is incorrect.', 401));
    await expect(service.login('owner', 'bad')).rejects.toThrow('incorrect');
    expect(service.authenticated()).toBe(false);
    expect(service.error()).toContain('incorrect');
  });
});
