import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { errorMsg } from '../utils';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-brand">
        <span style="font-size:44px">🎟️</span>
        <h1 style="font-size:clamp(28px,4vw,40px)">Tu aventura empieza aquí</h1>
        <p style="color:var(--ink-300)">Crea tu cuenta para comprar entradas, reservar FastPass y coleccionar insignias.</p>
      </div>
      <div class="auth-form">
        <div class="auth-card">
          <h2 style="font-size:26px">Crear cuenta</h2>

          @if (error()) {
            <div class="alert alert-error mt-2">{{ error() }}</div>
          }

          <form (ngSubmit)="submit()" class="mt-2" style="display:flex;flex-direction:column;gap:0.9rem">
            <div>
              <label class="label" for="username">Usuario</label>
              <input id="username" class="input" name="username" [(ngModel)]="username" required minlength="3" maxlength="24" autocomplete="username" />
            </div>
            <div>
              <label class="label" for="email">Email</label>
              <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
            </div>
            <div>
              <label class="label" for="password">Contraseña</label>
              <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required minlength="6" autocomplete="new-password" />
            </div>
            <div>
              <label class="label" for="password2">Repite la contraseña</label>
              <input id="password2" class="input" type="password" name="password2" [(ngModel)]="password2" required autocomplete="new-password" />
            </div>
            @if (password() && password2() && password() !== password2()) {
              <div class="alert alert-error">Las contraseñas no coinciden.</div>
            }
            <button class="btn btn-primary btn-block" type="submit" [disabled]="loading() || password() !== password2()">
              {{ loading() ? 'Creando…' : 'Crear cuenta' }}
            </button>
          </form>

          <p class="text-muted" style="font-size:14px;margin-top:1rem">
            ¿Ya tienes cuenta? <a routerLink="/login">Entra</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegistroPage {
  readonly errorMsg = errorMsg;
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly password2 = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async submit(): Promise<void> {
    if (!this.username() || !this.email() || !this.password() || this.password() !== this.password2()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.register(this.username(), this.email(), this.password());
      this.router.navigate(['/']);
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.loading.set(false);
    }
  }
}
