Informe Técnico: Auditoría Arquitectónica y Roadmap hacia Producción (v1.0) - Tutti Frutti Online
Este documento establece las directrices obligatorias para la transición del proyecto Tutti Frutti Online a un entorno de producción de alta disponibilidad. Como Arquitecto Senior, exijo el cumplimiento estricto de los estándares de seguridad y rendimiento detallados a continuación. No se aceptarán desviaciones de este marco técnico.
--------------------------------------------------------------------------------
1. Análisis de la Arquitectura de Servidor Autoritativo
1.1. Evaluación del Modelo de Conexión y Física de la Latencia
El modelo actual de "dumb client" es técnicamente inviable para un despliegue global. Debemos considerar la Física de la Latencia: una conexión entre San Francisco y Nueva York (~4,000 km) tiene un límite teórico de 13ms basado en la velocidad de la luz, pero los saltos de red reales (hops) imponen latencias de 50ms a 100ms. Un retraso de medio segundo hace que el juego sea injugable.
Por tanto, el sistema debe implementar un Servidor Autoritativo en Nakama. El servidor será la única fuente de verdad. El cliente solo enviará "intenciones" (inputs), mientras que el servidor validará estados de juego, puntuaciones y cronómetros. Bajo ninguna circunstancia se confiará en el daño, las recompensas o el inventario reportado por el cliente.
1.2. Ciclo de Vida de la Partida (Match Handler)
El Match Handler es el "blueprint" de la lógica de juego. Nakama invoca siete funciones críticas que no pueden ser llamadas por los clientes:
Match Init: Configura el estado inicial y define el tick rate. Se debe seleccionar el tick rate más bajo posible que mantenga la experiencia (ej. 10-20 Hz para tiempo real, menor para turnos).
Match Join Attempt: Es el filtro de entrada. El servidor debe decidir aquí si permite o deniega el acceso antes de que el jugador se una.
Match Join: Gestión de la entrada efectiva de presencias.
Match Loop: El corazón del sistema. Se ejecuta en cada tick para procesar mensajes de clientes y actualizar el estado. Directiva: Si el procesamiento de un loop excede el tiempo asignado por el tick rate (ej. >100ms para 10Hz), Nakama terminará la partida para evitar inconsistencias.
Match Leave: Gestión de desconexiones. Se debe implementar una lógica que finalice la partida si esta permanece vacía por más de 100 ticks.
Match Terminate: Limpieza final de recursos.
Match Signal: Uso restringido únicamente para handoffs de datos o reservas excepcionales.
Restricción de Match Labels: Los metadatos de la partida (Match Labels) tienen un límite estricto de 2kb y no deben actualizarse más de una vez por tick para evitar saturación del motor de búsqueda de Nakama.
1.3. Optimización vs. Flexibilidad
Siguiendo los principios de Game Programming Patterns, la arquitectura debe priorizar el rendimiento sobre la abstracción infinita.
"La optimización prospera gracias a las limitaciones concretas".
Exijo fijar supuestos concretos (como el número máximo de jugadores por sala) para permitir el despacho estático y el inlining de métodos. Debemos minimizar el conocimiento "in-cranium" del desarrollador; si dos piezas de código están acopladas, el desarrollador debe cargar ambas en su memoria biológica, lo cual ralentiza el progreso y genera errores.
--------------------------------------------------------------------------------
2. Auditoría de Seguridad y Vulnerabilidades
2.1. Vulnerabilidades en WebSockets y CSWSH
El uso de WebSockets introduce riesgos de Cross-Site WebSocket Hijacking (CSWSH). Dado que los navegadores no permiten encabezados personalizados (como tokens CSRF tradicionales) en el handshake de WebSockets, se deben aplicar las siguientes protecciones:
Validación de Origin: El servidor debe rechazar cualquier conexión cuyo encabezado Origin no coincida exactamente con nuestros dominios autorizados.
Nonces de un solo uso: Se debe implementar un token/nonce impredecible dentro de la URL de conexión o como el primer mensaje del intercambio para validar la identidad del cliente.
Cookie Security: Las cookies de sesión deben portar los flags Secure y HttpOnly. El atributo SameSite debe ser Strict o Lax.
2.2. CVE-2024-30105: Vulnerabilidad Crítica en Deserialización
Se ha detectado una vulnerabilidad de Denegación de Servicio (DoS) de alta severidad (CVSS 8.7) que afecta a system.text.json. El culpable específico es la función JsonSerializer.DeserializeAsyncEnumerable(), la cual puede ser explotada mediante inputs maliciosos para agotar la memoria o la CPU.
Acción Obligatoria: Actualizar System.Text.Json a la versión 8.0.4 o superior inmediatamente. Se prohíbe el uso de versiones anteriores en cualquier componente de backend.
2.3. Condiciones de Carrera y "Zero Trust"
El procesamiento asíncrono de mensajes en el Match Loop puede generar condiciones de carrera si no se serializan las operaciones. Se requiere el uso de bloqueos de estado (mutex) o la serialización atómica de mensajes para evitar que un atacante manipule el estado enviando múltiples "updates" simultáneos.
Tabla de Validación de Acciones (Modelo Zero Trust):
Acción del Cliente
Validación Requerida del Servidor
Envío de palabra (Basta)
Verificar que la letra inicial es correcta y que la ronda sigue activa.
Reclamar Puntuación
El servidor calcula los puntos; el cliente solo muestra el resultado.
Apertura de Cofre/Botín
El servidor genera el resultado internamente; el cliente no envía el premio.
Movimiento/Posición
Validar contra la velocidad máxima y colisiones (Física autoritativa).

