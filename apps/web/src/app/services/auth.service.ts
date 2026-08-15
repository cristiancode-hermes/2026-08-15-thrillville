import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import type { User } from '../models';

const TOKEN_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  /** Resuelve cuando el perfil se ha restaurado desde el token (o se ha descartado) */
  private readyResolve!: () => void;
  readonly ready: Promise<void> = new Promise((r) => (this.readyResolve = r));

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {
    const token = this.token();
    if (token) {
      // Sesión persistente: restaurar perfil ANTES de que los guards decidan
      this.api
        .get<{ user: User }>('/auth/me')
        .then((res) => {
          this.user.set(res.user);
          this.readyResolve();
        })
        .catch(() => {
          this.logout();
          this.readyResolve();
        });
    } else {
      this.readyResolve();
    }
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async login(identifier: string, password: string): Promise<void> {
    const res = await this.api.post<{ token: string; user: User }>('/auth/login', { identifier, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    this.user.set(res.user);
  }

  async register(username: string, email: string, password: string): Promise<void> {
    const res = await this.api.post<{ token: string; user: User }>('/auth/register', { username, email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    this.user.set(res.user);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
