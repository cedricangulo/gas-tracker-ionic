import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from './api';
import { ApiService } from './api';
import { TrackerStore } from './tracker-store';

const AUTH_MARKER = 'gas-tracker-authenticated';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly localStorage = globalThis.localStorage;
  private readonly api = inject(ApiService);
  private readonly store = inject(TrackerStore);
  private readonly router = inject(Router);
  private storeStarted = false;
  readonly authenticated = signal(false);
  readonly checking = signal(true);
  readonly error = signal('');

  constructor() {
    this.api.onUnauthorized = () => {
      this.authenticated.set(false);
      this.localStorage?.removeItem(AUTH_MARKER);
      void this.router.navigateByUrl('/login');
    };
  }

  async init(): Promise<void> {
    try {
      const status = await this.api.authStatus();
      this.authenticated.set(status.authenticated);
      if (status.authenticated) this.localStorage?.setItem(AUTH_MARKER, 'true');
      else this.localStorage?.removeItem(AUTH_MARKER);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 0 &&
        this.localStorage?.getItem(AUTH_MARKER)
      ) {
        this.authenticated.set(true);
      } else {
        this.error.set('Connect to sign in.');
      }
    } finally {
      this.checking.set(false);
    }
    if (this.authenticated()) await this.startStore();
  }

  async login(username: string, password: string): Promise<void> {
    this.error.set('');
    try {
      await this.api.login(username.trim(), password);
      this.authenticated.set(true);
      this.localStorage?.setItem(AUTH_MARKER, 'true');
      await this.startStore();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not sign in. Try again.');
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.error.set('');
    await this.api.logout();
    this.authenticated.set(false);
    this.localStorage?.removeItem(AUTH_MARKER);
    await this.router.navigateByUrl('/login');
  }

  private async startStore(): Promise<void> {
    if (this.storeStarted) return;
    this.storeStarted = true;
    try {
      await this.store.init();
    } catch (error) {
      this.storeStarted = false;
      throw error;
    }
  }
}
