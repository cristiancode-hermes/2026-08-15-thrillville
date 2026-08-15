import { Routes } from '@angular/router';
import { authGuard } from './app/guards/auth.guard';
import { adminGuard } from './app/guards/admin.guard';
import { publicOnlyGuard } from './app/guards/public-only.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app/pages/home').then((m) => m.HomePage),
  },
  {
    path: 'mapa',
    loadComponent: () => import('./app/pages/mapa').then((m) => m.MapaPage),
  },
  {
    path: 'atracciones',
    loadComponent: () => import('./app/pages/atracciones').then((m) => m.AtraccionesPage),
  },
  {
    path: 'atracciones/:id',
    loadComponent: () => import('./app/pages/atraccion-detalle').then((m) => m.AtraccionDetallePage),
  },
  {
    path: 'entradas',
    loadComponent: () => import('./app/pages/entradas').then((m) => m.EntradasPage),
  },
  {
    path: 'entradas/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./app/pages/ticket-qr').then((m) => m.TicketQrPage),
  },
  {
    path: 'fastpass',
    canActivate: [authGuard],
    loadComponent: () => import('./app/pages/fastpass').then((m) => m.FastPassPage),
  },
  {
    path: 'fastpass/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./app/pages/fastpass-qr').then((m) => m.FastPassQrPage),
  },
  {
    path: 'mis-visitas',
    canActivate: [authGuard],
    loadComponent: () => import('./app/pages/mis-visitas').then((m) => m.MisVisitasPage),
  },
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./app/pages/login').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./app/pages/registro').then((m) => m.RegistroPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./app/pages/admin').then((m) => m.AdminPage),
    children: [
      { path: '', redirectTo: 'ocupacion', pathMatch: 'full' },
      {
        path: 'ocupacion',
        loadComponent: () => import('./app/pages/admin-ocupacion').then((m) => m.AdminOcupacionPage),
      },
      {
        path: 'atracciones',
        loadComponent: () => import('./app/pages/admin-atracciones').then((m) => m.AdminAtraccionesPage),
      },
      {
        path: 'ventas',
        loadComponent: () => import('./app/pages/admin-ventas').then((m) => m.AdminVentasPage),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./app/pages/not-found').then((m) => m.NotFoundPage),
  },
];
