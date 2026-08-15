# ThrillVille 🎢

**El parque de atracciones digital.** Mapa con tiempos de espera en vivo, compra de entradas con IVA calculado en el servidor, FastPass con retención transaccional de 15 minutos y gamificación con insignias.

Proyecto diario del Daily Builder — 2026-08-15. Stack: **Angular 22** (standalone + signals, zoneless) + **NestJS 11** + TypeORM + better-sqlite3 (dev) / Neon PostgreSQL (prod).

## Demo

- Web: https://thrillville.proyectos.cristiancode.dev
- API (Swagger): https://thrillville.proyectos.cristiancode.dev/api/docs
- Usuario demo: `demo` / `demo1234` · Admin: `admin` / `admin1234`

## Funcionalidades

| Área | Qué hace |
|------|----------|
| **Mapa en vivo** | 6 atracciones en grid posicional con espera modelada en servidor (cola = check-ins recientes × factor, ciclos = cola/capacidad × duración). Lista, mapa y detalle usan la MISMA fuente → totales consistentes. |
| **Entradas** | Fecha + tipos adulto/niño (1–6), precios y IVA 21% calculados SIEMPRE en el servidor, QR SVG descargable como comprobante. |
| **FastPass (ciclo transaccional)** | Retención de slot con `expiresAt` calculado en servidor (now + 15 min), mutex + chequeo de ocupados + **409** si el slot se llena (doble venta), sweeper cada 30 s que expira pendientes vencidos y libera el slot, QR descargable + email simulado. |
| **Gamificación** | Puntos SIEMPRE derivados de check-ins reales (Σ check-ins × puntosPorVisita, nunca columna arbitraria), 8 insignias con criterios JSONB, niveles de Explorador. |
| **Admin** | KPIs del día, ocupación por hora (gráfico SVG con ejes y tooltips), ventas 7 días, CRUD de atracciones + toggle operativa/cerrada. |

## Arranque local

```bash
npm install

# API (puerto 3064, seed automático con SEED_DB=true)
cd apps/api
npm run build
PORT=3064 SEED_DB=true DATABASE_PATH=data/thrillville.db JWT_SECRET=dev-secret node dist/main.js

# Web (build + servir con proxy /api)
cd apps/web
npm run build
node ../../scripts/serve-proxy.cjs   # sirve dist en :8080 y proxya /api a la API local
```

## Tests

```bash
cd apps/api && npm test   # 30 tests: auth, tickets, fastpass (ciclo transaccional), gamificación, esperas
```

## API

Documentación completa de rutas en [docs/API.md](docs/API.md). Swagger en `/api/docs`.
