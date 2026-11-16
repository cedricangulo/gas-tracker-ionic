import { TestBed } from '@angular/core/testing';
import { ShellComponent } from './shell.component';
describe('ShellComponent', () => {
  it('includes Map in the five tabs and keeps the separate add action', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(
      Array.from(el.querySelectorAll('ion-tab-button')).map((n) => n.getAttribute('aria-label')),
    ).toEqual(['Home', 'Charts', 'Log', 'Map', 'Settings']);
    expect(el.querySelector('ion-tab-button[tab="map"]')?.getAttribute('href')).toBe('/map');
    expect(el.querySelector('a[aria-label="Add fill-up"]')?.getAttribute('href')).toBe(
      '/fillup/new',
    );
  });
  it('uses only the outlet owned by Ionic tabs so no empty outlet covers the content', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const outlets = el.querySelectorAll('ion-tabs ion-router-outlet');
    expect(outlets).toHaveLength(1);
    expect(outlets[0].parentElement?.classList.contains('tabs-inner')).toBe(true);
  });
});
