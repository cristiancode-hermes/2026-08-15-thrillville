import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttractionService } from '../services/attractions.service';
import type { Attraction } from '../models';
import { errorMsg, zonaNombre } from '../utils';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <h1 class="section-title">Mapa del parque</h1>
        <p class="text-muted">Toca un pin para ver la espera en vivo y reservar FastPass.</p>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }

        <div class="park-map mt-2">
          <span class="map-zone-label" style="left:12%;top:8%">Zona Norte</span>
          <span class="map-zone-label" style="left:44%;top:40%">Plaza Central</span>
          <span class="map-zone-label" style="left:70%;top:75%">Zona Aventura</span>

          @for (a of attractions(); track a.id) {
            <button
              class="map-pin"
              [class.cerrada]="a.estado === 'cerrada'"
              [style.left.%]="a.posX"
              [style.top.%]="a.posY"
              [style.background]="a.colorAcento"
              [attr.aria-label]="a.name"
              (click)="toggle(a.id)"
            >
              {{ pinIcon(a.tipo) }}
            </button>
            @if (selectedId() === a.id) {
              <div class="pin-popover" [style.left.%]="a.posX" [style.top.%]="a.posY">
                <strong style="font-family:var(--font-display);font-size:16px">{{ a.name }}</strong>
                <div class="text-muted" style="font-size:13px">{{ zonaNombre(a.zona) }} · {{ a.tipo }}</div>
                <div class="mt-1">
                  @if (a.wait) {
                    <span class="mono" style="font-size:22px;font-weight:700">{{ a.wait.waitMinutes }} min</span>
                    <span class="badge ml-1" [class]="waitBadge(a.wait.estado)">{{ waitLabel(a.wait.estado) }}</span>
                  } @else {
                    <span class="badge badge-neutral">Sin datos</span>
                  }
                </div>
                <div class="flex mt-1">
                  <a [routerLink]="['/atracciones', a.id]" class="btn btn-ghost btn-sm">Detalle</a>
                  <a routerLink="/fastpass" [queryParams]="{ atraccion: a.id }" class="btn btn-primary btn-sm">FastPass</a>
                </div>
              </div>
            }
          }
        </div>

        <div class="map-legend">
          <span><span class="legend-dot" style="background:var(--mint-400)"></span>Operativa</span>
          <span><span class="legend-dot" style="background:var(--amber-400)"></span>Saturada</span>
          <span><span class="legend-dot" style="background:var(--danger-500)"></span>Cerrada</span>
          <span>Actualizado al momento · Europe/Madrid</span>
        </div>
      </div>
    </section>
  `,
  styles: ['.ml-1 { margin-left: 0.5rem; }'],
})
export class MapaPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly zonaNombre = zonaNombre;
  readonly attractions = signal<Attraction[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly error = signal('');

  constructor(private readonly attractionsService: AttractionService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.attractions.set(await this.attractionsService.list());
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  toggle(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  pinIcon(tipo: string): string {
    const map: Record<string, string> = {
      'Montaña rusa': '🎢',
      'Montaña rusa lanzada': '🚀',
      Noria: '🎡',
      Familiar: '🎠',
      Terror: '👻',
      Rápidos: '🌊',
    };
    return map[tipo] ?? '🎡';
  }

  waitBadge(estado: string): string {
    return estado === 'cerrada' ? 'badge-danger' : estado === 'saturada' ? 'badge-amber' : 'badge-mint';
  }

  waitLabel(estado: string): string {
    return estado === 'cerrada' ? 'Cerrada' : estado === 'saturada' ? 'Saturada' : 'En vivo';
  }
}
