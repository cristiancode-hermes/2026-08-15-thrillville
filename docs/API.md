# ThrillVille API

Base: `http://localhost:3064/api` (prefijo `/api` en producción vía Caddy). Swagger en `/api/docs`.

Todas las rutas autenticadas requieren `Authorization: Bearer <token>`.

## Autenticación

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/auth/register` | `{ username, email, password }` | Registro (login automático) → `{ token, user }` |
| POST | `/auth/login` | `{ identifier, password }` | Login por **usuario O email** → `{ token, user }` |
| GET | `/auth/me` | — | Perfil del token (auth) → `{ user }` |

## Atracciones (público)

| Método | Ruta | Query | Descripción |
|---|---|---|---|
| GET | `/atracciones` | `zona`, `intensidad`, `edadMin`, `q` | Lista con filtros y espera en vivo |
| GET | `/atracciones/:id` | — | Detalle + espera (misma fuente que lista/mapa) |
| GET | `/atracciones/:id/wait` | — | **Espera en vivo (fuente única)** `{ waitMinutes, estado, cola, actualizadoEn }` |
| GET | `/zonas` | — | Zonas con recuento |

## Entradas

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| GET | `/tickets/precios` | — | Precios actuales (server) `{ adulto, nino, iva }` |
| POST | `/tickets` | `{ fechaVisita, items: [{tipo, cantidad}] }` | Compra: subtotal + IVA 21% calculados en servidor → `{ ticket, qrSvg, total }` |
| GET | `/tickets/mis-tickets` | — | Mis tickets |
| GET | `/tickets/:id` | — | QR del ticket (solo propietario) |

## FastPass (transaccional)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/fastpass/slots?atraccionId=&fecha=` | Franjas 10:00–22:30 con `ocupados/capacidad/estado` |
| POST | `/fastpass` | `{ atraccionId, fecha, horaInicio }` → retención 15 min con `expiresAt` EN SERVIDOR; **409** si el slot está lleno (doble venta) |
| POST | `/fastpass/:id/confirmar` | pending → confirmed + `qrSvg`; **410** si expiró |
| POST | `/fastpass/:id/cancelar` | Libera el slot (pending) |
| POST | `/fastpass/:id/usar` | confirmed → used + check-in + puntos + insignias |
| POST | `/fastpass/check-in` | Check-in walkup (sin FastPass) |
| GET | `/fastpass/mis-reservas` | Mis reservas con etiqueta de estado |
| GET | `/fastpass/:id` | QR del FastPass (solo propietario) |

Estados: `pending` (Reservada) → `confirmed` (Confirmada) → `used` (Usada) · `pending` → `expired`/`cancelled`. El **sweeper** (cada 30 s) expira pendientes vencidos y libera su slot automáticamente.

## Gamificación

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/insignias` | Catálogo con criterios JSONB |
| GET | `/me/puntos` | Puntos **derivados** (Σ check-ins × puntosPorVisita), nivel y desglose |
| GET | `/me/insignias` | Insignias ganadas |
| GET | `/me/check-ins` | Historial con atracción y puntos |

## Admin (rol admin)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/kpis` | Visitantes hoy, espera media, FastPass hoy, ingresos hoy |
| GET | `/admin/ocupacion` | Ocupación por hora (00:00–23:00, Europe/Madrid) |
| GET | `/admin/ventas?dias=7` | Ingresos y tickets por día |
| POST/PATCH/DELETE | `/admin/atracciones[/:id]` | CRUD (DELETE solo sin reservas activas) |
| PATCH | `/admin/atracciones/:id/estado` | Operativa/Saturada/Cerrada (al cerrar cancela confirmed futuros) |

## Códigos de error

- `400` validación / atracción cerrada
- `401` sin token o credenciales inválidas
- `403` sin rol admin
- `404` recurso inexistente o de otro usuario
- `409` slot lleno (doble venta), email/usuario duplicado
- `410` retención expirada

## Decisiones de consistencia

- **Espera**: lista, mapa y detalle llaman al mismo `WaitService` → mismos números.
- **Puntos**: derivados de check-ins reales, nunca columna arbitraria (regla F).
- **`slot.ocupados`**: contador transaccional (mutex de proceso en SQLite / `FOR UPDATE` en Postgres), consistente con `COUNT(reservas activas)`.
- **TZ**: siempre Europe/Madrid en servidor; el frontend formatea con `Intl`, nunca hora local.
- **Retención**: `expiresAt` del servidor; el frontend resincroniza con `visibilitychange`/`focus`.
