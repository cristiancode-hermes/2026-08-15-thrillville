import { Component, effect, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="navbar">
      <div class="container navbar-inner">
        <a routerLink="/" class="brand">
          <span class="brand-mark">🎢</span> ThrillVille
        </a>
        <nav class="nav-links">
          <a routerLink="/mapa" routerLinkActive="active" class="nav-link">Mapa</a>
          <a routerLink="/atracciones" routerLinkActive="active" class="nav-link">Atracciones</a>
          <a routerLink="/entradas" routerLinkActive="active" class="nav-link">Entradas</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/fastpass" routerLinkActive="active" class="nav-link">FastPass</a>
            <a routerLink="/mis-visitas" routerLinkActive="active" class="nav-link">Mis visitas</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active" class="nav-link">Admin</a>
          }
        </nav>
        <div class="nav-actions">
          <button class="theme-btn" (click)="toggleTheme()" [attr.aria-label]="isDark() ? 'Modo claro' : 'Modo oscuro'">
            {{ isDark() ? '☀️' : '🌙' }}
          </button>
          @if (auth.isAuthenticated()) {
            <button class="btn btn-ghost btn-sm" (click)="logout()">Salir</button>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-sm">Entrar</a>
            <a routerLink="/registro" class="btn btn-primary btn-sm">Crear cuenta</a>
          }
        </div>
      </div>
    </header>
  `,
})
export class Navbar {
  readonly isDark = signal(true);

  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
  ) {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
    });
  }

  toggleTheme(): void {
    this.isDark.set(!this.isDark());
  }

  logout(): void {
    this.auth.logout();
  }
}
