import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="notfound">
      <h1>404</h1>
      <h2 style="font-size:22px">Esta atracción no existe en el mapa</h2>
      <p class="text-muted">La página que buscas no está en el parque. Vuelve a la entrada principal.</p>
      <a routerLink="/" class="btn btn-primary mt-2">Ir al inicio</a>
    </section>
  `,
})
export class NotFoundPage {}
