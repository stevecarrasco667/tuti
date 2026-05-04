# Auditoria Global Codex - Tuti Games

Fecha: 2026-05-03  
Alcance: `party`, `shared`, `src`, configuracion Vite/PartyKit y flujo WebSocket cliente-servidor.  
Regla respetada: no se modifico codigo fuente. Este archivo es el unico artefacto creado.

## Resumen Ejecutivo

La arquitectura base es correcta para un proyecto de costo cero: PartyKit/Cloudflare Workers como servidor autoritativo, cliente Vue visual, Zod como frontera de mensajes, JSON Patch para deltas y Supabase solo como capa auxiliar gratuita. Sin embargo, la auditoria encontro riesgos reales en tres puntos: filtracion de respuestas live en modo Classic, referencias stale tras hidratacion/hot-swap y timers privados que pueden sobrevivir a la vida de una sala.

Prioridad recomendada:

1. Corregir fuga de respuestas live en Classic.
2. Corregir referencias stale de `TickManager` y `ConnectionHandler`.
3. Limpiar timers de gracia de Impostor en `dispose`/reset.
4. Endurecer limites de entrada y esquemas Zod.
5. Reducir broadcasts duplicados y clones/diffs innecesarios.

## Severidad Critica

### C1. Classic filtra respuestas live a todos los clientes durante `UPDATE_ANSWERS`

Archivos:

- `shared/engines/tuti-engine.ts:80-81`
- `shared/engines/tuti-engine.ts:562-595`
- `party/handlers/game.ts:39-65`
- `party/server.ts:553-559`
- `party/server.ts:677-680`
- `src/composables/useGameActions.ts:52-61`

Riesgo:

`TutiEngine.getClientState()` devuelve `this.state` completo para todos los jugadores. A la vez, `updateAnswers()` guarda los borradores live en `state.answers[userId]`. El handler envia un `RIVAL_UPDATE`, pero despues `server.ts` ejecuta el delta sync unificado y manda el patch completo del estado a todos.

Impacto:

Un cliente modificado o alguien mirando el WebSocket puede leer respuestas rivales antes de la fase de revision. Esto rompe la autoridad competitiva del servidor: la UI no lo muestre no basta, porque el dato viaja por red. En infraestructura gratuita tambien aumenta payload: cada escritura live puede mandar texto completo de respuestas cuando solo se necesitaba `filledCount`.

Recomendacion:

En Classic, `getClientState(userId)` debe enmascarar `answers` durante `PLAYING`/`ENDING_COUNTDOWN`: cada jugador ve sus propias respuestas y de rivales solo metadatos. Mantener `RIVAL_UPDATE` como canal ligero. Revelar `answers` completas solo desde `REVIEW` en adelante.

### C2. `TickManager` queda apuntando al engine viejo tras hidratacion o cambio de modo

Archivos:

- `party/server.ts:166-172`
- `party/server.ts:217-223`
- `party/server.ts:587-600`
- `party/managers/tick-manager.ts:35-37`
- `party/managers/tick-manager.ts:69-77`

Riesgo:

`TickManager` recibe el engine por constructor y lo guarda como `private readonly engine`. Si `onStart()` hidrata una sala `IMPOSTOR`, o si `UPDATE_CONFIG` hace hot-swap de `CLASSIC` a `IMPOSTOR`, `server.ts` actualiza los handlers con `setEngine()`, pero no actualiza ni reconstruye `TickManager`.

Impacto:

El intervalo de tick puede llamar `tick()` sobre un engine muerto mientras `onBroadcast()` lee el engine nuevo. Resultado: `remainingTime` no avanza en el estado real, timers visuales inconsistentes, mas `REQUEST_FULL_SYNC`, mas reconexiones y partidas congeladas. En Cloudflare gratuito esto es peligroso porque un bug de timer crea salas vivas que consumen CPU/alarmas sin progreso.

Recomendacion:

Dar a `TickManager` un `setEngine()` o reconstruirlo cada vez que se reemplaza `this.engine`. La misma regla debe aplicarse en hidratacion de `onStart()` y hot-swap de `UPDATE_CONFIG`.

