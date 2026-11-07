import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { signal } from '@angular/core';
import { Auth } from '../services/auth';

import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const authenticated = signal(false);
  let router: Router;

  beforeEach(() => {
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: { authenticated } },
        {
          provide: Router,
          useValue: {
            createUrlTree: (commands: string[], extras: object) => ({ commands, extras }),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('redirects signed-out visitors to login and remembers the requested path', () => {
    expect(executeGuard({} as never, { url: '/settings' } as never)).toEqual(
      router.createUrlTree(['/login'], { queryParams: { returnUrl: '/settings' } }),
    );
  });

  it('allows authenticated visitors', () => {
    authenticated.set(true);
    expect(executeGuard({} as never, { url: '/settings' } as never)).toBe(true);
  });
});
