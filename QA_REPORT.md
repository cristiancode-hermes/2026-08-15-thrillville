# QA Report — 2026-08-15 ThrillVille

**Project:** Parque de atracciones digital — esperas en vivo modeladas en servidor, entradas con IVA server-side, FastPass transaccional (retención 15 min, sweeper, 409 doble venta, QR) y gamificación con puntos derivados de check-ins reales.
**Stack:** Angular 22 (standalone + signals, zoneless) + NestJS 11 + TypeORM 1.x + better-sqlite3
**Author:** Hermes Daily Builder (recuperado por qa-tester tras crash del builder a mitad de generación)

## ✅ 1. Build Verification

| Target | Status | Details |
|---|---|---|
| API `tsc -p tsconfig.json` | ✅ PASS | 0 errores; `dist/main.js` emitido |
| API boot | ✅ PASS | Seed idempotente: 2 usuarios, 6 atracciones, 4 tickets, 2 fastpass, 8 insignias |
| Web `ng build` | ✅ PASS | `dist/web/browser` (CSS pipeline build-css.cjs) |
| Puertos | ✅ PASS | API en :3064 (libre, ausente del Caddyfile); Swagger `/api/docs-json` 200 |

## ✅ 2. Test Results

**30 test cases · 30 assertions — ALL PASSED**

| Test Suite | Test Case | Assertions |
|---|---|---|
| auth.service.spec | 5 (register hash+token, login username, login email, duplicado 409, password errónea 401) | 5 |
| tickets.service.spec | 5 (precios, compra 1+1 con IVA, compra sin items→1 adulto, misTickets, 404) | 5 |
| fastpass.service.spec | 11 (slots, reservar ok + ocupados++, 409 slot lleno, 400 cerrada, confirmar ok, confirmar expirado 410 + libera slot, cancelar libera, usar→used+checkin+puntos, sweeper expireStale, misReservas, 404 ajeno) | 11 |
| gamification.service.spec | 4 (puntos derivados Σ, niveles, insignias nuevas, sin repetición) | 4 |
| wait.service.spec | 5 (cola modelada, espera por duración, cerrada, saturada, lista) | 5 |

## ✅ 3. Endpoint / Runtime Verification (reglas A–F)

| Regla | Verificación | Resultado |
|---|---|---|
| A. Transacción NO termina en ticket | FastPass: pending → confirmed → used en backend; comprobante QR SVG + email simulado | ✅ |
| B. Expiración en SERVIDOR | `expiresAt = now + 15 min` en FastPassService; frontend solo resync (visibilitychange/focus) | ✅ |
| C. Liberación automática | Sweeper cada 30 s → `expireStale`; verificado en instancia desplegada (FP pending del seed → **Expirada** automáticamente) | ✅ |
| D. Doble venta | Mutex + chequeo ocupados + **409** con slots alternativos (24/24 ocupados → 25ª reserva 409) | ✅ |
| E. Comprobante fuera de web | QR SVG descargable (ticket + fastpass) | ✅ |
| F. Contadores consistentes | Puntos = Σ check-ins × puntosPorVisita = 340 (verificado API); slot.ocupados = COUNT(reservas activas); KPI visitantes 10 = Σ barras del gráfico | ✅ |
| Espera lista ↔ detalle | Lista/mapa/detalle usan el MISMO `WaitService` → Vortex 3 min en los 3 | ✅ |

## ✅ 4. Quality Audit (reglas Cristian)

| Criterio | Verdict | Notas |
|---|---|---|
| Rutas dinámicas (`/atracciones/:id`) | ✅ | 12 rutas × 2 viewports (390/1280) con Puppeteer: 24/24 sin blank ni "Error inesperado" |
| Sin overflow horizontal ni errores console | ✅ | 24/24 PASS (scrollWidth == innerWidth; 0 console/page errors) |
| Gráficos reales | ✅ | Ocupación (línea SVG, ejes X/Y, labels cada 3 h, tooltips `<title>`) y Ventas 7 días (barras + tooltips + fechas Europe/Madrid) |
| Contraste AA | ✅ | Dark y light; en light los enlaces usan neon-600 (#c72d6c ≈ 4.9:1 sobre cream) |
| Capa de valor única | ✅ | **Predicción de espera real** (cola modelada en servidor) + ciclo transaccional FastPass completo |
| Puntos derivados, nunca base arbitraria | ✅ | 340 pts = Σ check-ins; badge "maratoniano" exige 5 check-ins/día |

### Minor Issues
| Issue | Severity | Suggestion |
|---|---|---|
| La tarjeta de Casa del Terror muestra "6 min" junto al badge CERRADA (es el modelo, no un bug) | info | Opcional: mostrar "—" cuando estado = cerrada |
| FastPass: el slot grid no se refresca tras reservar/confirmar (server correcto; añadido `loadSlots()` en reservar/confirmar/cancelar en el último build) | minor | Resuelto en build final |

## ✅ 5. Security Scan

| Check | Result |
|---|---|
| `passwordHash` excluido de la serialización (@Exclude) | ✅ |
| `***` en fuentes (interceptor malformado) | ✅ 0 matches |
| Token key backend↔frontend (`token` / localStorage `token`) | ✅ |
| Guards: público / auth / admin (403 visitor→admin) | ✅ |
| Credenciales demo debajo del login (sin autocompletar) | ✅ |

## ✅ 6. Deployment

| Target | Result | Details |
|---|---|---|
| API | ✅ | :3064, registrado en manage-apis.sh (index 49), status ✅ HTTP 200 |
| Caddy | ✅ | `thrillville.proyectos.cristiancode.dev` → dist + proxy /api* → :3064 (200; login + precios + SPA routes OK) |
| Landing | ✅ | proyectos.cristiancode.dev: JS OK, push, live grep=1 |
| Excel | ✅ | Row 80 (proyectos_completo.xlsx) |
| GitHub | ✅ | cristiancode-hermes/2026-08-15-thrillville (README 200) |
| Portafolio | ✅ | es/en/pt (id heading-185, unique ×3); detail 200 ×3 locales; assets 200; full list data-search=1; md5 live==dist |
| Captura | ✅ | thrillville.png (136 KB) + -m.png (82 KB) — sesión restaurada (navbar logueada), verificadas visualmente |
| Links | ✅ | href 200 · link2 200 · link3 200 |

## Summary

**OVERALL: PASS ✅**

- API recuperada al 100% tras crash del builder (main.ts, app.module, seed, admin controller/module, .env) + fix `$gte` → `MoreThanOrEqual` en WaitService.
- Web completa desde specs (16 páginas/rutas, 7 servicios, 3 guards, interceptor, design system "Feria Nocturna").
- 30/30 tests Jest · 24/24 checks responsive · ciclo transaccional A–F verificado en API y navegador.
- Desplegado y verificado en producción (subdominio, landing, Excel, GitHub, portafolio 3 idiomas, capturas).
