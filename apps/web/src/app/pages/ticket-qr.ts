import { Component, OnInit, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TicketService } from '../services/tickets.service';
import type { TicketView } from '../models';
import { errorMsg, formatEuros, formatFechaLarga } from '../utils';

@Component({
  selector: 'app-ticket-qr',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container" style="max-width:560px;text-align:center">
        <a routerLink="/mis-visitas" class="btn btn-ghost btn-sm">← Mis visitas</a>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }

        @if (ticket(); as t) {
          <div class="card mt-2">
            <span class="badge badge-mint">{{ t.estadoLabel }}</span>
            <h1 style="font-size:28px;margin-top:0.5rem">Entrada {{ t.ref }}</h1>
            <p class="text-muted">{{ t.tipoLabel }} × {{ t.cantidad }} · {{ formatFechaLarga(t.fechaVisita) }}</p>

            <div class="qr-box mt-2" [innerHTML]="qrSvg()"></div>

            <div class="flex between mt-2" style="max-width:280px;margin-inline:auto">
              <span class="text-muted">Total</span>
              <span class="mono" style="font-size:20px;font-weight:700">{{ formatEuros(t.totalCents) }}</span>
            </div>

            <div class="flex mt-3" style="justify-content:center">
              <button class="btn btn-primary" (click)="descargar()">Descargar QR (SVG)</button>
            </div>
            <p class="text-muted" style="font-size:13px;margin-top:0.75rem">
              Te hemos enviado una copia a tu email (simulado). Presenta este código en la entrada.
            </p>
          </div>
        }
      </div>
    </section>
  `,
})
export class TicketQrPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly formatEuros = formatEuros;
  readonly formatFechaLarga = formatFechaLarga;
  readonly id = input.required<string>();
  readonly ticket = signal<TicketView | null>(null);
  readonly qrSvg = signal('');
  readonly error = signal('');

  constructor(private readonly tickets: TicketService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      const res = await this.tickets.get(this.id());
      this.ticket.set(res.ticket);
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
    a.download = `entrada-${this.ticket()?.ref ?? 'thrillville'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
