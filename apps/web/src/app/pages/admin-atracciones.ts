import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';
import { AttractionService } from '../services/attractions.service';
import type { Attraction } from '../models';
import { errorMsg, zonaNombre } from '../utils';

@Component({
  selector: 'app-admin-atracciones',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (okMsg()) {
      <div class="alert alert-success">{{ okMsg() }}</div>
    }

    <div class="grid-auto" style="align-items:start">
      <div class="card">
        <h3 class="card-title">{{ editingId() ? 'Editar atracción' : 'Nueva atracción' }}</h3>
        <form (ngSubmit)="save()" style="display:flex;flex-direction:column;gap:0.7rem">
          <div>
            <label class="label" for="f-name">Nombre</label>
            <input id="f-name" class="input" name="name" [(ngModel)]="form.name" required />
          </div>
          <div class="flex" style="gap:0.7rem;flex-wrap:wrap">
            <div style="flex:1;min-width:140px">
              <label class="label" for="f-zona">Zona</label>
              <select id="f-zona" class="input" name="zona" [(ngModel)]="form.zona">
                <option value="norte">Zona Norte</option>
                <option value="plaza">Plaza Central</option>
                <option value="aventura">Zona Aventura</option>
              </select>
            </div>
            <div style="flex:1;min-width:140px">
              <label class="label" for="f-tipo">Tipo</label>
              <input id="f-tipo" class="input" name="tipo" [(ngModel)]="form.tipo" required />
            </div>
          </div>
          <div class="flex" style="gap:0.7rem;flex-wrap:wrap">
            <div style="flex:1;min-width:100px">
              <label class="label" for="f-int">Intensidad (1–5)</label>
              <input id="f-int" class="input" type="number" min="1" max="5" name="intensidad" [(ngModel)]="form.intensidad" />
            </div>
            <div style="flex:1;min-width:100px">
              <label class="label" for="f-edad">Edad mín.</label>
              <input id="f-edad" class="input" type="number" min="0" name="edadMin" [(ngModel)]="form.edadMin" />
            </div>
            <div style="flex:1;min-width:100px">
              <label class="label" for="f-altura">Altura (cm)</label>
              <input id="f-altura" class="input" type="number" min="0" name="alturaMinCm" [(ngModel)]="form.alturaMinCm" />
            </div>
          </div>
          <div class="flex" style="gap:0.7rem;flex-wrap:wrap">
            <div style="flex:1;min-width:100px">
              <label class="label" for="f-cap">Cap. ciclo</label>
              <input id="f-cap" class="input" type="number" min="1" name="capacidadCiclo" [(ngModel)]="form.capacidadCiclo" />
            </div>
            <div style="flex:1;min-width:100px">
              <label class="label" for="f-dur">Dur. ciclo (min)</label>
              <input id="f-dur" class="input" type="number" min="1" name="duracionCicloMin" [(ngModel)]="form.duracionCicloMin" />
            </div>
            <div style="flex:1;min-width:100px">
              <label class="label" for="f-pts">Puntos/visita</label>
              <input id="f-pts" class="input" type="number" min="0" name="puntosPorVisita" [(ngModel)]="form.puntosPorVisita" />
            </div>
          </div>
          <div class="flex" style="gap:0.7rem">
            <div style="flex:1">
              <label class="label" for="f-posx">Mapa X (0–100)</label>
              <input id="f-posx" class="input" type="number" min="0" max="100" name="posX" [(ngModel)]="form.posX" />
            </div>
            <div style="flex:1">
              <label class="label" for="f-posy">Mapa Y (0–100)</label>
              <input id="f-posy" class="input" type="number" min="0" max="100" name="posY" [(ngModel)]="form.posY" />
            </div>
          </div>
          <div>
            <label class="label" for="f-desc">Descripción</label>
            <textarea id="f-desc" class="input" rows="2" name="descripcion" [(ngModel)]="form.descripcion"></textarea>
          </div>
          <div class="flex">
            <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button>
            @if (editingId()) {
              <button type="button" class="btn btn-ghost" (click)="resetForm()">Cancelar edición</button>
            }
          </div>
        </form>
      </div>

      <div class="card">
        <h3 class="card-title">Atracciones ({{ attractions().length }})</h3>
        <div style="overflow-x:auto">
          <table class="table">
            <thead>
              <tr><th>Nombre</th><th>Zona</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              @for (a of attractions(); track a.id) {
                <tr>
                  <td><strong>{{ a.name }}</strong><br /><span class="text-muted" style="font-size:12px">{{ a.tipo }}</span></td>
                  <td>{{ zonaNombre(a.zona) }}</td>
                  <td>
                    <span class="badge" [class]="estadoBadge(a.estado)">{{ estadoLabel(a.estado) }}</span>
                  </td>
                  <td>
                    <div class="flex" style="gap:0.35rem;flex-wrap:wrap">
                      <button class="btn btn-ghost btn-sm" (click)="toggleEstado(a)">{{ a.estado === 'cerrada' ? 'Abrir' : 'Cerrar' }}</button>
                      <button class="btn btn-ghost btn-sm" (click)="edit(a)">Editar</button>
                      <button class="btn btn-danger btn-sm" (click)="remove(a.id)">Eliminar</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class AdminAtraccionesPage implements OnInit {
  readonly errorMsg = errorMsg;
  readonly zonaNombre = zonaNombre;
  readonly attractions = signal<Attraction[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly okMsg = signal('');
  readonly form = {
    name: '',
    zona: 'norte' as Attraction['zona'],
    tipo: '',
    intensidad: 3,
    edadMin: 0,
    alturaMinCm: 0,
    capacidadCiclo: 20,
    duracionCicloMin: 3,
    puntosPorVisita: 20,
    posX: 50,
    posY: 50,
    descripcion: '',
  };

  constructor(
    private readonly admin: AdminService,
    private readonly attractionsService: AttractionService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set('');
    try {
      this.attractions.set(await this.attractionsService.list());
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  edit(a: Attraction): void {
    this.editingId.set(a.id);
    this.form.name = a.name;
    this.form.zona = a.zona;
    this.form.tipo = a.tipo;
    this.form.intensidad = a.intensidad;
    this.form.edadMin = a.edadMin;
    this.form.alturaMinCm = a.alturaMinCm;
    this.form.capacidadCiclo = a.capacidadCiclo;
    this.form.duracionCicloMin = a.duracionCicloMin;
    this.form.puntosPorVisita = a.puntosPorVisita;
    this.form.posX = a.posX;
    this.form.posY = a.posY;
    this.form.descripcion = a.descripcion;
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.name = '';
    this.form.tipo = '';
    this.form.descripcion = '';
    this.form.zona = 'norte';
  }

  async save(): Promise<void> {
    if (!this.form.name || !this.form.tipo) return;
    this.saving.set(true);
    this.error.set('');
    this.okMsg.set('');
    try {
      const dto = { ...this.form };
      if (this.editingId()) {
        await this.admin.actualizarAtraccion(this.editingId()!, dto);
        this.okMsg.set('Atracción actualizada.');
      } else {
        await this.admin.crearAtraccion(dto);
        this.okMsg.set('Atracción creada.');
      }
      this.resetForm();
      await this.load();
    } catch (e) {
      this.error.set(errorMsg(e));
    } finally {
      this.saving.set(false);
    }
  }

  async toggleEstado(a: Attraction): Promise<void> {
    this.error.set('');
    this.okMsg.set('');
    try {
      const nuevo = a.estado === 'cerrada' ? 'operativa' : 'cerrada';
      await this.admin.cambiarEstado(a.id, nuevo);
      this.okMsg.set(nuevo === 'cerrada' ? `"${a.name}" cerrada (se cancelan los FastPass futuros).` : `"${a.name}" abierta.`);
      await this.load();
    } catch (e) {
      this.error.set(errorMsg(e));
    }
  }

  async remove(id: string): Promise<void> {
    if (!confirm('¿Eliminar esta atracción?')) return;
    this.error.set('');
    try {
      await this.admin.eliminarAtraccion(id);
      this.okMsg.set('Atracción eliminada.');
      await this.load();
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
