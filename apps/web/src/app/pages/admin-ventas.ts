import { Component, OnInit, signal } from '@angular/core';
import { AdminService } from '../services/admin.service';
import type { VentasPoint } from '../models';
import { errorMsg, formatEuros } from '../utils';

@Component({
  selector: 'app-admin-ventas',
  standalone: true,
  template: `
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <div class="card chart-card">
      <h3 class="card-title">Ventas — últimos 7 días</h3>
      <div class="chart-wrap mt-2">
        <svg viewBox="0 0 640 280" role="img" aria-label="Ventas de los últimos 7 días">
          <line x1="40" y1="10" x2="40" y2="220" stroke="var(--border)" stroke-width="1" />
          <line x1="40" y1="220" x2="620" y2="220" stroke="var(--border)" stroke-width="1" />
          @for (g of gridlines(); track g) {
            <line x1="40" [attr.y1]="g" x2="620" [attr.y2]="g" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3 4" />
            <text x="34" [attr.y]="g + 4" text-anchor="end" class="chart-tooltip">{{ gridLabel(g) }}</text>
          }
          @for (pt of serie(); track pt.fecha) {
            <g>
              <rect
                [attr.x]="barX(pt)" [attr.y]="barY(pt.ingresosCents)"
                [attr.width]="barW()" [attr.height]="barH(pt.ingresosCents)"
                rx="6" fill="var(--amber-400)"
              >
                <title>{{ pt.fecha }} — {{ formatEuros(pt.ingresosCents) }} ({{ pt.tickets }} ticket{{ pt.tickets === 1 ? '' : 's' }})</title>
              </rect>
              <text [attr.x]="barX(pt) + barW() / 2" y="238" text-anchor="middle" class="chart-tooltip">{{ shortDate(pt.fecha) }}</text>
            </g>
          }
        </svg>
      </div>
      <div class="text-muted" style="font-size:12px">Eje X: fecha (Europe/Madrid) · Eje Y: ingresos en €. Pasa el ratón por cada barra para ver el detalle.</div>
    </div>

    <div class="card mt-2">
      <h3 class="card-title">Detalle por día</h3>
      <table class="table">
        <thead><tr><th>Fecha</th><th>Tickets</th><th>Ingresos</th></tr></thead>
        <tbody>
          @for (pt of serie(); track pt.fecha) {
            <tr>
              <td>{{ shortDate(pt.fecha) }}</td>
              <td>{{ pt.tickets }}</td>
              <td class="mono">{{ formatEuros(pt.ingresosCents) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AdminVentasPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly formatEuros = formatEuros;
  readonly serie = signal<VentasPoint[]>([]);
  readonly error = signal('');

  constructor(private readonly admin: AdminService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      this.serie.set(await this.admin.ventas(7));
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  maxCents(): number {
    return Math.max(1, ...this.serie().map((p) => p.ingresosCents));
  }

  gridlines(): number[] {
    const max = this.maxCents();
    return [0.25, 0.5, 0.75].map((f) => 220 - f * 200);
  }

  gridLabel(y: number): string {
    const max = this.maxCents();
    const cents = Math.round((((220 - y) / 200) * max) / 100) * 100;
    return formatEuros(cents);
  }

  barX(pt: VentasPoint): number {
    const n = this.serie().length;
    const slot = 560 / n;
    return 50 + this.serie().indexOf(pt) * slot + (slot - this.barW()) / 2;
  }

  barW(): number {
    return Math.max(18, Math.min(46, 560 / this.serie().length - 14));
  }

  barH(cents: number): number {
    return Math.max(2, (cents / this.maxCents()) * 200);
  }

  barY(cents: number): number {
    return 220 - this.barH(cents);
  }

  shortDate(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(d);
  }
}
