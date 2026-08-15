import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="section">
      <div class="container">
        <h1 class="section-title">Panel de administración</h1>
        <nav class="flex mt-1" style="gap:0.5rem;flex-wrap:wrap">
          <a routerLink="/admin/ocupacion" routerLinkActive="active" class="btn btn-ghost btn-sm" [routerLinkActiveOptions]="{ exact: true }">Ocupación</a>
          <a routerLink="/admin/atracciones" routerLinkActive="active" class="btn btn-ghost btn-sm">Atracciones</a>
          <a routerLink="/admin/ventas" routerLinkActive="active" class="btn btn-ghost btn-sm">Ventas</a>
        </nav>
        <div class="mt-3">
          <router-outlet />
        </div>
      </div>
    </section>
  `,
})
export class AdminPage {}
