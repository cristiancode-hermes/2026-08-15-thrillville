import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttractionService } from '../services/attractions.service';
import { WaitBadge } from '../components/wait-badge';
import type { Attraction } from '../models';
import { errorMsg, zonaNombre } from '../utils';

@Component({
  selector: 'app-atracciones',
  standalone: true,
  imports: [RouterLink, WaitBadge],
  template: `
    <section class="section">
      <div class="container">
        <h1 class="section-title">Atracciones</h1>
        <p class="text-muted">Filtra por zona, intensidad o busca por nombre.</p>

        <div class="flex flex-wrap mt-2">
          <input class="input" style="max-width:280px" placeholder="Buscar atracción…"
            (input)="onQuery($event)" [value]="q()" aria-label="Buscar" />
          <select class="input" style="max-width:220px" (change)="onZona($event)" aria-label="Zona">
            <option value="">Todas las zonas</option>
            @for (z of zonas; track z) {
              <option [value]="z" [selected]="filtroZona() === z">{{ zonaNombre(z) }}</option>
            }
          </select>
          <select class="input" style="max-width:220px" (change)="onIntensidad($event)" aria-label="Intensidad">
            <option value="">Cualquier intensidad</option>
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <option [value]="i" [selected]="selInt(i)">{{ i }} {{ '★'.repeat(i) }}</option>
            }
          </select>
        </div>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }

        <div class="grid-auto mt-3">
          @for (a of attractions(); track a.id) {
            <article class="card attr-card">
              <div class="attr-head">
                <div>
                  <h3 class="attr-name">{{ a.name }}</h3>
                  <div class="attr-meta">{{ zonaNombre(a.zona) }} · {{ a.tipo }} · ★{{ a.intensidad }}</div>
                </div>
                <span class="badge" [class]="estadoBadge(a.estado)">{{ estadoLabel(a.estado) }}</span>
              </div>
              <app-wait-badge [wait]="a.wait ?? null" />
              <div class="attr-meta">Altura mín. {{ a.alturaMinCm > 0 ? a.alturaMinCm + ' cm' : '—' }} · Edad {{ a.edadMin }}+</div>
              <div class="attr-foot">
                <span class="attr-meta">+{{ a.puntosPorVisita }} pts</span>
                <a [routerLink]="['/atracciones', a.id]" class="btn btn-primary btn-sm">Ver detalle</a>
              </div>
            </article>
          } @empty {
            @if (!loading()) {
              <p class="text-muted">No hay atracciones con esos filtros.</p>
            }
          }
        </div>
      </div>
    </section>
  `,
})
export class AtraccionesPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly zonaNombre = zonaNombre;
  readonly attractions = signal<Attraction[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly q = signal('');
  readonly filtroZona = signal('');
  readonly filtroIntensidad = signal('');
  readonly zonas = ['norte', 'plaza', 'aventura'];

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly attractionsService: AttractionService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      this.attractions.set(
        await this.attractionsService.list({
          zona: this.filtroZona(),
          intensidad: this.filtroIntensidad(),
          q: this.q(),
        }),
      );
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.loading.set(false);
    }
  }

  onQuery(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value);
    this.debounce();
  }

  onZona(event: Event): void {
    this.filtroZona.set((event.target as HTMLSelectElement).value);
    void this.load();
  }

  selInt(i: number): boolean {
    return this.filtroIntensidad() === String(i);
  }

  onIntensidad(event: Event): void {
    this.filtroIntensidad.set((event.target as HTMLSelectElement).value);
    void this.load();
  }

  private debounce(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(), 300);
  }

  estadoBadge(estado: string): string {
    return estado === 'cerrada' ? 'badge-danger' : estado === 'saturada' ? 'badge-amber' : 'badge-mint';
  }

  estadoLabel(estado: string): string {
    return estado === 'cerrada' ? 'Cerrada' : estado === 'saturada' ? 'Saturada' : 'Operativa';
  }
}
