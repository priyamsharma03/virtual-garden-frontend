import { Routes } from '@angular/router';

export const PLANTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./plants.page').then((m) => m.PlantsPageComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('../plant-detail/plant-detail.page').then((m) => m.PlantDetailPageComponent)
  }
];
