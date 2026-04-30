Informe Técnico: Auditoría Arquitectónica Completa
Tuti Games — Análisis de Primera Mano del Código Fuente
Versión: v0.5.0 | Fecha: 2026-04-28 | Auditor: Antigravity AI
NOTE

Este informe fue generado mediante análisis directo del código fuente (server.ts, engines, schemas, composables, tests, vite.config, etc.), no a partir de documentación. Contrasta y complementa el informe de NotebookLM donde corresponde.

1. Evaluación del Informe de NotebookLM
Antes de entrar al análisis propio, es importante evaluar la precisión y relevancia del informe previo.

Afirmación de NotebookLM	Veredicto	Análisis Real
"Modelo de dumb client inviable para deploy global"	❌ INCORRECTO	El sistema ya implementa un servidor autoritativo en PartyKit (no Nakama). El cliente sólo envía intenciones (STOP_ROUND, TOGGLE_VOTE). El servidor valida y calcula.
"Migrar validación a Nakama"	❌ IRRELEVANTE	El stack es PartyKit + Cloudflare Workers, no Nakama. Nakama es para juegos con inventario/física. Tuti no lo necesita ni se beneficiaría.
"CVE-2024-30105 en System.Text.Json"	❌ FALSA ALARMA	Ese CVE afecta a ASP.NET/.NET. Este proyecto es 100% TypeScript/Node.js. No hay ninguna dependencia .NET en el package.json.
"Implementar JSON Patch (RFC 6902)"	✅ YA IMPLEMENTADO	fast-json-patch está instalado y activo. broadcastStateDelta() ya implementa compare() y PATCH_STATE. La recomendación era válida pero ya fue ejecutada.
"Prohibir el envío del estado completo en cada tick"	✅ YA IMPLEMENTADO	El sistema solo envía UPDATE_STATE en el primer mensaje. Todos los siguientes usan PATCH_STATE.
"Validación de Origin en WebSockets"	⚠️ PARCIALMENTE INCOMPLETO	Existe anti-spoofing por token, pero no hay validación explícita del header Origin en el onConnect.
"Serialización atómica de mensajes / mutex"	⚠️ VÁLIDO PERO CONTEXTUAL	PartyKit procesa mensajes de forma secuencial por diseño (Workers). Las condiciones de carrera son mínimas, pero existen en el write-behind de 5s.
"Organizar con Nx Monorepo"	⚠️ EXCESIVO PARA ESTE STAGE	Nx añade complejidad de CI/CD. El proyecto ya tiene un monorepo funcional con shared/ y tsconfig.json bien configurados.
Veredicto sobre NotebookLM
El informe mezcla conceptos reales (JSON Patch, condiciones de carrera) con afirmaciones incorrectas para este stack (Nakama, CVE de .NET) y recomendaciones ya implementadas. Es probable que NotebookLM analizó documentación genérica de juegos en línea en lugar del código real del proyecto.

2. Arquitectura del Sistema
2.1 Stack Tecnológico Real
Frontend        → Vue 3 + Vite + TailwindCSS + vue-i18n + vue-router
WebSocket Layer → PartySocket (cliente) / PartyKit (servidor)
Backend         → Cloudflare Workers (PartyKit) — Hibernation mode
Persistencia    → Cloudflare Durable Object Storage
Auth            → Supabase JWT (validación real server-side)
Validación      → Zod Schemas (ClientMessageSchema — Zero Trust)
Sync            → JSON Patch (fast-json-patch) + State Masking por conexión
PWA             → vite-plugin-pwa (service worker + auto-update)
2.2 Fortalezas Arquitectónicas Reales
✅ Patrón Motor/Servidor separado: La abstracción BaseEngine → TutiEngine | ImpostorEngine es elegante y permite Hot-Swap de modos en tiempo de ejecución sin reiniciar el worker. El patrón Factory en createEngine() es correcto.

✅ State Masking per-connection: El método broadcastStateDelta() genera una vista personalizada del estado para cada conexión mediante engine.getClientState(userId). Los roles del Impostor nunca llegan al cliente equivocado. Esta es la solución correcta para los requisitos del juego.

✅ Sincronización eficiente: Se usa fast-json-patch con compare() para emitir solo los cambios. El primer mensaje envía UPDATE_STATE (estado completo), los siguientes usan PATCH_STATE (diff). structuredClone() en V8 nativo para clonar el baseline de cada conexión (~2x más rápido que JSON.parse/stringify).

