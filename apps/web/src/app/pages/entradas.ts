import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../services/tickets.service';
import { AuthService } from '../services/auth.service';
import type { Precios } from '../models';
import { errorMsg, formatEuros, madridDatePlus } from '../utils';

interface Item {
  tipo: 'adulto' | 'nino';
  cantidad: number;
}

@Component({
  selector: 'app-entradas',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container" style="max-width:920px">
        <h1 class="section-title">Entradas</h1>
        <p class="text-muted">Precios calculados en el servidor (IVA 21% incluido). Elige fecha y tipos.</p>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }

        <div class="grid-auto mt-3" style="align-items:start">
          <div class="card">
            <label class="label" for="fecha">Día de visita</label>
            <input id="fecha" class="input" type="date" [min]="hoy" [value]="fecha()" (change)="onFecha($event)" />
            <div class="text-muted" style="font-size:13px;margin-top:0.4rem">Europe/Madrid · abierto 10:00–23:00</div>

            <div class="mt-2">
              <div class="flex between" style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div>
                  <strong>Adulto</strong>
                  <div class="text-muted" style="font-size:13px">{{ precioAdulto() }}</div>
                </div>
                <div class="flex">
                  <button class="btn btn-ghost btn-sm" (click)="cambiar('adulto', -1)">−</button>
                  <span class="mono" style="min-width:2ch;text-align:center;font-size:18px">{{ adultos() }}</span>
                  <button class="btn btn-ghost btn-sm" (click)="cambiar('adulto', 1)">+</button>
                </div>
              </div>
              <div class="flex between" style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div>
                  <strong>Niño</strong>
                  <div class="text-muted" style="font-size:13px">{{ precioNino() }}</div>
                </div>
                <div class="flex">
                  <button class="btn btn-ghost btn-sm" (click)="cambiar('nino', -1)">−</button>
                  <span class="mono" style="min-width:2ch;text-align:center;font-size:18px">{{ ninos() }}</span>
                  <button class="btn btn-ghost btn-sm" (click)="cambiar('nino', 1)">+</button>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">Resumen</h3>
            <div class="flex between"><span class="text-muted">Subtotal</span><span>{{ formatEuros(subtotalCents()) }}</span></div>
            <div class="flex between"><span class="text-muted">IVA ({{ precios()?.iva ?? 21 }}%)</span><span>{{ formatEuros(ivaCents()) }}</span></div>
            <div class="flex between" style="font-weight:800;font-size:18px;margin-top:0.5rem">
              <span>Total</span><span class="mono">{{ formatEuros(totalCents()) }}</span>
            </div>
            <button class="btn btn-primary btn-block mt-2" [disabled]="totalCents() === 0 || buying()" (click)="checkout()">
              {{ buying() ? 'Procesando…' : 'Comprar' }}
            </button>
            @if (!auth.isAuthenticated()) {
              <p class="text-muted" style="font-size:13px;margin-top:0.6rem">
                Para pagar necesitas una cuenta.
                <a routerLink="/login" [queryParams]="{ returnUrl: '/entradas' }">Inicia sesión</a>.
              </p>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class EntradasPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly formatEuros = formatEuros;
  readonly madridDatePlus = madridDatePlus;
  readonly hoy = madridDatePlus(0);
  readonly fecha = signal(this.hoy);
  readonly adultos = signal(1);
  readonly ninos = signal(0);
  readonly precios = signal<Precios | null>(null);
  readonly buying = signal(false);
  readonly error = signal('');

  constructor(
    private readonly tickets: TicketService,
    readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    void this.tickets
      .precios()
      .then((p) => this.precios.set(p))
      .catch((e) => this.error.set(errorMsg(e)));
  }

  onFecha(event: Event): void {
    this.fecha.set((event.target as HTMLInputElement).value);
  }

  precioAdulto(): string {
    const p = this.precios();
    return p ? formatEuros(Math.round(p.adulto * 100)) : '';
  }

  precioNino(): string {
    const p = this.precios();
    return p ? formatEuros(Math.round(p.nino * 100)) : '';
  }

  cambiar(tipo: 'adulto' | 'nino', delta: number): void {
    if (tipo === 'adulto') {
      const v = Math.min(6, Math.max(0, this.adultos() + delta));
      this.adultos.set(v);
    } else {
      const v = Math.min(6, Math.max(0, this.ninos() + delta));
      this.ninos.set(v);
    }
  }

  items(): Item[] {
    const out: Item[] = [];
    if (this.adultos() > 0) out.push({ tipo: 'adulto', cantidad: this.adultos() });
    if (this.ninos() > 0) out.push({ tipo: 'nino', cantidad: this.ninos() });
    return out;
  }

  subtotalCents(): number {
    const p = this.precios();
    if (!p) return 0;
    return Math.round(p.adulto * 100) * this.adultos() + Math.round(p.nino * 100) * this.ninos();
  }

  ivaCents(): number {
    return Math.round((this.subtotalCents() * (this.precios()?.iva ?? 21)) / 100);
  }

  totalCents(): number {
    return this.subtotalCents() + this.ivaCents();
  }

  async checkout(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/entradas' } });
      return;
    }
    if (this.items().length === 0) return;
    this.buying.set(true);
    this.error.set('');
    try {
      const res = await this.tickets.comprar(this.fecha(), this.items());
      this.router.navigate(['/entradas', res.ticket.id]);
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.buying.set(false);
    }
  }
}