### C3. Tokens hidratados no llegan al `ConnectionHandler`

Archivos:

- `party/server.ts:76`
- `party/server.ts:181-183`
- `party/server.ts:242-245`
- `party/handlers/connection.ts:13-23`
- `party/handlers/connection.ts:80-102`

Riesgo:

`ConnectionHandler` recibe una referencia al `Map` inicial `authTokens`. En `onStart()`, el servidor hace `this.authTokens = new Map(Object.entries(storedTokens))`. Esa reasignacion no actualiza el `Map` que ya tiene `ConnectionHandler`.

Impacto:

Tras hibernacion, el handler puede operar con un mapa vacio/stale aunque el servidor haya hidratado tokens. Esto degrada anti-spoofing, reconexiones y persistencia de identidad, creando jugadores duplicados o fantasmas. En costo cero, cada jugador fantasma aumenta estado, payload de delta y almacenamiento durable.

Recomendacion:

No reasignar el `Map`; limpiar y repoblar la misma instancia, o agregar `setAuthTokens()` al handler. Tambien conviene test de hibernacion simulada: token persistido -> nuevo Server -> misma identidad sin duplicado.

### C4. Timers de gracia de Impostor no se limpian al disponer el engine

Archivos:

- `shared/engines/impostor-engine.ts:51`
- `shared/engines/impostor-engine.ts:235-245`
- `shared/engines/impostor-engine.ts:253-258`
- `shared/engines/impostor-engine.ts:1009-1014`

Riesgo:

`_gracePeriodTimers` guarda `setTimeout` por impostor desconectado. `dispose()` llama `clearTimer()` y `clearSecrets()`, pero no recorre ni cancela `_gracePeriodTimers`.

Impacto:

Un timer puede dispararse despues de que la sala quedo vacia o el engine fue descartado, mutando estado viejo y llamando `onGameStateChange`. Esto es una fuente directa de salas fantasma, broadcasts innecesarios y retencion de memoria. En Workers gratuitos, timers vivos de salas abandonadas son veneno operativo.

Recomendacion:

Agregar limpieza explicita de todos los grace timers en `dispose()`, `restartGame()` y cualquier reset fuerte de sala. Luego vaciar el `Map`.

### C5. Identidad y nombre desde query llegan sin limite fuerte al estado

Archivos:

- `party/handlers/connection.ts:48-54`
- `party/handlers/connection.ts:80-102`
- `shared/systems/player-manager.ts:8-16`
- `shared/systems/player-manager.ts:40-55`

Riesgo:

El servidor toma `name` y `userId` directamente desde query params. El avatar se sanea y trunca, pero `name`, `userId` y `token` no tienen limites comparables antes de entrar a `authTokens` y `state.players`.

Impacto:

Un atacante puede inflar payloads y storage con nombres/userIds largos, o hacer costosos `Object.fromEntries(this.authTokens)` al persistir tokens. En capa gratuita, un DoS por mensajes o almacenamiento sobredimensionado puede ser mas dañino que un bug funcional.

Recomendacion:

Aplicar un schema de handshake server-side: `name` 1-20, `userId` UUID o longitud maxima razonable, `token` longitud maxima, avatar ya saneado. Rechazar o reasignar identidad si no cumple.

### C6. Configuracion host puede inflar categorias y estado mas alla de lo esperado

Archivos:

- `shared/schemas.ts:34-37`
- `shared/schemas.ts:164-166`
- `shared/systems/configuration-manager.ts:32-79`
- `shared/engines/tuti-engine.ts:333-340`

Riesgo:

`GameConfigSchema` limita `categoryCount`, pero `classic.categories` y `customCategories` son arrays sin maximo de longitud ni limite de texto por item. `ConfigurationManager` limita numeros, pero no normaliza ni recorta arrays.

Impacto:

Aunque `UPDATE_CONFIG` esta protegido por host, basta un host malicioso o cliente corrupto para crear estado grande y forzar cargas paralelas de categorias. Esto aumenta storage, JSON Patch, clones y consultas/cache contra Supabase, justo lo que se debe evitar en presupuesto cero.

Recomendacion:

