import { Component, OnInit, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FastPassService } from '../services/fastpass.service';
import type { FastPassView } from '../models';
import { errorMsg, formatFechaLarga, formatHora } from '../utils';

@Component({
  selector: 'app-fastpass-qr',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container" style="max-width:560px;text-align:center">
        <a routerLink="/fastpass" class="btn btn-ghost btn-sm">← FastPass</a>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }

        @if (fp(); as f) {
          <div class="card mt-2">
            <span class="badge" [class]="fpBadge(f.estado)">{{ f.estadoLabel }}</span>
            <h1 style="font-size:28px;margin-top:0.5rem">{{ f.atraccionNombre }}</h1>
            <p class="text-muted">{{ formatFechaLarga(f.fecha + 'T12:00:00') }} · {{ f.horaInicio }} · {{ f.ref }}</p>

            <div class="qr-box mt-2" [innerHTML]="qrSvg()"></div>

            @if (f.estado === 'pending' && f.expiresAt) {
              <p class="text-muted" style="font-size:13px;margin-top:0.75rem">
                Reservada — expira a las {{ formatHora(f.expiresAt) }} si no confirmas.
              </p>
            }
            @if (f.estado === 'confirmed') {
              <p class="text-muted" style="font-size:13px;margin-top:0.75rem">
                Confirmada. Presenta este código en la atracción.
              </p>
            }

            <div class="flex mt-3" style="justify-content:center;flex-wrap:wrap">
              <button class="btn btn-primary" (click)="descargar()">Descargar QR (SVG)</button>
              @if (f.estado === 'confirmed') {
                <a routerLink="/fastpass" class="btn btn-secondary">Usar en la atracción</a>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class FastPassQrPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly formatFechaLarga = formatFechaLarga;
  readonly formatHora = formatHora;
  readonly id = input.required<string>();
  readonly fp = signal<FastPassView | null>(null);
  readonly qrSvg = signal('');
  readonly error = signal('');

  constructor(private readonly fastpass: FastPassService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      const res = await this.fastpass.get(this.id());
      this.fp.set(res.fastpass);
      this.qrSvg.set(res.qrSvg);
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  descargar(): void {
    const blob = new Blob([this.qrSvg()], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fastpass-${this.fp()?.ref ?? 'thrillville'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
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
