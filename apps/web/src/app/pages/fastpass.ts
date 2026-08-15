import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AttractionService } from '../services/attractions.service';
import { FastPassService } from '../services/fastpass.service';
import type { Attraction, FastPassView, SlotView } from '../models';
import { errorMsg, madridDatePlus, madridDateStr, zonaNombre } from '../utils';

@Component({
  selector: 'app-fastpass',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <h1 class="section-title">FastPass ⚡</h1>
        <p class="text-muted">Reserva tu salto de cola. La retención dura 15 minutos y se calcula en el servidor.</p>

        @if (error()) {
          <div class="alert alert-error mt-2">{{ error() }}</div>
        }
        @if (okMsg()) {
          <div class="alert alert-success mt-2">{{ okMsg() }}</div>
        }

        <div class="grid-auto mt-3" style="align-items:start">
          <div class="card">
            <h3 class="card-title">1 · Elige atracción y día</h3>
            <select class="input mt-1" (change)="onAttraction($event)" aria-label="Atracción">
              <option value="">Selecciona una atracción…</option>
              @for (a of attractions(); track a.id) {
                <option [value]="a.id" [selected]="atraccionId() === a.id">{{ a.name }} ({{ zonaNombre(a.zona) }})</option>
              }
            </select>
            <div class="flex mt-1" style="gap:0.5rem">
              <button class="btn btn-ghost btn-sm" [class.btn-primary]="fecha() === hoy" (click)="setFecha(hoy)">Hoy</button>
              <button class="btn btn-ghost btn-sm" [class.btn-primary]="fecha() === manana" (click)="setFecha(manana)">Mañana</button>
            </div>

            <h3 class="card-title mt-3">2 · Franja horaria</h3>
            @if (slotsLoading()) {
              <p class="text-muted">Cargando franjas…</p>
            } @else if (slots().length > 0) {
              <div class="slot-grid">
                @for (s of slots(); track s.horaInicio) {
                  <button
                    class="slot-chip"
                    [class.selected]="selectedSlot() === s.horaInicio"
                    [disabled]="s.estado === 'lleno' || s.capacidad === 0"
                    (click)="selectSlot(s.horaInicio)"
                  >
                    <span>{{ s.horaInicio }}</span>
                    <span class="slot-count">{{ s.estado === 'lleno' ? 'Lleno' : s.capacidad > 0 ? s.ocupados + '/' + s.capacidad : '—' }}</span>
                  </button>
                }
              </div>
            } @else {
              <p class="text-muted">Elige una atracción para ver las franjas.</p>
            }

            <button class="btn btn-primary btn-block mt-2" [disabled]="!selectedSlot() || reserving()" (click)="reservar()">
              {{ reserving() ? 'Reservando…' : 'Reservar FastPass' }}
            </button>

            @if (retencion()) {
              <div class="card mt-2" style="border-color:var(--amber-400)">
                <div class="kpi-label">Tu retención expira en</div>
                <div class="mono" style="font-size:28px;font-weight:700;color:var(--amber-400)">{{ countdown() }}</div>
                <div class="flex mt-1">
                  <button class="btn btn-primary btn-sm" [disabled]="confirming()" (click)="confirmar()">Confirmar</button>
                  <button class="btn btn-ghost btn-sm" [disabled]="confirming()" (click)="cancelarRetencion()">Cancelar</button>
                </div>
                <p class="text-muted" style="font-size:12px;margin-top:0.5rem">
                  Si no confirmas, el servidor libera el slot automáticamente al expirar.
                </p>
              </div>
            }
          </div>

          <div class="card">
            <h3 class="card-title">Mis reservas</h3>
            @if (misReservas().length === 0) {
              <p class="text-muted">Todavía no tienes FastPass.</p>
            }
            <div style="display:flex;flex-direction:column;gap:0.75rem">
              @for (fp of misReservas(); track fp.id) {
                <div class="card" style="padding:14px 16px">
                  <div class="flex between">
                    <strong style="font-family:var(--font-display)">{{ fp.atraccionNombre }}</strong>
                    <span class="badge" [class]="fpBadge(fp.estado)">{{ fp.estadoLabel }}</span>
                  </div>
                  <div class="text-muted" style="font-size:13px">
                    {{ formatFecha(fp.fecha) }} · {{ fp.horaInicio }} · {{ fp.ref }}
                  </div>
                  @if (fp.estado === 'pending' && fp.expiresAt) {
                    <div class="text-muted" style="font-size:12px">Expira {{ formatHora(fp.expiresAt) }}</div>
                  }
                  @if (fp.estado === 'cancelled' && fp.canceladoMotivo === 'admin_cierre') {
                    <div class="text-muted" style="font-size:12px">Cancelada por cierre de la atracción</div>
                  }
                  <div class="flex mt-1" style="flex-wrap:wrap">
                    @if (fp.estado === 'pending') {
                      <button class="btn btn-primary btn-sm" (click)="confirmar(fp.id)">Confirmar</button>
                      <button class="btn btn-ghost btn-sm" (click)="cancelar(fp.id)">Cancelar</button>
                    }
                    @if (fp.estado === 'confirmed') {
                      <button class="btn btn-secondary btn-sm" (click)="usar(fp.id)">Usar en la atracción</button>
                      <a [routerLink]="['/fastpass', fp.id]" class="btn btn-ghost btn-sm">Ver QR</a>
                    }
                    @if (fp.estado === 'used') {
                      <a [routerLink]="['/fastpass', fp.id]" class="btn btn-ghost btn-sm">Ver QR</a>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class FastPassPage implements OnInit, OnDestroy {
  readonly errorMsg = errorMsg;
  readonly madridDatePlus = madridDatePlus;
  readonly madridDateStr = madridDateStr;
  readonly zonaNombre = zonaNombre;
  readonly attractions = signal<Attraction[]>([]);
  readonly atraccionId = signal('');
  readonly fecha = signal(madridDateStr());
  readonly hoy = madridDateStr();
  readonly manana = madridDatePlus(1);
  readonly slots = signal<SlotView[]>([]);
  readonly slotsLoading = signal(false);
  readonly selectedSlot = signal('');
  readonly reserving = signal(false);
  readonly confirming = signal(false);
  readonly retencion = signal<{ id: number; expiresAt: string } | null>(null);
  readonly countdown = signal('');
  readonly misReservas = signal<FastPassView[]>([]);
  readonly error = signal('');
  readonly okMsg = signal('');

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onVisible = (): void => this.resync();

  constructor(
    private readonly fastpass: FastPassService,
    private readonly attractionsService: AttractionService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    void this.attractionsService.list().then((a) => this.attractions.set(a));
    void this.loadMisReservas();
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('focus', this.onVisible);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('focus', this.onVisible);
  }

  onAttraction(event: Event): void {
    this.atraccionId.set((event.target as HTMLSelectElement).value);
    this.selectedSlot.set('');
    void this.loadSlots();
  }

  setFecha(f: string): void {
    this.fecha.set(f);
    this.selectedSlot.set('');
    void this.loadSlots();
  }

  async loadSlots(): Promise<void> {
    if (!this.atraccionId()) return;
    this.slotsLoading.set(true);
    this.error.set('');
    try {
      this.slots.set(await this.fastpass.slots(this.atraccionId(), this.fecha()));
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.slotsLoading.set(false);
    }
  }

  selectSlot(hora: string): void {
    this.selectedSlot.set(hora);
  }

  async reservar(): Promise<void> {
    if (!this.atraccionId() || !this.selectedSlot()) return;
    this.reserving.set(true);
    this.error.set('');
    this.okMsg.set('');
    try {
      const res = await this.fastpass.reservar(this.atraccionId(), this.fecha(), this.selectedSlot());
      this.retencion.set({ id: res.fastpass.id, expiresAt: res.expiresAt });
      this.startCountdown(res.expiresAt);
      this.okMsg.set('Retención creada. Confirma antes de que expire.');
      void this.loadMisReservas();
      void this.loadSlots();
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.reserving.set(false);
    }
  }

  async confirmar(id?: number): Promise<void> {
    const fpId = id ?? this.retencion()?.id;
    if (!fpId) return;
    this.confirming.set(true);
    this.error.set('');
    try {
      await this.fastpass.confirmar(fpId);
      this.retencion.set(null);
      if (this.timer) clearInterval(this.timer);
      this.okMsg.set('FastPass confirmado. Tu QR está listo.');
      void this.loadMisReservas();
      void this.loadSlots();
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.confirming.set(false);
    }
  }

  async cancelar(id?: number): Promise<void> {
    const fpId = id ?? this.retencion()?.id;
    if (!fpId) return;
    this.error.set('');
    try {
      await this.fastpass.cancelar(fpId);
      this.retencion.set(null);
      if (this.timer) clearInterval(this.timer);
      this.okMsg.set('Reserva cancelada. El slot vuelve a estar disponible.');
      void this.loadMisReservas();
      void this.loadSlots();
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  cancelarRetencion(): void {
    void this.cancelar();
  }

  async usar(id: number): Promise<void> {
    this.error.set('');
    this.okMsg.set('');
    try {
      const res = await this.fastpass.usar(id);
      this.okMsg.set(`¡Check-in hecho! +${res.puntos} puntos en total.`);
      void this.loadMisReservas();
      void this.loadSlots();
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  async loadMisReservas(): Promise<void> {
    try {
      this.misReservas.set(await this.fastpass.misReservas());
    } catch {
      /* guard redirige */
    }
  }

  /** Cuenta atrás desde expiresAt del servidor; resync en visibilitychange/focus (pitfall setInterval congelado) */
  startCountdown(expiresAt: string): void {
    if (this.timer) clearInterval(this.timer);
    const tick = (): void => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        this.countdown.set('00:00');
        this.retencion.set(null);
        if (this.timer) clearInterval(this.timer);
        this.error.set('Tu retención expiró. El slot ha sido liberado.');
        void this.loadMisReservas();
        void this.loadSlots();
        return;
      }
      const m = Math.floor(ms / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      this.countdown.set(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    this.timer = setInterval(tick, 1000);
  }

  resync(): void {
    const r = this.retencion();
    if (r) this.startCountdown(r.expiresAt);
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

  formatFecha(f: string): string {
    const d = new Date(f + 'T12:00:00');
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(d);
  }

  formatHora(iso: string): string {
    return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  }
}
