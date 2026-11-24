# Instrucciones para agentes de IA

Este archivo lo leen Claude, ChatGPT/Codex y cualquier otro agente que trabaje en el repositorio. Las personas también lo pueden leer: aquí está el «contrato» con las IAs.

## Contexto

- **Proyecto:** *Lamento*, metroidvania de terror 2.5D para navegador. Diseño completo en `docs/GDD.md`; léelo antes de proponer mecánicas.
- **Stack:** TypeScript + Vite + Three.js + Web Audio API. Sin frameworks de UI.
- **Equipo:** personas (docente y alumnos) y varios agentes de IA trabajando en paralelo.
- **Idioma:** código en inglés; comentarios, textos del juego, commits, PRs e Issues en **español**.

## Reglas obligatorias

1. **Nunca hagas push a `main`.** Crea una rama `claude/<tema>` o `chatgpt/<tema>` y abre un Pull Request.
2. **Una tarea por PR.** No mezcles refactors con funciones nuevas.
3. **Revisa los Issues y los PRs abiertos** antes de empezar, para no duplicar trabajo de otra persona o agente.
4. **No reescribas archivos completos** que otro está tocando en un PR abierto; haz cambios mínimos.
5. **La lógica no importa Three.js.** `src/core/World.ts`, `src/player/`, `src/enemy/` y `src/physics/` deben poder ejecutarse en Node sin navegador.
6. **Los números de diseño van en `src/config.ts`**, con un comentario que cite la sección del GDD (`§5.2`).
7. **No agregues dependencias** sin explicarlo en el PR. Preferimos código propio y pequeño.
8. **Respeta el GDD.** Si tu cambio contradice el diseño, dilo en el PR y actualiza `docs/GDD.md`.
9. **Antes de abrir el PR:** `npm run typecheck` y `npm run build` deben pasar.
10. **Describe el PR** con: qué cambia, por qué, cómo probarlo en el juego y qué agente lo hizo.

## Pilares que no se negocian (GDD §2)

- El silencio es peligro: el audio es mecánica, no decoración.
- Huir es jugar: no hay combate ni armas.
- Folclor con respeto: nada de gore ni caricaturas.
- Azul y frío: el ámbar (`#E8A84A`) solo para seguridad y guía.

## Mapa rápido del código

| Archivo | Responsabilidad |
|---|---|
| `src/config.ts` | Constantes de diseño |
| `src/core/World.ts` | Simulación pura y eventos |
| `src/core/Game.ts` | Game loop, conecta simulación ↔ render ↔ audio ↔ HUD |
| `src/player/Player.ts` | Movimiento, salto, aliento, ruido |
| `src/enemy/Llorona.ts` | Máquina de estados de la IA |
| `src/enemy/Director.ts` | Control de tensión |
| `src/audio/LamentoMixer.ts` | Lamento Invertido (`lamentoMix()` = fórmula §4.2) |
| `src/render/*` | Escena 3D, personajes, cámara |
| `src/world/level.ts` | Datos del nivel |
| `src/ui/*` | HUD y estilos |

## Siguiente hito: M1 (GDD §14.2)

Cargador de salas desde Tiled · transiciones entre salas · ofrendas con guardado en `localStorage` · habilidad Barrida · escondites · post-procesado (bloom, viñeta, escarcha) · HUD de aliento.
