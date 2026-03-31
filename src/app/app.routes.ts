import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadChildren: () => import('./pages/home/home.routes').then((m) => m.HOME_ROUTES)
	},
	{
		path: 'plants',
		loadChildren: () => import('./pages/plants/plants.routes').then((m) => m.PLANTS_ROUTES)
	},
	{
		path: 'garden-3d',
		loadChildren: () => import('./pages/garden-3d/garden-3d.routes').then((m) => m.GARDEN_ROUTES)
	},
	{
		path: 'about',
		loadChildren: () => import('./pages/about/about.routes').then((m) => m.ABOUT_ROUTES)
	},
	{
		path: '**',
		redirectTo: ''
	}
];
