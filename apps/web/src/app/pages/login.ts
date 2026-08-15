import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { errorMsg } from '../utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-brand">
        <span style="font-size:44px">🎢</span>
        <h1 style="font-size:clamp(28px,4vw,40px)">ThrillVille</h1>
        <p style="color:var(--ink-300)">Esperas en vivo, FastPass y gamificación. La feria nocturna en tu bolsillo.</p>
        <div class="badge badge-amber" style="align-self:flex-start">Abierto 10:00–23:00</div>
      </div>
      <div class="auth-form">
        <div class="auth-card">
          <h2 style="font-size:26px">Entrar al parque</h2>
          <p class="text-muted" style="font-size:14px">Con tu usuario o tu email.</p>

          @if (error()) {
            <div class="alert alert-error mt-2">{{ error() }}</div>
          }

          <form (ngSubmit)="submit()" class="mt-2" style="display:flex;flex-direction:column;gap:0.9rem">
            <div>
              <label class="label" for="identifier">Usuario o email</label>
              <input id="identifier" class="input" name="identifier" [(ngModel)]="identifier" required autocomplete="username" />
            </div>
            <div>
              <label class="label" for="password">Contraseña</label>
              <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
            </div>
            <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
              {{ loading() ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>

          <p class="text-muted" style="font-size:14px;margin-top:1rem">
            ¿No tienes cuenta? <a routerLink="/registro">Crea una gratis</a>
          </p>

          <div class="demo-creds">
            <strong>Cuenta de demostración</strong><br />
            usuario: <code>demo</code> · contraseña: <code>demo1234</code><br />
            admin: <code>admin</code> · <code>admin1234</code>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  readonly errorMsg = errorMsg;
  readonly identifier = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  async submit(): Promise<void> {
    if (!this.identifier() || !this.password()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.identifier(), this.password());
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      this.router.navigate([returnUrl && returnUrl.startsWith('/') ? returnUrl : '/']);
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.loading.set(false);
    }
  }
}