Limitar arrays de configuracion en Zod y en `ConfigurationManager`: max categorias efectivas, ids/nombres con longitud maxima, deduplicacion y rechazo de ids desconocidos antes de iniciar ronda.

## Rendimiento

### P1. Broadcast duplicado por callbacks del engine mas delta unificado

Archivos:

- `party/server.ts:126-146`
- `party/server.ts:677-680`
- `shared/engines/tuti-engine.ts:405`
- `shared/engines/impostor-engine.ts:853-854`

Riesgo:

Varios metodos del engine llaman `onGameStateChange()`, que ya ejecuta `broadcastStateDelta()`. Luego `onMessage()` vuelve a ejecutar `broadcastStateDelta()` para el mismo evento. Ejemplos claros: `TutiEngine.stopRound()` y `ImpostorEngine.toggleVote()`.

Impacto:

Se incrementa `stateVersion` dos veces, se hacen dos pasadas por conexiones, dos `structuredClone`, dos `compare()` y potencialmente dos mensajes por accion. En salas chicas funciona, pero en gratuito esto desperdicia CPU y ancho de banda.

Recomendacion:

Definir una unica fuente de emision: o los engines notifican y `onMessage()` detecta que ya hubo broadcast, o los engines solo mutan y el servidor emite al final. Para timers internos, mantener callback; para mensajes entrantes, preferir emision centralizada.

### P2. Delta sync hace `structuredClone` y `compare` por conexion en cada tick

Archivos:

- `party/server.ts:260-292`
- `party/managers/tick-manager.ts:69-77`

Riesgo:

Cada tick de 1 segundo incrementa version, calcula estado por conexion, compara contra baseline y clona el resultado. Con max 10 jugadores es viable, pero el costo crece con estado grande: respuestas, votos, chat indirecto, spectators y datos de Impostor.

Impacto:

El patron es correcto, pero sensible a cualquier crecimiento accidental de `RoomState`. Los hallazgos C1 y C6 vuelven esta ruta mas cara. En Cloudflare free, CPU por Durable Object es un recurso a cuidar.

Recomendacion:

Mantener `RoomState` minimo. Separar canales de alta frecuencia (`remainingTime`, `filledCount`) de estado completo cuando sea posible. Evitar que drafts de texto entren al patch global.

### P3. `UPDATE_ANSWERS` envia dos senales por evento

Archivos:

- `party/handlers/game.ts:39-65`
- `party/server.ts:553-559`
- `party/server.ts:677-680`
- `src/composables/useGameActions.ts:61`

Riesgo:

El evento live manda `RIVAL_UPDATE` y ademas produce `PATCH_STATE`. La intencion parece ser enviar solo progreso liviano, pero actualmente tambien se difea el estado completo.

Impacto:

Mas mensajes y mas riesgo de fuga de informacion. En redes moviles, esto tambien aumenta desorden de parches y necesidad de full sync.

Recomendacion:

Para live typing Classic, no mutar `state.answers` publico o saltar delta global. Guardar drafts privados por jugador o enviar solo `filledCount` hasta `SUBMIT_ANSWERS`/`STOP_ROUND`.

### P4. Lobby global usa intervalos permanentes sin guard de duplicacion por `onStart`

Archivos:

- `party/lobby.ts:18`
- `party/lobby.ts:34-47`

Riesgo:

`onStart()` crea dos `setInterval`: reaper cada 10s y persistencia cada 15s. En un party global unico es aceptable, pero si `onStart()` puede ejecutarse mas de una vez en el ciclo de vida del isolate sin destruir la instancia, no hay guard interno contra intervalos duplicados.

Impacto:

Duplicar reapers/persistencias aumenta writes a Durable Storage y broadcasts de limpieza. Es menor que los criticos, pero relevante para costo cero.

Recomendacion:

Guardar handles e impedir doble inicializacion. Si PartyKit garantiza instancia limpia por `onStart`, documentarlo en comentario/test.

### P5. `useGameState()` instala watchers de localStorage por cada invocacion

Archivos:

- `src/composables/useGameState.ts:52-73`
- `src/composables/useGame.ts:14-48`
- `src/composables/useChat.ts:29-33`

Riesgo:

