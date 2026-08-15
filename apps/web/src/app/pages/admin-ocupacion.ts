import { Component, OnInit, signal } from '@angular/core';
import { AdminService } from '../services/admin.service';
import type { AdminKpis, OcupacionPoint } from '../models';
import { errorMsg, formatEuros } from '../utils';

@Component({
  selector: 'app-admin-ocupacion',
  standalone: true,
  template: `
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (kpis(); as k) {
      <div class="grid-auto">
        <div class="card kpi-tile">
          <div class="kpi-label">Visitantes hoy</div>
          <div class="kpi-num">{{ k.visitantesHoy }}</div>
        </div>
        <div class="card kpi-tile">
          <div class="kpi-label">Espera media</div>
          <div class="kpi-num">{{ k.esperaMedia }} <small style="font-size:14px">min</small></div>
        </div>
        <div class="card kpi-tile">
          <div class="kpi-label">FastPass hoy</div>
          <div class="kpi-num">{{ k.fastpassHoy }}</div>
        </div>
        <div class="card kpi-tile">
          <div class="kpi-label">Ingresos hoy</div>
          <div class="kpi-num">{{ formatEuros(k.ingresosHoyCents) }}</div>
        </div>
      </div>
      <div class="text-muted" style="font-size:12px;margin-top:0.5rem">
        {{ k.atraccionesOperativas }} de {{ k.atraccionesTotales }} atracciones operativas
      </div>
    }

    <div class="card chart-card mt-2">
      <h3 class="card-title">Ocupación por hora (hoy, Europe/Madrid)</h3>
      <div class="chart-wrap mt-2">
        <svg viewBox="0 0 640 260" role="img" aria-label="Ocupación por hora">
          <line x1="40" y1="10" x2="40" y2="200" stroke="var(--border)" stroke-width="1" />
          <line x1="40" y1="200" x2="620" y2="200" stroke="var(--border)" stroke-width="1" />
          @for (g of gridlines(); track g.y) {
            <line x1="40" [attr.y1]="g.y" x2="620" [attr.y2]="g.y" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3 4" />
            <text x="34" [attr.y]="g.y + 4" text-anchor="end" class="chart-tooltip">{{ g.label }}</text>
          }
          @for (pt of serie(); track pt.hora) {
            <g>
              <circle [attr.cx]="x(pt)" [attr.cy]="y(pt.visitantes)" r="4" fill="var(--neon-500)">
                <title>{{ pt.hora }} — {{ pt.visitantes }} visitantes</title>
              </circle>
              @if (showLabel(pt)) {
                <text [attr.x]="x(pt)" y="218" text-anchor="middle" class="chart-tooltip">{{ pt.hora }}</text>
              }
            </g>
          }
          <polyline
            fill="none" stroke="var(--neon-500)" stroke-width="2.5"
            [attr.points]="linePoints()"
          />
        </svg>
      </div>
      <div class="text-muted" style="font-size:12px">Eje X: hora (00:00–23:00) · Eje Y: nº de check-ins. Pasa el ratón por los puntos para ver el detalle.</div>
    </div>
  `,
})
export class AdminOcupacionPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly formatEuros = formatEuros;
  readonly kpis = signal<AdminKpis | null>(null);
  readonly serie = signal<OcupacionPoint[]>([]);
  readonly error = signal('');

  constructor(private readonly admin: AdminService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      const [k, s] = await Promise.all([this.admin.kpis(), this.admin.ocupacion()]);
      this.kpis.set(k);
      this.serie.set(s);
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  maxY(): number {
    return Math.max(4, ...this.serie().map((p) => p.visitantes));
  }

  gridlines(): Array<{ y: number; label: string }> {
    const max = this.maxY();
    return [0.25, 0.5, 0.75, 1].map((f) => ({
      y: 200 - f * 190,
      label: String(Math.round(max * f)),
    }));
  }

  x(pt: OcupacionPoint): number {
    const idx = this.serie().indexOf(pt);
    return 60 + idx * ((560) / Math.max(1, this.serie().length - 1));
  }

  /** Etiqueta cada 3 horas para evitar solapes */
  showLabel(pt: OcupacionPoint): boolean {
    return this.serie().indexOf(pt) % 3 === 0;
  }

  y(v: number): number {
    return 200 - (v / this.maxY()) * 190;
  }

  linePoints(): string {
    return this.serie().map((p) => `${this.x(p)},${this.y(p.visitantes)}`).join(' ');
  }
}
