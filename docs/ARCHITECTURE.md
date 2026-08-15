# ThrillVille — Arquitectura

## Visión general

```
Browser (Angular 22 SPA)
   │  /api/* (Caddy reverse proxy)
   ▼
NestJS 11 API (puerto 3064)
   │  TypeORM 1.x
   ▼
better-sqlite3 (dev) / Neon PostgreSQL (prod)
```

## Módulos de la API

| Módulo | Responsabilidad |
|--------|-----------------|
| `auth` | JWT + Passport, bcryptjs, login por usuario o email, guards `JwtAuthGuard` / `AdminGuard` |
| `attractions` | Catálogo con filtros + `WaitService` (modelo de cola, fuente única de esperas) |
| `tickets` | Compra con precios e IVA 21% calculados en servidor, QR SVG determinista |
| `fastpass` | **Ciclo transaccional**: retención 15 min (`expiresAt` server), mutex, 409 doble venta, sweeper 30 s, máquina de estados pending→confirmed→used |
| `gamification` | Puntos derivados (Σ check-ins × pts), insignias con criterios JSONB, niveles |
| `admin` | KPIs, ocupación por hora, ventas 7 días (gráficos con ejes/tooltips) |
| `seed` | Seed idempotente: demo/admin, 6 atracciones, 10 check-ins, 4 tickets, 2 FastPass, 8 insignias |

## Entidades (8)

`User`, `Attraction`, `CheckIn`, `Ticket`, `FastPassReservation`, `Badge`, `UserBadge`, `Slot`.

## Reglas de consistencia (contrato del proyecto)

1. **Espera en vivo**: `GET /atracciones/:id/wait` es la fuente única; lista, mapa y detalle renderizan el mismo objeto.
2. **Puntos derivados**: `puntos = COUNT(checkins) × puntosPorVisita` — sin columna de puntos.
3. **Slot.ocupados**: contador transaccional incrementado/decrementado bajo mutex; consistente con `COUNT(reservas activas)`.
4. **Retención**: `expiresAt = now + 15 min` calculado EN SERVIDOR; el sweeper libera los vencidos sin esperar requests.
5. **Doble venta**: mutex (proceso) + chequeo `ocupados >= capacidad` → 409 con slots alternativos.
6. **TZ**: Europe/Madrid en servidor (`common/time.ts`); el frontend formatea con `Intl`, nunca hora local.

## Seguridad

- `@Exclude()` en `passwordHash` (class-transformer) — nunca se serializa.
- Guards por endpoint: público / auth / admin.
- Validación `class-validator` con `whitelist` en el ValidationPipe global.
