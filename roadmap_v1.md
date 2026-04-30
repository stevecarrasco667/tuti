# 🗺️ Roadmap de Producción — Tuti Games
## Basado en Auditoría Directa del Código Fuente | v0.5.0 → v1.0

> [!IMPORTANT]
> Este roadmap está basado en hallazgos **reales del código fuente**, no en documentación genérica. Cada tarea tiene un archivo de referencia y una justificación técnica concreta.

---

## Resumen Ejecutivo

| Sprint | Nombre | Foco | Estado |
|--------|--------|------|--------|
| **S1** | Escudo de Producción | Seguridad crítica pre-launch | 🔴 Pendiente |
| **S2** | Higiene de Código | Deuda técnica y tipado | 🟡 Pendiente |
| **S3** | Observabilidad | Monitoreo y alertas | 🟡 Pendiente |
| **S4** | Escalabilidad del Lobby | Resistencia a carga viral | 🟢 Pendiente |
| **S5** | UX & i18n Final | Pulido de experiencia | 🟢 Pendiente |
| **S6** | Testing E2E | Cobertura de flujo completo | 🟢 Pendiente |
| **v1.1** | Nuevas Funciones | Features post-lanzamiento | 🔵 Futuro |

---

## 🔴 Sprint 1: Escudo de Producción
**Objetivo:** Cerrar vulnerabilidades reales antes del go-live público.
**Duración estimada:** 1 semana

---

### S1-T1 — Eliminar `console.log` de producción
- **Archivo:** `src/composables/useSocket.ts` (líneas 53, 89, 105, 111, 134, 142, 156)
- **Severidad:** 🔴 Alta
- **Problema:** Múltiples `console.log` con información de conexión (`roomId`, `host`, estado de red) se emiten en producción. Cualquier usuario puede ver en DevTools el host del servidor, el roomId y el estado del socket.
- **Solución:** Reemplazar por un logger condicional de DEV:
```typescript
// Crear src/utils/logger.ts
const isDev = import.meta.env.DEV;
export const devLog = (...args: any[]) => isDev && console.log(...args);
```
- **Esfuerzo:** 1h
- **Criterio de aceptación:** Build de producción sin `console.log` visibles en DevTools del usuario.

---

### S1-T2 — Validación del header `Origin` en WebSocket
- **Archivo:** `party/handlers/connection.ts` → `handleConnect()`
- **Severidad:** 🔴 Alta
- **Problema:** No hay validación explícita del header `Origin` en `onConnect`. Un atacante desde otro dominio podría abrir una conexión WebSocket al server de Tuti y enviar mensajes válidos (Cross-Site WebSocket Hijacking).
- **Solución:**
```typescript
// En handleConnect(), antes de joinPlayer()
const origin = ctx.request.headers.get('Origin');
const ALLOWED_ORIGINS = [
    'https://tutigame.com',
    'https://www.tutigame.com',
    ...(this.room.env.ALLOWED_ORIGINS as string || '').split(',')
];
if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    logger.warn('ORIGIN_REJECTED', { origin, roomId: this.room.id });
    connection.close(4403, 'FORBIDDEN_ORIGIN');
    return;
}
```
- **Esfuerzo:** 2h
- **Criterio de aceptación:** Conexión WebSocket desde dominio no autorizado es rechazada con código 4403.

---

### S1-T3 — Autenticación del endpoint `/heartbeat` del Lobby
- **Archivo:** `party/lobby.ts` → `onRequest()`
- **Severidad:** 🔴 Alta
- **Problema:** Cualquier actor externo puede enviar un POST a `/heartbeat` con un `RoomSnapshot` falso, inyectando salas fantasmas en el Server Browser visible para todos los jugadores.
- **Solución:** Agregar un secret compartido en el header de la petición:
```typescript
// En lobby.ts onRequest()
const roomSecret = req.headers.get('X-Room-Secret');
const expectedSecret = this.room.env.LOBBY_SECRET as string;
if (!expectedSecret || roomSecret !== expectedSecret) {
    logger.warn('UNAUTHORIZED_HEARTBEAT', {});
    return new Response('Unauthorized', { status: 401 });
}
```
- **Esfuerzo:** 2h
- **Criterio de aceptación:** POST sin header correcto recibe 401. El server.ts envía el header en cada heartbeat.

---

