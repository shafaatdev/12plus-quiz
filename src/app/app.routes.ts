import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: 'auth',
		loadComponent: () => import('./features/auth/auth-page').then((module) => module.AuthPage),
	},
	{
		path: '',
		loadComponent: () => import('./shared/components/app-shell/app-shell').then((module) => module.AppShell),
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./features/dashboard/dashboard-page').then((module) => module.DashboardPage),
			},
			{
				path: 'vocabulary',
				loadChildren: () => import('./features/vocabulary/vocabulary.routes').then((module) => module.VOCABULARY_ROUTES),
			},
			{
				path: 'non-verbal',
				loadComponent: () => import('./features/non-verbal/non-verbal-page').then((module) => module.NonVerbalPage),
			},
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
		],
	},
	{ path: '**', redirectTo: '' },
];
