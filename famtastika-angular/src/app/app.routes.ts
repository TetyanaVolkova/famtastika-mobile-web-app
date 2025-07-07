import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'about-us',
    pathMatch: 'full',
  },
  {
    path: 'about-us',
    loadComponent: () =>
      import('./components/about-us/about-us.component').then(
        (m) => m.AboutUsComponent
      ),
  },
];
