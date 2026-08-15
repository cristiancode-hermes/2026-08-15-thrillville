# ThrillVille — Frontend

Angular 22 standalone + signals, **zoneless** (`provideZonelessChangeDetection`), Tailwind-free (CSS puro con variables del design system "Feria Nocturna": night/neon/amber/mint).

## Rutas (lazy)

| Ruta | Página | Guard |
|------|--------|-------|
| `/` | Home: hero + esperas en vivo + zonas | — |
| `/mapa` | Mapa con pins posicionales y popover de espera | — |
| `/atracciones` | Lista con filtros (zona, intensidad, búsqueda) | — |
| `/atracciones/:id` | Detalle con espera + CTA FastPass | — |
| `/entradas` | Compra (fecha, tipos 1–6, resumen con IVA server) | checkout: auth |
| `/entradas/:id` | QR del ticket (descargable SVG) | auth |
| `/fastpass` | Reserva por franjas + retención con cuenta atrás + mis reservas | auth |
| `/fastpass/:id` | QR del FastPass | auth |
| `/mis-visitas` | Nivel, entradas, FastPass, insignias, historial | auth |
| `/login` · `/registro` | Auth con panel lateral de marca + credenciales demo debajo | publicOnly |
| `/admin/*` | Ocupación (KPIs + gráfico), Atracciones (CRUD), Ventas (7 días) | admin |

## Servicios

`ApiService` (base `/api` relativa para Caddy), `AuthService` (token en `localStorage['token']`, restaura sesión ANTES de que los guards decidan vía `auth.ready`), `AttractionService`, `TicketService`, `FastPassService`, `BadgeService`, `AdminService`.

## Decisiones clave

- **Interceptor funcional**: lee `localStorage['token']` y añade `Authorization: Bearer <token>`; en 401 limpia sesión y redirige a `/login`.
- **Guards async**: esperan `auth.ready` (restauración de sesión) para no expulsar usuarios con token válido en recarga.
- **Cuenta atrás de retención**: se calcula desde `expiresAt` del servidor con `Date.now()`, con resync en `visibilitychange`/`focus` (el `setInterval` se congela en pestañas inactivas).
- **Gráficos admin**: SVG inline con ejes, etiquetas cada N horas y tooltips (`<title>`).
- **Formateo de fechas**: siempre `Intl` con `timeZone: 'Europe/Madrid'`.
- **Errores**: cada página tiene señal `error` → banner + retry; el 409 de FastPass muestra mensaje específico.
