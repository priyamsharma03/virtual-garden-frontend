import { Routes } from '@angular/router';

export const GARDEN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./garden-3d.page').then((m) => m.Garden3dPageComponent)
  }
];