### S1-T4 — Validación de variables de entorno al arranque
- **Archivo:** `party/server.ts` → `constructor()` / `onStart()`
- **Severidad:** 🟡 Media
- **Problema:** Si `SUPABASE_URL` o `SUPABASE_ANON_KEY` no están configuradas en el deploy de PartyKit, el servidor arranca normalmente pero todos los usuarios serán `isAuthenticated: false` sin ningún warning. Esto pasa silenciosamente.
- **Solución:**
```typescript
// En onStart()
const supabaseUrl = this.room.env.SUPABASE_URL as string;
const supabaseKey = this.room.env.SUPABASE_ANON_KEY as string;
if (!supabaseUrl || !supabaseKey) {
    logger.error('MISSING_ENV_VARS', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
    }, new Error('Critical env vars missing'));
    // No detener el server — pero loguear prominentemente
}
```
- **Esfuerzo:** 1h
- **Criterio de aceptación:** Log de error prominente al arrancar con variables faltantes.

---

### S1-T5 — Headers CORS en LobbyServer
- **Archivo:** `party/lobby.ts` → `onRequest()`
- **Severidad:** 🟡 Media
- **Problema:** Sin headers CORS explícitos, el endpoint `/heartbeat` puede fallar si el frontend está en un subdominio diferente o en un CDN distinto al del servidor.
- **Solución:** Agregar headers CORS en la respuesta:
```typescript
const corsHeaders = {
    'Access-Control-Allow-Origin': this.room.env.FRONTEND_URL as string || '*',
    'Access-Control-Allow-Methods': 'POST',
};
return new Response('OK', { status: 200, headers: corsHeaders });
```
- **Esfuerzo:** 1h
- **Criterio de aceptación:** Peticiones cross-origin al lobby no son bloqueadas por el navegador.

---

**Total Sprint 1:** ~7 horas de desarrollo

---

## 🟡 Sprint 2: Higiene de Código y Deuda Técnica
**Objetivo:** Eliminar deuda técnica que dificulta el mantenimiento y añade riesgo de bugs ocultos.
**Duración estimada:** 1 semana

---

### S2-T1 — Tipar correctamente los payloads en handlers (eliminar `as any`)
- **Archivos:** `party/server.ts` (líneas 525, 534, 548, 558, 585), todos los `handlers/*.ts`
- **Severidad:** 🟡 Media
- **Problema:** Después de validar los mensajes con Zod, los payloads se re-castean a `as any` antes de enviarse a los handlers, anulando el valor del schema validation.
```typescript
// ❌ Actual
await this.gameHandler.handleStopRound(payload as any, sender);
// ✅ Correcto
const stopPayload = (messageContext as z.infer<typeof StopRoundSchema>).payload;
await this.gameHandler.handleStopRound(stopPayload, sender);
```
- **Esfuerzo:** 4h
- **Criterio de aceptación:** `npm run typecheck` pasa sin usar `as any` en el dispatch de mensajes.

---

### S2-T2 — Eliminar texto hardcodeado residual en el servidor
- **Archivos:** `party/handlers/player.ts`, `party/utils/broadcaster.ts`
- **Severidad:** 🟡 Media
- **Problema:** `sendError(connection, 'Solo el anfitrión puede expulsar jugadores.')` (detectado en tests de seguridad, línea 158) tiene texto en español hardcodeado en el servidor. El servidor debería enviar códigos de error, no texto.
- **Solución:** Crear un enum `ErrorCodes` y que el cliente traduzca el código:
```typescript
// shared/consts.ts
export const ERROR_CODES = {
    NOT_HOST: 'NOT_HOST',
    GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
    // ...
} as const;
```
- **Esfuerzo:** 3h
- **Criterio de aceptación:** Ningún string en español en archivos del directorio `party/`.

---

### S2-T3 — Mover scripts de mantenimiento a `/scripts`
- **Archivos:** `update_locales.ts`, `update_locales_v4.ts`, `update_locales_v5.ts`, `dump_categories.ts` (raíz del proyecto)
- **Severidad:** 🟢 Baja
- **Problema:** Scripts de mantenimiento en la raíz del proyecto ensucian la estructura y pueden confundirse con archivos de configuración del proyecto.
- **Solución:** Mover a `scripts/` y actualizar `.gitignore` si contienen datos sensibles.
- **Esfuerzo:** 30min
- **Criterio de aceptación:** Raíz del proyecto limpia. Scripts ejecutables desde `npm run scripts:update-locales`.

---

