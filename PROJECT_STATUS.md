# 📋 ESTADO DEL PROYECTO: TUTIFRUTI ONLINE (Project Phoenix)
**Fecha**: 2025-12-01  
**Fase**: Entorno de Desarrollo Híbrido Listo - Inicio de Lógica de Juego  
**Repositorio**: https://github.com/estebancarras/tuti

---

## 🎯 VISIÓN DEL PROYECTO
Juego multijugador en tiempo real tipo "Basta/Stop" con arquitectura moderna, escalable y sin deuda técnica desde el primer commit.

---

## ✅ LO QUE YA ESTÁ HECHO

### 1. Infraestructura Base
- ✅ Repositorio Git inicializado y subido a GitHub
- ✅ Estructura de carpetas profesional (`/party`, `/src`, `/shared`)
- ✅ Configuración completa de TypeScript (modo estricto)
- ✅ Build tool configurado (Vite)
- ✅ Sistema de estilos (Tailwind CSS)
- ✅ `.gitignore` configurado correctamente (excluye `node_modules`)

### 2. Stack Tecnológico Implementado
- ✅ **Frontend**: Vue 3 (Composition API) + HTMX
- ✅ **Backend**: PartyKit (Producción) / Mock Server (Desarrollo Local)
- ✅ **Validación**: Zod (esquemas base definidos)
- ✅ **Estilos**: Tailwind CSS
- ✅ **Lenguaje**: TypeScript estricto en todo el stack

### 3. Código Base
- ✅ Tipos compartidos (`shared/types.ts`): `GameStatus`, `Player`, `RoomState`
- ✅ Esquemas Zod (`shared/schemas.ts`): Validación de datos
- ✅ Servidor PartyKit básico (`party/server.ts`): Responde "WELCOME"
- ✅ Cliente Vue (`src/App.vue`): UI con indicador de conexión
- ✅ Composable WebSocket (`src/composables/useSocket.ts`): Lógica inteligente (Mock vs Prod)

### 4. Estado Actual del Desarrollo
- ✅ **Frontend corriendo**: `http://localhost:5174` (Vite funcionando)
- ✅ **Backend Local**: Mock Server corriendo en `ws://localhost:1999`
- ✅ **Conexión**: Frontend muestra "Connected" (🟢) y recibe mensajes del mock
- ✅ **CI/CD**: Pipeline de GitHub Actions configurado para deploy automático a PartyKit Cloud

---

## 🛠️ SOLUCIÓN TÉCNICA IMPLEMENTADA (Entorno Híbrido)

### Problema: PartyKit en Windows
PartyKit CLI tiene un bug crítico con rutas de Windows que impide ejecutar el servidor localmente (`ERR_INVALID_URL`).

### Solución: Estrategia "Mock Local, Deploy Cloud"
1.  **Desarrollo Local**: Usamos un servidor WebSocket simple (`ws`) en `party/mock-server.js` que simula el comportamiento de PartyKit.
2.  **Producción**: Desplegamos a PartyKit Cloud usando GitHub Actions, donde corre en un entorno Linux/Edge compatible.
3.  **Cliente Inteligente**: `useSocket.ts` detecta el entorno:
    *   `DEV` -> Conecta a `ws://localhost:1999` (Mock)
    *   `PROD` -> Conecta a `tutifruti-phoenix.partykit.dev` (Cloud)

---

## 🎯 PRÓXIMOS PASOS ESTRATÉGICOS

### FASE 3: Implementar Lobby (Gestión de Salas)
**Objetivo**: Permitir crear/unirse a salas de juego

**Decisiones de Diseño Pendientes**:
1. ¿Las salas son públicas, privadas o ambas?
2. ¿Cuántos jugadores por sala? (mínimo/máximo)
3. ¿Quién puede iniciar la partida? (solo host o votación)
4. ¿Cómo se manejan las desconexiones en el lobby?

**Features a Implementar**:
- [ ] UI del Lobby (HTMX)
- [ ] Crear sala (generar código único)
- [ ] Unirse a sala (por código)
- [ ] Lista de jugadores en sala
- [ ] Sistema de "host" (primer jugador)
- [ ] Botón "Iniciar Partida" (solo para host)

