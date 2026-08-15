import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { Precios, TicketView } from '../models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  constructor(private readonly api: ApiService) {}

  precios(): Promise<Precios> {
    return this.api.get<Precios>('/tickets/precios');
  }

  comprar(fechaVisita: string, items: Array<{ tipo: 'adulto' | 'nino'; cantidad: number }>): Promise<{
    ticket: TicketView;
    qrSvg: string;
    total: number;
  }> {
    return this.api.post('/tickets', { fechaVisita, items });
  }

  misTickets(): Promise<TicketView[]> {
    return this.api.get<TicketView[]>('/tickets/mis-tickets');
  }

  get(id: number | string): Promise<{ ticket: TicketView; qrSvg: string }> {
    return this.api.get(`/tickets/${id}`);
  }
}
