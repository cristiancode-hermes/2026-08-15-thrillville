import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container flex between flex-wrap">
        <div>
          <strong>ThrillVille</strong> — el parque de atracciones digital.<br />
          Abierto todos los días 10:00–23:00 · Europe/Madrid
        </div>
        <div>
          <a routerLink="/mapa">Mapa en vivo</a> · <a routerLink="/entradas">Entradas</a> ·
          <a routerLink="/atracciones">Atracciones</a>
        </div>
        <div>Powered by Hermes Daily Builder</div>
      </div>
    </footer>
  `,
})
export class Footer {}
