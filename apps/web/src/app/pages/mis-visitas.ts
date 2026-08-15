import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TicketService } from '../services/tickets.service';
import { FastPassService } from '../services/fastpass.service';
import { BadgeService } from '../services/badges.service';
import type { BadgeView, CheckInView, FastPassView, PuntosView, TicketView } from '../models';
import { errorMsg, formatEuros, formatFecha, formatFechaLarga, formatHora } from '../utils';

@Component({
  selector: 'app-mis-visitas',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <h1 class="section-title">Mis visitas</h1>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }

        @if (puntos(); as p) {
          <div class="card mt-2" style="background:linear-gradient(120deg, rgb(227 61 127 / 0.14), transparent 60%)">
            <div class="flex between flex-wrap">
              <div>
                <div class="kpi-label">Nivel de explorador</div>
                <div class="kpi-num">{{ p.nivel }}</div>
                <div class="text-muted" style="font-size:13px">
                  {{ p.puntos }} pts
                  @if (p.nivelSiguiente) { · {{ p.progreso }}% hacia {{ p.nivelSiguiente }} }
                </div>
              </div>
              <a routerLink="/fastpass" class="btn btn-secondary">Reservar FastPass</a>
            </div>
            <div style="height:10px;border-radius:999px;background:var(--surface-hover);overflow:hidden;margin-top:0.75rem">
              <div style="height:100%;width:{{ p.progreso }}%;background:linear-gradient(90deg, var(--neon-500), var(--amber-400));border-radius:999px"></div>
            </div>
          </div>
        }

        <div class="flex mt-3" style="gap:0.5rem;flex-wrap:wrap">
          @for (tab of tabs; track tab.key) {
            <button class="btn btn-ghost btn-sm" [class.btn-primary]="tabActiva() === tab.key" (click)="tabActiva.set(tab.key)">
              {{ tab.label }}
            </button>
          }
        </div>

        @if (tabActiva() === 'entradas') {
          <div class="grid-auto mt-3">
            @for (t of tickets(); track t.id) {
              <a class="card" [routerLink]="['/entradas', t.id]" style="text-decoration:none;color:inherit">
                <span class="badge badge-mint">{{ t.estadoLabel }}</span>
                <h3 class="card-title mt-1">{{ t.tipoLabel }} × {{ t.cantidad }}</h3>
                <div class="text-muted" style="font-size:13px">{{ formatFechaLarga(t.fechaVisita) }} · {{ t.ref }}</div>
                <div class="mono" style="font-size:18px;font-weight:700;margin-top:0.5rem">{{ formatEuros(t.totalCents) }}</div>
              </a>
            } @empty {
              <p class="text-muted"><a routerLink="/entradas">Compra tu primera entrada →</a></p>
            }
          </div>
        }

        @if (tabActiva() === 'fastpass') {
          <div class="mt-3" style="display:flex;flex-direction:column;gap:0.75rem">
            @for (fp of fastpass(); track fp.id) {
              <div class="card">
                <div class="flex between">
                  <strong style="font-family:var(--font-display)">{{ fp.atraccionNombre }}</strong>
                  <span class="badge" [class]="fpBadge(fp.estado)">{{ fp.estadoLabel }}</span>
                </div>
                <div class="text-muted" style="font-size:13px">{{ formatFechaLarga(fp.fecha + 'T12:00:00') }} · {{ fp.horaInicio }} · {{ fp.ref }}</div>
                <div class="flex mt-1">
                  @if (fp.estado === 'confirmed' || fp.estado === 'used') {
                    <a [routerLink]="['/fastpass', fp.id]" class="btn btn-ghost btn-sm">Ver QR</a>
                  }
                  @if (fp.estado === 'pending') {
                    <a [routerLink]="['/fastpass']" class="btn btn-primary btn-sm">Confirmar</a>
                  }
                </div>
              </div>
            } @empty {
              <p class="text-muted"><a routerLink="/fastpass">Reserva tu primer FastPass →</a></p>
            }
          </div>
        }

        @if (tabActiva() === 'insignias') {
          <div class="grid-auto mt-3">
            @for (b of badges(); track b.id) {
              <div class="card badge-card" [class.locked]="!b.ganada">
                <div class="badge-icon">{{ b.icono }}</div>
                <div class="badge-name">{{ b.nombre }}</div>
                <div class="badge-desc">{{ b.descripcion }}</div>
                @if (b.ganada) {
                  <span class="badge badge-mint mt-1">Ganada</span>
                } @else {
                  <span class="badge badge-neutral mt-1">Bloqueada</span>
                }
              </div>
            }
          </div>
        }

        @if (tabActiva() === 'historial') {
          <div class="card mt-3">
            <table class="table">
              <thead>
                <tr><th>Fecha</th><th>Atracción</th><th>Vía</th><th>Puntos</th></tr>
              </thead>
              <tbody>
                @for (c of historial(); track c.id) {
                  <tr>
                    <td>{{ formatFecha(c.at) }} · {{ formatHora(c.at) }}</td>
                    <td>{{ c.attraction?.name ?? 'Atracción' }}</td>
                    <td>{{ c.via === 'fastpass' ? 'FastPass' : 'Walk-up' }}</td>
                    <td class="mono">+{{ c.puntosGanados ?? 0 }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="text-muted">Aún no has hecho check-in en ninguna atracción.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
})
export class MisVisitasPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly formatEuros = formatEuros;
  readonly formatFecha = formatFecha;
  readonly formatFechaLarga = formatFechaLarga;
  readonly formatHora = formatHora;
  readonly tabs = [
    { key: 'entradas', label: 'Entradas' },
    { key: 'fastpass', label: 'FastPass' },
    { key: 'insignias', label: 'Insignias' },
    { key: 'historial', label: 'Historial' },
  ];
  readonly tabActiva = signal('entradas');
  readonly puntos = signal<PuntosView | null>(null);
  readonly tickets = signal<TicketView[]>([]);
  readonly fastpass = signal<FastPassView[]>([]);
  readonly badges = signal<BadgeView[]>([]);
  readonly historial = signal<CheckInView[]>([]);
  readonly error = signal('');

  constructor(
    private readonly ticketsService: TicketService,
    private readonly fastpassService: FastPassService,
    private readonly badgesService: BadgeService,
  ) {}

  ngOnInit(): void {
    void Promise.all([
      this.badgesService.puntos().then((p) => this.puntos.set(p)),
      this.ticketsService.misTickets().then((t) => this.tickets.set(t)),
      this.fastpassService.misReservas().then((f) => this.fastpass.set(f)),
      this.badgesService.catalogo().then((b) => this.badges.set(b)),
      this.badgesService.historial().then((h) => this.historial.set(h)),
    ]).catch((e) => this.error.set(errorMsg(e)));
  }

  fpBadge(estado: string): string {
    const map: Record<string, string> = {
      pending: 'badge-amber',
      confirmed: 'badge-mint',
      used: 'badge-info',
      expired: 'badge-danger',
      cancelled: 'badge-neutral',
    };
    return map[estado] ?? 'badge-neutral';
  }
}
