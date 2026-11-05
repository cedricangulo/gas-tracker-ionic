import { unsavedFillupGuard } from './guards/unsaved-fillup-guard';
import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: 'fillup/:id',
    canDeactivate: [unsavedFillupGuard],
    loadComponent: () =>
      import('./pages/fillup-form/fillup-form.page').then((m) => m.FillupFormPage),
  },
  {
    path: '',
    loadComponent: () => import('./components/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'charts',
        loadComponent: () => import('./pages/charts/charts.page').then((m) => m.ChartsPage),
      },
      { path: 'log', loadComponent: () => import('./pages/log/log.page').then((m) => m.LogPage) },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
      },
      { path: 'map', loadComponent: () => import('./pages/map/map.page').then((m) => m.MapPage) },
      { path: '', pathMatch: 'full', redirectTo: 'home' },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
