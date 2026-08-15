import { Component, input } from '@angular/core';
import { waitTone } from '../utils';

@Component({
  selector: 'app-wait-badge',
  standalone: true,
  template: `
    @if (wait() !== null) {
      <span class="wait-chip">
        <span class="wait-num">{{ wait()?.waitMinutes }}<small> min</small></span>
        <span class="badge" [class]="'badge-' + tone()">
          {{ wait()?.estado === 'cerrada' ? 'Cerrada' : wait()?.estado === 'saturada' ? 'Saturada' : 'Espera' }}
        </span>
      </span>
    } @else {
      <span class="badge badge-neutral">Sin datos</span>
    }
  `,
})
export class WaitBadge {
  readonly wait = input<{ waitMinutes: number; estado: string } | null>(null);

  tone(): string {
    const w = this.wait();
    if (!w) return 'neutral';
    if (w.estado === 'cerrada') return 'danger';
    return waitTone(w.waitMinutes);
  }
}