### S2-T4 — Auto-sincronizar `APP_VERSION` desde `package.json`
- **Archivo:** `shared/consts.ts` (línea 60), `vite.config.ts`
- **Severidad:** 🟢 Baja
- **Problema:** `APP_VERSION = 'v0.5.0'` está hardcodeada. Al publicar una nueva versión del `package.json`, hay que recordar actualizarla manualmente o el cliente/servidor reportarán versiones desfasadas.
- **Solución:** Inyectar desde Vite:
```typescript
// vite.config.ts
import { version } from './package.json';
define: { __APP_VERSION__: JSON.stringify(version) }
// shared/consts.ts
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' 
    ? `v${__APP_VERSION__}` : 'v0.0.0';
```
- **Esfuerzo:** 1h
- **Criterio de aceptación:** `APP_VERSION` siempre coincide con `package.json.version`.

---

### S2-T5 — Resolver deuda del Hot-Swap `(this as any).engine`
- **Archivo:** `shared/engines/base-engine.ts` (línea 72-74)
- **Severidad:** 🟡 Media
- **Problema:** `updateEngine()` usa `(this as any).engine = newEngine` para hot-swap. Es un anti-patrón que oculta el acoplamiento real entre el servidor y los handlers.
- **Solución:** Cada handler que necesita actualizar su referencia al engine debería tener un método `setEngine(engine: BaseEngine)` explícito (ya existe en varios handlers, pero la implementación base es el fallback sucio).
- **Esfuerzo:** 2h
- **Criterio de aceptación:** Sin castings `(this as any)` en `base-engine.ts`.

---

**Total Sprint 2:** ~10.5 horas de desarrollo

---

## 🟡 Sprint 3: Observabilidad y Monitoreo
**Objetivo:** Tener visibilidad de lo que ocurre en producción. Sin esto, los bugs son invisibles.
**Duración estimada:** 1 semana

---

### S3-T1 — Integrar Sentry para error tracking
- **Archivos:** `src/main.ts` (frontend), `party/server.ts` (backend con Cloudflare Workers SDK)
- **Severidad:** 🟡 Media
- **Problema:** Los errores en producción solo van a los logs de Cloudflare Workers con retención de 7 días (plan gratuito) o consola del navegador. No hay alertas, contexto de usuario, ni stack traces enviados a un sistema centralizado.
- **Solución:** 
  - Frontend: `@sentry/vue` con `trackComponents: true`
  - Backend: `@sentry/cloudflare` con `withSentry()` wrapper
- **Esfuerzo:** 4h
- **Criterio de aceptación:** Errores de JavaScript y de servidor aparecen en dashboard de Sentry con contexto de `roomId` y `userId`.

---

### S3-T2 — Dashboard de métricas del lobby
- **Archivo:** `party/lobby.ts`
- **Severidad:** 🟢 Baja
- **Problema:** No hay forma de saber cuántas salas están activas, cuántos jugadores hay en total, o si el sistema de heartbeat está funcionando correctamente.
- **Solución:** Agregar un endpoint `GET /stats` al lobby que devuelva métricas básicas (protegido por secret):
```typescript
// Devuelve: { totalRooms, joinableRooms, totalPlayers, avgPlayersPerRoom }
```
- **Esfuerzo:** 2h
- **Criterio de aceptación:** Endpoint `/stats` devuelve JSON con métricas en tiempo real.

---

### S3-T3 — Alertas de errores críticos via webhook
- **Archivo:** `shared/utils/logger.ts`
- **Severidad:** 🟢 Baja
- **Problema:** Errores críticos (`ROOM_HYDRATION_FAILED`, `ON_CONNECT_FAILED`) solo se loguean en Cloudflare. No hay notificación proactiva al equipo.
- **Solución:** Agregar un webhook a Discord/Slack para errores de severidad `error`:
```typescript
// En logger.error(), si está en producción
if (level === 'error' && DISCORD_WEBHOOK_URL) {
    fetch(DISCORD_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ content: `🚨 ${code}` }) });
}
```
- **Esfuerzo:** 2h
- **Criterio de aceptación:** Cada `logger.error()` en producción envía un mensaje a Discord/Slack.

---

**Total Sprint 3:** ~8 horas de desarrollo

---

## 🟢 Sprint 4: Escalabilidad del Lobby
**Objetivo:** Preparar el lobby para escenarios virales (+100 salas simultáneas).
**Duración estimada:** 1 semana

---

### S4-T1 — Paginación y TTL agresivo en el lobby
- **Archivo:** `party/lobby.ts`
- **Severidad:** 🟡 Media
- **Problema:** El `setInterval` de TTL reaper y persistencia recorre **todas** las salas del Map cada 10-15s. Con muchas salas esto se convierte en O(N) bloqueante. El snapshot inicial también limita a 50 salas de forma estática.
- **Solución:**
  - Reducir TTL de zombie rooms de 30s a 20s
  - Implementar cursor-based pagination para el snapshot inicial
  - Considerar separar el reaper en un `setInterval` más frecuente (5s) pero con early exit