---

### FASE 4: Lógica del Juego (Game Island)
**Objetivo**: Implementar el tablero de juego activo

**Decisiones de Gameplay**:
1. ¿Qué categorías incluimos? (Nombre, Animal, Color, etc.)
2. ¿Cuántas rondas por partida?
3. ¿Tiempo por ronda? (configurable o fijo)
4. ¿Sistema de puntuación? (palabra única = 10pts, repetida = 5pts, etc.)
5. ¿Validación de palabras? (votación entre jugadores o diccionario automático)

**Features a Implementar**:
- [ ] Componente Vue del tablero (`GameView.vue`)
- [ ] Inputs para cada categoría
- [ ] Timer visual
- [ ] Botón "BASTA/STOP"
- [ ] Sistema de validación de palabras
- [ ] Pantalla de resultados por ronda
- [ ] Tabla de puntuaciones final

---

### FASE 5: Estado del Servidor (Server-Authoritative)
**Objetivo**: El servidor mantiene la "Verdad Única"

**Decisiones Arquitectónicas**:
1. ¿Cómo persistimos el estado si el servidor se reinicia?
2. ¿Usamos Durable Objects Storage de Cloudflare?
3. ¿Qué pasa si un jugador se desconecta a mitad de partida?

**Features a Implementar**:
- [ ] `RoomState` completo en servidor
- [ ] Sincronización de estado con clientes
- [ ] Manejo de reconexiones
- [ ] Sistema de turnos/rondas
- [ ] Validación server-side de todas las acciones

---

## 🤔 PREGUNTAS PARA EL ARQUITECTO (GEMINI)

### Estrategia de Desarrollo
1. **¿Prioridades?**
   - Ya tenemos conexión. ¿Empezamos por el Lobby (HTMX) o por el Gameplay (Vue)?

2. **¿Protocolo WebSocket?**
   - Necesitamos definir los tipos de mensajes (`JOIN_ROOM`, `START_GAME`, `SUBMIT_WORD`, etc.).

3. **¿Diseño del Juego?**
   - Definir las reglas básicas para empezar a codificar la lógica en el Mock Server.

---

## 📊 MÉTRICAS DE PROGRESO

### Completado: ~25%
- ✅ Infraestructura: 100%
- ✅ Tipos base: 100%
- ✅ Comunicación Cliente-Servidor: 100% (Híbrida Mock/Cloud)
- ⬜ Lobby: 0%
- ⬜ Gameplay: 0%
- ⬜ Validación: 0%
- ✅ Despliegue: 100% (CI/CD Configurado)

---

## 🎯 RECOMENDACIÓN INMEDIATA

**Siguiente Milestone Sugerido**: **"Lobby Funcional"**

**Objetivo**: Que un usuario pueda poner su nombre y "entrar" a una sala, viendo su nombre en la lista.

**Pasos**:
1. Definir mensaje `JOIN_ROOM` en `shared/types.ts`.
2. Implementar manejo de `JOIN_ROOM` en `party/mock-server.js`.
3. Crear UI básica de Lobby en `App.vue` (o componente separado).

---

## 📁 ESTRUCTURA ACTUAL DEL PROYECTO

```
c:\Users\fuige\tutifruti\
├── party/
│   ├── main.ts          # Entry point PartyKit (Producción)
│   ├── server.ts        # Lógica del servidor (Producción)
│   └── mock-server.js   # Mock server (Desarrollo Local - ACTIVO)
├── src/
│   ├── components/      # (vacío, para componentes Vue)
│   ├── composables/
│   │   └── useSocket.ts # Lógica WebSocket Inteligente
│   ├── App.vue          # Componente raíz
│   ├── main.ts          # Entry point Vue
│   ├── style.css        # Tailwind imports
│   └── vite-env.d.ts    # Type definitions
├── shared/
│   ├── types.ts         # Tipos compartidos
│   └── schemas.ts       # Zod schemas
├── .github/
│   └── workflows/
│       └── deploy.yml   # CI/CD Pipeline
├── public/              # Assets estáticos
├── .env.example         # Variables de entorno ejemplo
├── .gitignore
├── index.html
├── package.json
├── partykit.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```
