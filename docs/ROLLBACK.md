# 🚨 Manual de Contingencia: Rollback en Producción

Este documento estandariza los procedimientos de emergencia en caso de que un bug crítico evada nuestra red de seguridad (`Quality Gate` + `Vitest`) y llegue a producción (PartyKit o Cloudflare Pages), afectando a usuarios reales.

## 🔴 Criterios para iniciar un Rollback

**No se debe intentar "arreglar en caliente" (hotfix directo a main) si la interrupción es total**.
Ejecutar este manual inmediatamente si:
1. Sentry reporta una avalancha de excepciones no controladas afectando el `ErrorBoundary`.
2. Las salas de PartyKit crashean al intentar instanciar los motores de juego.
3. La interfaz de usuario colapsa con la pantalla en blanco (White Screen of Death) en dispositivos específicos.

---

## 🛠️ Procedimiento de Rescate (Git)

El objetivo es devolver la rama `main` al último estado estable conocido, forzando a GitHub Actions a reconstruir y redesplegar ese código saludable.

### Paso 1: Identificar el SHA Saludable
Ve a la pestaña [Actions](https://github.com/) en el repositorio de GitHub y busca la última ejecución en verde del workflow **"Operation Iron Shield (Deploy)"** que sabemos que funcionaba correctamente. Copia el SHA del commit asociado (ej. `a1b2c3d4`).

### Paso 2: Revertir los cambios defectuosos (Método Seguro)

Abre tu terminal, asegúrate de tener los últimos cambios en `main` y ejecuta un `git revert`:

```bash
# Actualizar tu rama local
git pull origin main

# Si solo es el último commit el que rompió la app:
git revert HEAD

# Si fueron varios commits problemáticos, revierte el rango:
git revert <sha-estable>..HEAD
```

Git creará un nuevo commit que hace exactamente lo contrario a los commits defectuosos, preservando el historial criptográfico.

### Paso 3: Disparar el Pipeline
Haz push directo del commit de rollback a la rama principal:

```bash
git push origin main
```

> [!TIP]
> **Aceleración por Caché:** Dado que este es un rollback, el ecosistema de node_modules en GitHub Actions usará nuestro `actions/cache@v4` inyectado en el Sprint H10. El Quality Gate se saltará la descarga de internet, acelerando la restauración del servicio.

---

## 🔎 Verificación Post-Rollback

1. **GitHub Actions**: Confirma que el nuevo job completó la fase `Deploy to PartyKit` exitosamente.
2. **Dashboard de PartyKit**: Ingresa a `https://dash.partykit.io` y verifica que el Worker se haya actualizado (revisa el timestamp del último deploy).
3. **Prueba de Humo**: Abre la URL en incógnito, crea una sala e invita a un bot/segunda pestaña para validar que el colapso inicial desapareció.

## 🛑 Notas Críticas de Seguridad
- **JAMÁS** utilices `git push --force` para borrar el historial en `main`. Alterar la historia imposibilita las auditorías forenses posteriores y corrompe los repositorios locales del resto del equipo.
- El servidor es autoritativo (`isHost`). Si el rollback involucra cambios en el formato de estado (`StateVersion`), las salas activas obsoletas serán enviadas al Home mediante el flujo de desincronización forzada automáticamente.