--------------------------------------------------------------------------------
3. Lógica del Juego y Sincronización
3.1. Mecánicas de Tutti Frutti (Spanish Playground Context)
Para cumplir con el estándar de "Spanish Playground", el sistema debe soportar y validar las siguientes categorías oficiales:
Nombre, Apellido, Cosa, Animal, Fruta o Verdura, Color, País o Ciudad, Verbo o Acción.
Lógica de Puntuación:
10 Puntos: Respuesta válida y única en la partida.
5 Puntos: Respuesta válida pero compartida con cualquier otro jugador en el match.
0 Puntos: Respuesta inválida, palabra no aceptada por el diccionario o campo vacío.
3.2. Sincronización mediante JSON Patch
Para optimizar el ancho de banda, se prohíbe el envío del objeto de estado completo en cada tick. Se debe implementar JSON Patch (RFC 6902) para transmitir únicamente los diffs (operaciones add, replace, remove). Esto reduce el payload drásticamente y permite una sincronización eficiente ante el problema de la MTU de 1500 bytes.
--------------------------------------------------------------------------------
4. Roadmap Detallado: Hacia la Versión 1.0 (Producción)
Sprint 1: Fortalecimiento del Core Autoritativo.
Migración de validación a Nakama.
Directiva: Descartar todos los "hacks" de prototipado. Como las estrellas de rock que destrozan habitaciones de hotel porque saben que se irán al día siguiente, el código de prototipo debe ser eliminado para construir sobre una base limpia.
Sprint 2: Blindaje de Seguridad.
Parcheo de CVE-2024-30105.
Implementación de validación de Origin y nonces en URL para WebSockets.
Sprint 3: Sincronización Avanzada.
Implementación de JSON Patch para reducir latencia y consumo de ancho de banda.
Sprint 4: Gestión de Persistencia y Monorepo (Nx).
Organización del código TypeScript usando Nx.
Objetivo: Garantizar que el type-checking cubra todo el repositorio, evitando que cambios en el servidor rompan el cliente. Resolución de alias de rutas obligatoria.
Sprint 5: Escalabilidad y C10K.
Configuración de múltiples "parties" por proyecto según documentación de PartyKit.
Pruebas de carga para mitigar riesgos de agotamiento de memoria basados en el tamaño de los frames declarados.
Sprint 6: Auditoría Final y Lanzamiento.
Implementación de reconciliación de estado en el cliente (predicción) y optimización de UI para reconexiones automáticas.
--------------------------------------------------------------------------------
5. Conclusiones Técnicas
El éxito de Tutti Frutti Online depende de nuestra capacidad para no confiar en el cliente. Los desafíos residuales, como el WebSocket Smuggling (explotación de discrepancias entre proxies NGINX y backends) y la latencia física, requieren una vigilancia constante. La simplicidad debe ser nuestra meta: el código elegante no es el que tiene más funciones, sino el que no tiene nada más que quitar. Se ordena la ejecución inmediata de este roadmap.