Los refs son globales, pero los `watch(myUserId)`, `watch(myUserName)` y `watch(myUserAvatar)` se crean dentro de `useGameState()`. Cada componente/composable que llama `useGame()` puede instalar watchers repetidos sobre los mismos refs.

Impacto:

No rompe el juego, pero genera trabajo duplicado y escritura repetida a localStorage. En dispositivos moviles baratos, esto suma ruido a una app en tiempo real.

Recomendacion:

Convertir esos watchers en inicializacion singleton de modulo, similar a `useGameSync`, o proteger con `isInitialized`.

### P6. Reacciones no tienen limite local de bursts activos

Archivos:

- `src/composables/useReactions.ts:26`
- `src/composables/useReactions.ts:52-61`
- `party/handlers/game.ts:93-109`

Riesgo:

El servidor rate-limitea acciones, pero el cliente acumula bursts durante 1.5s sin cap local. Una sala con varios jugadores puede generar muchos elementos animados simultaneos.

Impacto:

Riesgo de jank en moviles, especialmente porque el proyecto apunta a accesibilidad en redes/dispositivos modestos.

Recomendacion:

Cap local por target/categoria y cap global de bursts. Descartar visuales extra sin afectar el evento autoritativo.

## Deuda Tecnica

### D1. Drift entre `RoomState`/`ImpostorData` y esquemas Zod

Archivos:

- `shared/schemas.ts:4-12`
- `shared/schemas.ts:51-63`
- `shared/schemas.ts:67-94`
- `shared/types.ts:28-38`
- `shared/types.ts:67-84`
- `shared/types.ts:112-147`

Riesgo:

`PlayerSchema` no incluye `avatar`, aunque `Player` si. `ImpostorDataSchema` espera `secretWord`, `secretCategory` e `impostorIds`, pero el tipo real usa `currentCategoryId`, `currentCategoryName` y mantiene secretos privados fuera del estado. `RoomStateSchema` no refleja campos reales como `remainingTime`, `stoppedBy`, `endingCountdownBy`, `gameOverReason` o `gameOverAt`.

Impacto:

Los esquemas dejan de ser una fuente fiable de verdad. Esto puede esconder errores de runtime, romper validacion futura de mensajes servidor-cliente y dificultar tests de storage/hidratacion.

Recomendacion:

Hacer que los tipos deriven de Zod o que Zod derive de tipos mediante disciplina estricta. En particular, separar schema publico de cliente, schema persistido y schema privado de Impostor.

### D2. `ServerMessage` y cliente confian en casts, no validan mensajes entrantes

Archivos:

- `src/composables/useGameSync.ts:55`
- `src/composables/useGameSync.ts:80-84`
- `src/composables/useGameSync.ts:130-139`
- `src/composables/useSocket.ts:32-42`
- `src/composables/useLobby.ts:55-77`
- `shared/types.ts:179`

Riesgo:

El cliente hace `JSON.parse` y castea a `ServerMessage`. Los patches son `any[]`. Si llega un mensaje malformado por bug de servidor, version vieja o extension del protocolo, el cliente puede fallar o mutar estado inesperadamente.

Impacto:

No es una vulnerabilidad de autoridad, porque el servidor manda el estado, pero si causa WSOD o full sync loops aumenta desconexiones y soporte operativo.

Recomendacion:

Crear `ServerMessageSchema` Zod liviano para cliente, especialmente para `PATCH_STATE`, `PRIVATE_ROLE_ASSIGNMENT`, `ROOM_EXPIRED` y lobby events.

### D3. `as any` aparece en rutas de produccion

Archivos:

- `party/handlers/chat.ts:33`
- `party/handlers/chat.ts:51`
- `party/handlers/game.ts:46`
- `src/composables/useSocket.ts:124`
- `src/composables/useGameSync.ts:133`
- `src/components/HomeView.vue:193`
- `src/components/LobbyView.vue:48`
- `src/components/LobbyView.vue:56`

Riesgo:

Algunos `as any` son adaptadores razonables, pero otros cruzan fronteras sensibles: estado de conexion, metodos opcionales de engine, payload de version, construccion dinamica de config.

Impacto:

Los casts reducen la proteccion del compilador justo donde el protocolo cambia mas. En un backend autoritativo, tipos debiles en fronteras pueden introducir exploits por omision.

Recomendacion:

Reemplazar `any` por tipos discriminados: `ConnectionState`, interfaz `SecretWordProvider`, helpers tipados para config path, y tipos concretos para payloads.

### D4. `WordReactSchema` acepta cualquier string como emoji

Archivos:

- `shared/schemas.ts:199-205`
- `party/handlers/game.ts:93-109`
- `src/components/game/ReactionMenu.vue:15-19`

Riesgo:

La UI ofrece una lista cerrada, pero el servidor acepta cualquier string. Un cliente modificado puede mandar texto largo o caracteres raros. Zod solo exige `z.string()`.

Impacto:

Payloads y DOM visuales innecesarios; posible degradacion de render en clientes. En capa gratuita, tambien es ancho de banda desperdiciado.

Recomendacion:

Validar `emoji` contra enum/lista permitida o limitar longitud Unicode estrictamente en el servidor.

### D5. `useChat` tiene scope detached dificil de reactivar tras `stopChatScope()`

Archivos:

- `src/composables/useChat.ts:11-18`
- `src/composables/useChat.ts:28-67`

Riesgo:

`chatScope` se crea una sola vez a nivel modulo. Si `stopChatScope()` se llama, `isInitialized` vuelve a `false`, pero el mismo `effectScope` ya fue detenido. En Vue, un scope detenido no esta pensado para reusarse como nuevo contenedor activo.

Impacto:

Puede dejar el chat sin watcher despues de teardown/test/HMR especifico. No es critico en produccion si nunca se llama, pero es deuda de ciclo de vida.

Recomendacion:

Crear un nuevo `effectScope(true)` al reinicializar, o no exponer stop salvo para tests con reset completo.

### D6. Auto-clon de sala expirada usa delay fijo de 1.5s para aplicar config

Archivos:

- `src/router/index.ts:114-153`

Riesgo:

Cuando una sala expira, el router abre una nueva sala y usa `setTimeout(1500)` antes de enviar `UPDATE_CONFIG`. En redes lentas, el socket podria no estar listo; en redes rapidas, es espera innecesaria.

Impacto:

Config heredada puede perderse o aplicarse tarde, generando soporte y repeticiones de sala. No consume infraestructura masiva, pero degrada UX en la red movil que el proyecto intenta soportar.

Recomendacion:

Esperar evento `open` o primer `UPDATE_STATE` de la nueva sala antes de mandar config heredada.

## Validacion Ejecutada

Lectura estatica exhaustiva con PowerShell sobre `party`, `shared` y `src`.

No se pudo ejecutar `npm run typecheck` porque `npm` no esta disponible en el PATH de esta sesion:

`npm : El termino 'npm' no se reconoce como nombre de un cmdlet...`

## Conclusiones Por Area Solicitada

### Area 1 - Backend y Seguridad del Servidor

La base autoritativa es solida, pero hay tres fallas prioritarias: respuestas live visibles en Classic, referencias stale tras hibernacion/hot-swap y timers de gracia sin limpieza. Tambien falta endurecer handshake y config para evitar inflado de estado.

### Area 2 - Eficiencia de Red y Sincronizacion

JSON Patch y `stateVersion` son una buena eleccion. El problema es que hoy se esta metiendo demasiado en el estado que se difea, especialmente drafts de respuestas. Hay broadcasts duplicados y clones por conexion que conviene reducir antes de crecer en usuarios.

### Area 3 - Frontend y Reactividad Vue

El cliente respeta la autoridad del servidor, pero algunos singletons/watchers necesitan cierre mas disciplinado. `useGameState` puede crear watchers repetidos, `useChat` tiene un reset fragil y reacciones pueden generar bursts visuales sin cap.

### Area 4 - Tipado Estricto y Deuda Tecnica

La mayor deuda es la divergencia entre `shared/types.ts` y `shared/schemas.ts`. Mientras eso persista, Zod deja de ser garantia completa. Tambien hay casts `as any` en fronteras sensibles y falta un schema de mensajes servidor-cliente.
