import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let auth: { error: ReturnType<typeof signal<string>>; login: ReturnType<typeof vi.fn> };
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let returnUrl = '/settings';

  beforeEach(() => {
    auth = { error: signal(''), login: vi.fn(async () => undefined) };
    navigateByUrl = vi.fn(async () => true);
    returnUrl = '/settings';
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: auth },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => returnUrl } } },
        },
      ],
    });
    navigateByUrl.mockClear();
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('signs in and returns to the requested in-app route', async () => {
    component.username.set('owner');
    component.password.set('secret');
    await component.signIn();
    expect(auth.login).toHaveBeenCalledWith('owner', 'secret');
    expect(component.username()).toBe('');
    expect(component.password()).toBe('');
    expect(navigateByUrl).toHaveBeenCalledWith('/settings');
  });

  it('does not allow an external return address', async () => {
    returnUrl = '//outside.example';
    const safeFixture = TestBed.createComponent(LoginPage);
    safeFixture.componentInstance.username.set('owner');
    safeFixture.componentInstance.password.set('secret');
    await safeFixture.componentInstance.signIn();
    expect(navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('uses the shared app button style and disables submit until fields are filled', () => {
    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.classList.contains('button')).toBe(true);
    expect(button.classList.contains('wide')).toBe(true);
    expect(button.disabled).toBe(true);
    component.username.set('owner');
    component.password.set('secret');
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('clears fields and errors whenever sign-in is shown again', () => {
    component.username.set('owner');
    component.password.set('secret');
    auth.error.set('A previous error');
    component.ionViewWillEnter();
    fixture.detectChanges();
    expect(component.username()).toBe('');
    expect(component.password()).toBe('');
    expect(auth.error()).toBe('');
    expect((fixture.nativeElement.querySelector('#username') as HTMLInputElement).value).toBe('');
    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement).value).toBe('');
  });
});