✅ Sistema de dos alarmas (Room TTL): La gestión de ciclo de vida de salas es sofisticada:

ROOM_SOFT_EXPIRY_MS (10s): Nuevas conexiones reciben ROOM_EXPIRED + config para auto-clonar.
ROOM_GAMEOVER_AFK_MS (60s): Jugadores activos son expulsados de la pantalla de resultados.
ROOM_HARD_EXPIRY_MS (3600s): Purga definitiva de memoria y storage.
✅ Anti-Zombie Room: onClose() implementa un getAlarm() previo antes de setAlarm() para no destruir alarmas de fase activas (la race condition "freeze" estaba documentada y resuelta).

3. Análisis de Seguridad
3.1 Lo que SÍ está protegido ✅
Vector	Protección Implementada
Suplantación de identidad	Sistema de tokens UUID generados por servidor. SPOOF_ATTEMPT detectado y reconducido a nuevo userId.
JWT Verification	Supabase /auth/v1/user verificado server-side en cada onConnect. isAuthenticated propagado al estado.
Flood de mensajes	RateLimiter (Token Bucket) con 5 tokens/2s para chat y 10 tokens/1s para acciones. Cleanup en onClose (sin memory leaks).
Validación de payloads	ClientMessageSchema Zod con discriminatedUnion. Mensajes inválidos son descartados con log ZERO_TRUST_DROP.
Inyección en nombres/avatares	Avatares sanitizados: strip de caracteres de control \u0000-\u001F, truncado a 10 chars. Nombres limitados a 20 chars por schema.
Roles en modo Impostor	PRIVATE_ROLE_ASSIGNMENT enviado como "whisper" per-conexión. Estado de roles nunca en getState() público.
Acciones privilegiadas	KICK_PLAYER, START_GAME, RESTART_GAME validan que el sender sea el host. Tests de seguridad verifican esto.
3.2 Vulnerabilidades y Deuda Técnica de Seguridad ⚠️
[SEC-1] Falta validación del header Origin en WebSocket

Severidad: Media
Detalle: No hay validación explícita del header Origin en onConnect. PartyKit puede manejar esto a nivel de plataforma, pero no es explícito en el código del proyecto.
Riesgo: CSWSH teórico. Bajo en práctica si el dominio de producción es único.
Recomendación: Agregar check de ctx.request.headers.get('Origin') contra una allowlist en onConnect.
[SEC-2] Tokens en Query String (no en Cookie)

Severidad: Baja-Media
Detalle: El token de sesión se pasa como ?token= en la URL del WebSocket. Los URLs quedan en logs de proxies, CDN y analítica del navegador.
Riesgo: Exposición de token en logs.
Recomendación: Usar el primer mensaje post-conexión como handshake de identidad (ya que WebSocket no permite headers custom en el browser).
[SEC-3] Write-Behind de 5s con ventana de pérdida de estado

Severidad: Baja
Detalle: Si el Worker hibernat dentro de la ventana de 5s del saveTimeout, el estado puede perderse. Mitigado por el sistema de alarmas pero no eliminado.
[SEC-4] Lobby sin autenticación

Severidad: Muy Baja
Detalle: El endpoint /heartbeat del LobbyServer no valida que quien llama sea realmente un room server legítimo. Un atacante podría inyectar salas falsas en el lobby enviando POSTs al endpoint.
Recomendación: Agregar un secret compartido en headers (X-Room-Secret) o validar que el id del snapshot corresponda a una room real.
4. Rendimiento y Escalabilidad
4.1 Fortalezas de Rendimiento ✅
O(N) Delta Broadcast: Un solo loop sobre getConnections() emite delta + role whisper (no dos iteraciones separadas).
structuredClone() nativo: ~2x más rápido que JSON.parse para el baseline de estado masking.
TickManager separado: El countdown de 1s está aislado en TickManager. No contamina el path caliente del onMessage.
AlarmManager: Las alarmas de fase (votación, resultados) son delegadas al sistema de alarmas de Cloudflare, no a setInterval (que no sobrevive a la hibernación).
Heartbeat condicional: Solo corre para salas públicas (10s). Privadas no desperdician CPU ni cuota HTTP del lobby.
Singleton Supabase: Un solo cliente de Supabase por V8 Isolate (compartido entre todas las salas del worker), evitando pool exhaustion.
4.2 Riesgos de Rendimiento ⚠️
[PERF-1] stateVersion++ en cada broadcast El campo stateVersion se incrementa en broadcastStateDelta() antes de calcular los patches. Esto garantiza que el patch siempre tenga al menos 1 cambio (el version), incluso si el estado real no cambió. Efecto: se envían patches innecesarios en eventos como PONG o chat que no mutan el estado.