- **Esfuerzo:** 4h
- **Criterio de aceptación:** Con 200 salas simuladas, el reaper no bloquea el event loop más de 5ms.

---

### S4-T2 — Compresión de mensajes WebSocket
- **Archivo:** `vite.config.ts` / `partykit.json`
- **Severidad:** 🟢 Baja
- **Problema:** Los payloads JSON van sin compresión. En salas con 8 jugadores y rondas largas (modo clásico con 5+ categorías), los patches pueden ser significativos.
- **Solución:** Investigar y habilitar `permessage-deflate` en PartyKit si está disponible, o implementar compresión manual para payloads mayores de 1KB.
- **Esfuerzo:** 2h
- **Criterio de aceptación:** Reducción medible del tamaño de payload en DevTools Network tab.

---

### S4-T3 — Limitar crecimiento de `previousStates` Map
- **Archivo:** `party/server.ts` (línea 75: `private previousStates`)
- **Severidad:** 🟢 Baja
- **Problema:** `previousStates` crece con cada conexión pero solo se limpia en `onClose`. En salas donde jugadores se reconectan repetidamente (cada reconexión es un nuevo `conn.id`), el Map puede acumular entradas huérfanas si `onClose` falla silenciosamente.
- **Solución:** Agregar un purge periódico de entradas cuyo `conn.id` ya no exista en `getConnections()`.
- **Esfuerzo:** 2h
- **Criterio de aceptación:** El Map de `previousStates` nunca supera `maxPlayers * 2` entradas.

---

**Total Sprint 4:** ~8 horas de desarrollo

---

## 🟢 Sprint 5: UX & Internacionalización Final
**Objetivo:** Pulir la experiencia de usuario y cerrar los últimos gaps de i18n.
**Duración estimada:** 3-5 días

---

### S5-T1 — Migrar token de sesión de URL a handshake post-conexión
- **Archivo:** `src/composables/useSocket.ts`, `party/handlers/connection.ts`
- **Severidad:** 🟡 Media
- **Problema:** El `token` de sesión se pasa como query parameter `?token=`. Los URLs con tokens quedan en logs de Cloudflare, CDN, y analytics.
- **Solución:** Conectar sin token y enviar un mensaje `IDENTITY` como primer mensaje del cliente:
```typescript
// Cliente: primer mensaje tras onOpen
ws.send(JSON.stringify({ type: 'IDENTITY', payload: { userId, token, name, avatar } }));
// Servidor: procesar IDENTITY antes de cualquier otro mensaje
```
- **Esfuerzo:** 5h
- **Criterio de aceptación:** Sin parámetro `token` visible en la URL de conexión WebSocket.

---

### S5-T2 — Cerrar gaps residuales de i18n en el servidor
- **Archivo:** `party/handlers/player.ts`, `party/utils/broadcaster.ts`
- **Severidad:** 🟢 Baja
- **Problema:** Strings en español hardcodeados en el servidor (mensajes de error que llegan al cliente).
- **Solución:** Usar `ERROR_CODES` del Sprint S2-T2 de forma consistente en todos los handlers.
- **Esfuerzo:** 2h (dependiente de S2-T2)
- **Criterio de aceptación:** Cliente recibe códigos de error y los traduce con `t('errors.NOT_HOST')`.

---

### S5-T3 — Accesibilidad básica (a11y audit)
- **Archivos:** Componentes de `src/components/`
- **Severidad:** 🟢 Baja
- **Problema:** No se ha realizado un audit de accesibilidad. Botones sin `aria-label`, modales sin `role="dialog"`, foco no atrapado en overlays.
- **Solución:** Audit con `axe-core` o Lighthouse y corrección de los issues de impacto Alto.
- **Esfuerzo:** 6h
- **Criterio de aceptación:** Lighthouse Accessibility score ≥ 85.

---

### S5-T4 — PWA: Página offline y estrategia de caché
- **Archivo:** `vite.config.ts` (VitePWA config)
- **Severidad:** 🟢 Baja
- **Problema:** La PWA con `autoUpdate` cachea los assets, pero no hay página offline personalizada. Si el usuario abre la app sin conexión, verá un error del navegador.
- **Solución:** Agregar `offlinePage: '/offline.html'` en la configuración del service worker y crear una página offline branded.
- **Esfuerzo:** 2h
- **Criterio de aceptación:** Al desconectar red y abrir la app, aparece una página offline de Tuti (no el error del navegador).

---

**Total Sprint 5:** ~15 horas de desarrollo

