import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./components/tabs/tabs.routes').then((m) => m.routes),
  },

  {
    path: 'header',
    loadComponent: () =>
      import('./components/header/header.page').then((m) => m.HeaderPage),
  },
];