[PERF-2] getConnections() como array dinámico [...this.room.getConnections()] en onClose y onAlarm materializa la colección completa. Para salas grandes (8 jugadores) es trivial, pero es un patrón a monitorear si el MAX_PLAYERS se aumentara significativamente.

[PERF-3] Lobby sin paginación real lobby.ts limita a 50 salas en el snapshot inicial, pero el roomScore() y el setInterval de persistencia recorre todas las salas en el Map cada 10-15s. Con crecimiento viral (cientos de salas), esto podría ser un cuello de botella.

[PERF-4] Sin compresión de WebSocket Los payloads JSON sin comprimir. Para salas con muchos jugadores y respuestas largas (modo clásico), los patches pueden ser grandes. permessage-deflate no está habilitado explícitamente.

5. Calidad del Código
5.1 Puntos Positivos ✅
Suite de tests funcional (96 tests, 10 archivos): Cubre RateLimiter, sanitización, autoridad, scoring, round manager, voting manager. Todos pasan limpiamente.
TypeScript estricto: vue-tsc --noEmit sin errores. tsconfig.json bien configurado.
Separación de responsabilidades: Handlers (PlayerHandler, GameHandler, VotingHandler, ChatHandler) aislados del servidor principal. server.ts es un orquestador limpio.
Logging estructurado: logger.info/warn/error con contextos tipados. Facilita debugging en producción.
Código documentado: Comentarios de sprint (ej: [Sprint H6 — SEC-3]) que trazan la historia de cada decisión técnica.
Build optimizado: Chunking manual en vite.config.ts con 4 chunks (vendor-core, vendor-network, game-engines, vendor-utils). Code splitting correcto.
5.2 Deuda Técnica ⚠️
[DT-1] console.log en código de producción useSocket.ts tiene múltiples console.log que se emitirán en producción. Estos revelan información de conexión a cualquier usuario que abra DevTools.

typescript
// Línea 53, 89, 105, 111, etc.
console.log(`🔌 Connecting to room: ${roomId} on host: ${PARTYKIT_HOST}`);
[DT-2] Type casting con as any en handlers

typescript
// server.ts línea 248
const userId = (conn.state as any)?.userId || conn.id;
// server.ts línea 525, 534, 548, 558...
await this.gameHandler.handleStopRound(payload as any, sender);
Los payloads pasan a los handlers sin el tipo Zod inferido. Esto anula parcialmente la protección de tipos conseguida por el schema validation.

[DT-3] Comentario de deuda activo en línea 73 de base-engine.ts

typescript
public updateEngine(newEngine: BaseEngine): void {
    (this as any).engine = newEngine; // [Deuda P2]
}
El Hot-Swap de engine usa (this as any), lo que oculta un acoplamiento de datos potencialmente peligroso.

[DT-4] Scripts de locales no eliminados del repositorio update_locales.ts, update_locales_v4.ts, update_locales_v5.ts y dump_categories.ts están en la raíz del repositorio. Son scripts de mantenimiento que deberían estar en /scripts o ser ignorados por .gitignore si contienen lógica de build sensible.

[DT-5] APP_VERSION hardcodeada

typescript
// shared/consts.ts línea 60
export const APP_VERSION = 'v0.5.0';
Debería venir de package.json o de la variable de entorno de CI/CD para mantener paridad automática.

6. Internacionalización (i18n)
6.1 Estado Actual
El proyecto ha completado 4 fases de internacionalización con cobertura ~90%+:

vue-i18n correctamente configurado con 3 idiomas (ES, EN, PT)
Namespaces bien estructurados: common, home, lobby, game, results, system, tutorial, titles, impostorReveal, impostorLastWish, app
Persiste idioma en localStorage
Selector de idioma rediseñado (dropdown con globo + nombre completo)
Engines del servidor emiten code en mensajes de sistema para que el cliente traduzca
6.2 Pendientes Residuales ⚠️
El error de sendError en connection.ts línea 158 aún contiene texto en español: 'Solo el anfitrión puede expulsar jugadores.'
Algunos mensajes de console.warn del servidor están en español (no crítico para UX pero inconsistente)
7. Infraestructura y Deployment
7.1 Configuración de Producción ✅
partykit.json define el host de producción
.env.example documenta las variables necesarias
VitePWA con autoUpdate correctamente configurado
Service Worker con cleanupOutdatedCaches: true
Manifest PWA con iconos correctos y orientation: portrait-primary
7.2 Gaps de Producción ⚠️
[OPS-1] Sin monitoreo/alertas de producción No hay integración con sistemas de observabilidad (Sentry, Datadog, etc.). Los errores de servidor solo van a los logs de Cloudflare, que tienen retención limitada.

[OPS-2] Sin CORS policy explícita en el endpoint del lobby El LobbyServer.onRequest() no establece headers CORS. Si el frontend está en un dominio diferente al del servidor, las peticiones pueden fallar.

[OPS-3] Sin variables de entorno validadas al arranque Si SUPABASE_URL o SUPABASE_ANON_KEY no están configuradas en producción, el servidor arranca pero falla silenciosamente en cada verificación de JWT, logrando que todos los usuarios sean isAuthenticated: false.

8. Roadmap Recomendado (Priorizado por Impacto Real)
🔴 Alta Prioridad (Pre-Producción)
ID	Tarea	Esfuerzo
P1	Eliminar console.log de useSocket.ts y reemplazar por logger condicional de DEV	1h
P2	Agregar validación de header Origin en onConnect del servidor	2h
P3	Agregar secret compartido en /heartbeat del lobby para prevenir spam de salas falsas	3h
P4	Configurar Sentry o Cloudflare Analytics en frontend y backend	4h
🟡 Media Prioridad (Post-Launch v1.0)
ID	Tarea	Esfuerzo
P5	Mover token de URL a primer mensaje post-handshake	4h
P6	Eliminar as any en payloads de handlers, tipar correctamente con tipos Zod inferidos	6h
P7	Agregar paginación/TTL agresivo al lobby para escenarios virales (+200 salas)	4h
P8	Mover scripts de locales a /scripts y añadir a .gitignore si es necesario	1h
P9	Auto-sincronizar APP_VERSION desde package.json vía plugin de Vite	1h
🟢 Baja Prioridad (v1.1+)
ID	Tarea	Esfuerzo
P10	Investigar permessage-deflate en PartyKit para compresión de WS en salas grandes	2h
P11	Añadir test E2E básico (Playwright) para flujo LOBBY → PLAYING → GAME_OVER	8h
P12	Validar variables de entorno al arranque del servidor (fail-fast)	2h
9. Conclusiones
Estado Real del Proyecto
Tuti Games es un proyecto técnicamente ambicioso y bien ejecutado para su etapa de desarrollo. La arquitectura de servidor autoritativo está correctamente implementada desde el inicio, no como una deuda futura. Los fundamentos de seguridad (Zod schemas, token anti-spoofing, JWT server-side, rate limiting, state masking) están en su lugar.

Comparación con el Informe de NotebookLM
El informe de NotebookLM fue generado sin acceso al código real. Sus recomendaciones más alarmantes (migrar a Nakama, parchear un CVE de .NET, implementar JSON Patch) son incorrectas, irrelevantes o ya implementadas. Algunas observaciones genéricas sobre seguridad de WebSockets y condiciones de carrera tienen mérito teórico pero necesitan ser contextualizadas dentro del stack real.

Nivel de Madurez
Arquitectura     ████████░░  80%  — Sólida, con deuda de tipado en handlers
Seguridad        ████████░░  78%  — Buena base, faltan Origin validation y lobby auth
Rendimiento      ████████░░  80%  — Excelente para escala actual (≤8 jugadores/sala)
Calidad de Código ███████░░░  72%  — console.logs, as any, scripts sueltos
i18n             █████████░  90%  — Prácticamente completo
Tests            ███████░░░  70%  — 96 tests unitarios, sin E2E
Deploy/Ops       ██████░░░░  60%  — Falta monitoreo y validación de env vars
El proyecto está listo para un lanzamiento beta controlado. Para producción pública, se recomienda implementar las tareas de alta prioridad (P1-P4) antes del go-live.