---

## 🟢 Sprint 6: Testing E2E y QA Final
**Objetivo:** Cobertura de los flujos críticos de usuario de extremo a extremo.
**Duración estimada:** 2 semanas

---

### S6-T1 — Setup de Playwright E2E
- **Archivo:** `playwright.config.ts` (nuevo)
- **Severidad:** 🟡 Media
- **Problema:** El proyecto tiene 96 tests unitarios pero ningún test E2E. Los flujos críticos (crear sala → unirse → jugar → terminar) solo se prueban manualmente.
- **Solución:** Instalar Playwright y crear el setup básico con el servidor de desarrollo.
- **Esfuerzo:** 3h
- **Criterio de aceptación:** `npm run test:e2e` arranca y puede navegar a la app.

---

### S6-T2 — Test E2E: Flujo LOBBY → PLAYING → GAME_OVER (Modo Clásico)
- **Archivo:** `tests/e2e/classic-game.spec.ts` (nuevo)
- **Severidad:** 🟡 Media
- **Escenario:**
  1. Jugador A crea sala pública
  2. Jugador B se une
  3. Host inicia juego
  4. Ambos escriben respuestas
  5. Jugador A presiona "Tuti"
  6. Ambos votan
  7. Ambos ven la pantalla de resultados finales
- **Esfuerzo:** 8h
- **Criterio de aceptación:** Test pasa de forma determinista en CI.

---

### S6-T3 — Test E2E: Reconexión durante partida activa
- **Archivo:** `tests/e2e/reconnection.spec.ts` (nuevo)
- **Severidad:** 🟡 Media
- **Escenario:**
  1. Jugador A y B están jugando
  2. Se simula desconexión de B (cierre de pestaña)
  3. B se reconecta dentro del zombie timeout
  4. B recupera el estado correcto y puede continuar
- **Esfuerzo:** 5h
- **Criterio de aceptación:** El jugador reconectado recibe `UPDATE_STATE` correcto con su posición en el juego.

---

### S6-T4 — Test E2E: Flujo del Modo Impostor
- **Archivo:** `tests/e2e/impostor-game.spec.ts` (nuevo)
- **Severidad:** 🟢 Baja
- **Escenario:** Lobby → Rol Reveal → Typing → Votación → Resultado de eliminación → Last Wish (opcional)
- **Esfuerzo:** 8h
- **Criterio de aceptación:** Test pasa con 3 jugadores simulados, roles asignados correctamente (state masking verificado).

---

**Total Sprint 6:** ~24 horas de desarrollo

---

## 🔵 Backlog v1.1 — Features Futuras

> Estas features no bloquean v1.0 pero incrementan la retención y viralidad.

| ID | Feature | Descripción | Prioridad |
|----|---------|-------------|-----------|
| F1 | **Sistema de Estadísticas** | Guardar partidas jugadas, victorias, títulos ganados por usuario en Supabase | Alta |
| F2 | **Perfiles de Usuario** | Avatar persistente, nombre guardado, historial de partidas | Alta |
| F3 | **Salas con Contraseña** | Salas privadas con pin de 4 dígitos además del link | Media |
| F4 | **Observadores en tiempo real** | Modo espectador con vista completa del juego | Media |
| F5 | **Categorías Personalizadas v2** | Librería de categorías comunitarias guardadas en Supabase | Media |
| F6 | **Torneos/Brackets** | Sistema de eliminatoria entre múltiples salas | Baja |
| F7 | **Soporte de idioma Francés/Italiano** | Agregar `fr.json` e `it.json` al sistema i18n | Baja |
| F8 | **Replay de Partida** | Ver las respuestas de todos los jugadores en una vista de resumen post-partida | Baja |

---

## 📊 Estimación Total

| Sprint | Esfuerzo | Prioridad |
|--------|----------|-----------|
| S1 — Seguridad | ~7h | 🔴 Crítico pre-launch |
| S2 — Código | ~10.5h | 🟡 Importante |
| S3 — Monitoreo | ~8h | 🟡 Importante |
| S4 — Escalabilidad | ~8h | 🟢 Recomendado |
| S5 — UX/i18n | ~15h | 🟢 Recomendado |
| S6 — Testing E2E | ~24h | 🟢 Recomendado |
| **Total** | **~72.5h** | |

> [!TIP]
> Para un desarrollador individual trabajando a tiempo parcial (~3h/día), el roadmap completo hasta v1.0 representa aproximadamente **4-6 semanas** de trabajo. El Sprint 1 debería completarse antes de cualquier campaña de marketing o lanzamiento público.
