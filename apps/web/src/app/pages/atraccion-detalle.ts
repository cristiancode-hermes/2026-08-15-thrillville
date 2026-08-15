import { Component, OnInit, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttractionService } from '../services/attractions.service';
import { WaitBadge } from '../components/wait-badge';
import type { Attraction } from '../models';
import { errorMsg, zonaNombre } from '../utils';

@Component({
  selector: 'app-atraccion-detalle',
  standalone: true,
  imports: [RouterLink, WaitBadge],
  template: `
    <section class="section">
      <div class="container" style="max-width:860px">
        <a routerLink="/atracciones" class="btn btn-ghost btn-sm">← Atracciones</a>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }

        @if (attr(); as a) {
          <div class="mt-2">
            <div class="flex between flex-wrap">
              <div>
                <span class="badge" [class]="estadoBadge(a.estado)">{{ estadoLabel(a.estado) }}</span>
                <h1 style="font-size:clamp(28px,4.5vw,40px);margin-top:0.5rem">{{ a.name }}</h1>
                <p class="text-muted">{{ zonaNombre(a.zona) }} · {{ a.tipo }} · Intensidad {{ '★'.repeat(a.intensidad) }}</p>
              </div>
              <div class="card" style="min-width:220px">
                <div class="kpi-label">Espera en vivo</div>
                <app-wait-badge [wait]="a.wait ?? null" />
                <div class="text-muted" style="font-size:12px;margin-top:0.35rem">
                  Cola modelada: {{ a.wait?.cola ?? 0 }} · ciclo {{ a.duracionCicloMin }} min · {{ a.capacidadCiclo }} pers.
                </div>
              </div>
            </div>

            <p style="margin-top:1.25rem">{{ a.descripcion }}</p>

            <div class="grid-auto mt-3">
              <div class="card">
                <div class="kpi-label">Altura mínima</div>
                <div class="kpi-num">{{ a.alturaMinCm > 0 ? a.alturaMinCm + ' cm' : 'Sin mínimo' }}</div>
              </div>
              <div class="card">
                <div class="kpi-label">Edad mínima</div>
                <div class="kpi-num">{{ a.edadMin }} años</div>
              </div>
              <div class="card">
                <div class="kpi-label">Puntos por visita</div>
                <div class="kpi-num">+{{ a.puntosPorVisita }} pts</div>
              </div>
            </div>

            <div class="card mt-3" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">
              <div>
                <strong style="font-family:var(--font-display);font-size:18px">¿Quieres saltarte la cola?</strong>
                <div class="text-muted">Reserva un FastPass con retención de 15 minutos.</div>
              </div>
              <a routerLink="/fastpass" [queryParams]="{ atraccion: a.id }" class="btn btn-secondary">Reservar FastPass</a>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class AtraccionDetallePage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly zonaNombre = zonaNombre;
  readonly id = input.required<string>();
  readonly attr = signal<Attraction | null>(null);
  readonly error = signal('');

  constructor(private readonly attractionsService: AttractionService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      this.attr.set(await this.attractionsService.get(this.id()));
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  estadoBadge(estado: string): string {
    return estado === 'cerrada' ? 'badge-danger' : estado === 'saturada' ? 'badge-amber' : 'badge-mint';
  }

  estadoLabel(estado: string): string {
    return estado === 'cerrada' ? 'Cerrada' : estado === 'saturada' ? 'Saturada' : 'Operativa';
  }
}
