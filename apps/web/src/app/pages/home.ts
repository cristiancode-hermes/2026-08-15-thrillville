import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttractionService } from '../services/attractions.service';
import { WaitBadge } from '../components/wait-badge';
import type { Attraction, ZonaInfo } from '../models';
import { errorMsg, zonaNombre } from '../utils';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, WaitBadge],
  template: `
    <section class="hero">
      <div class="container">
        <h1>Tu visita al parque,<br />sin colas ni sorpresas</h1>
        <p>
          Tiempos de espera en vivo, entradas con IVA calculado en el momento,
          FastPass con retención de 15 minutos y insignias por cada vuelta.
        </p>
        <div class="hero-cta">
          <a routerLink="/entradas" class="btn btn-primary">Comprar entradas</a>
          <a routerLink="/mapa" class="btn btn-secondary">Ver mapa en vivo</a>
        </div>
      </div>
    </section>

    @if (error()) {
      <div class="container mt-2"><div class="alert alert-error">{{ error() }}</div></div>
    }

    <section class="section">
      <div class="container">
        <div class="flex between flex-wrap mb-2">
          <h2 class="section-title">Esperas en vivo</h2>
          <a routerLink="/atracciones" class="btn btn-ghost btn-sm">Ver todas</a>
        </div>
        @if (loading()) {
          <div class="grid-auto">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="card"><span class="text-muted">Cargando…</span></div>
            }
          </div>
        } @else {
          <div class="grid-auto">
            @for (a of attractions(); track a.id) {
              <article class="card attr-card">
                <div class="attr-head">
                  <div>
                    <h3 class="attr-name">{{ a.name }}</h3>
                    <div class="attr-meta">{{ zonaNombre(a.zona) }} · {{ a.tipo }}</div>
                  </div>
                  <span class="badge" [class]="estadoBadge(a.estado)">{{ estadoLabel(a.estado) }}</span>
                </div>
                <app-wait-badge [wait]="a.wait ?? null" />
                <div class="attr-foot">
                  <span class="attr-meta">+{{ a.puntosPorVisita }} pts</span>
                  <a [routerLink]="['/atracciones', a.id]" class="btn btn-ghost btn-sm">Detalle</a>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <h2 class="section-title">Zonas del parque</h2>
        <div class="grid-auto mt-2">
          @for (z of zonas(); track z.zona) {
            <div class="card">
              <h3 class="card-title">{{ z.nombre }}</h3>
              <p class="text-muted">{{ z.count }} atracción{{ z.count === 1 ? '' : 'es' }}</p>
              <a [routerLink]="['/atracciones']" [queryParams]="{ zona: z.zona }" class="btn btn-ghost btn-sm mt-1">Explorar</a>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomePage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly zonaNombre = zonaNombre;
  readonly attractions = signal<Attraction[]>([]);
  readonly zonas = signal<ZonaInfo[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(private readonly attractionsService: AttractionService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [atts, zns] = await Promise.all([this.attractionsService.list(), this.attractionsService.zonas()]);
      this.attractions.set(atts);
      this.zonas.set(zns);
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.loading.set(false);
    }
  }

  estadoBadge(estado: string): string {
    return estado === 'cerrada' ? 'badge-danger' : estado === 'saturada' ? 'badge-amber' : 'badge-mint';
  }

  estadoLabel(estado: string): string {
    return estado === 'cerrada' ? 'Cerrada' : estado === 'saturada' ? 'Saturada' : 'Operativa';
  }
}
