# 🌊 Lamento

> Metroidvania de terror 2.5D para navegador · Three.js + Web Audio
> *«Si la escuchas lejos… ya está aquí.»*

Eres Itzel. Algo te busca junto al río. Su lamento **miente**: se oye **más fuerte cuanto más lejos está** y se apaga cuando la tienes encima. El diseño completo está en [`docs/GDD.md`](docs/GDD.md).

**▶ Jugar:** https://jonathan-bello.github.io/Lamento-game/ (usa audífonos 🎧)

## Estado: prototipo M0 (sala gris)

| Backlog M0 (GDD §14.2) | Dónde vive |
|---|---|
| ✅ Proyecto Vite + TypeScript + Three.js | `package.json`, `vite.config.ts` |
| ✅ Escena base con cámara 2.5D y niebla azul | `src/render/SceneBuilder.ts`, `src/render/CameraRig.ts` |
| ✅ Controlador del jugador (caminar, correr, salto variable, coyote time, jump buffer, aliento, ruido) | `src/player/Player.ts` |
| ✅ Colisiones AABB con suelo y plataformas de un sentido | `src/physics/aabb.ts` |
| ✅ La Llorona: Errante, Acecho, Persecución, Búsqueda, Atrapar + teletransporte por niebla | `src/enemy/Llorona.ts` |
| ✅ AI Director mínimo (respiro y acercamiento) | `src/enemy/Director.ts` |
| ✅ Mezclador de audio con volumen **inverso** a la distancia | `src/audio/LamentoMixer.ts` |
| ✅ Silenciamiento del ambiente al acercarse | `src/audio/LamentoMixer.ts` |
| ✅ Captura y reaparición en la última ofrenda | `src/core/World.ts`, `src/core/Game.ts` |
| ➕ Extra: modo visual del lamento, subtítulos con dirección, panel de depuración | `src/ui/Hud.ts` |

Todo el audio es **sintetizado** (no hay archivos todavía): el lamento es una voz con formantes, el ambiente son grillos y agua, y el corazón son golpes graves.

## Controles

| Acción | Teclado | Mando |
|---|---|---|
| Moverse | `A` / `D` o flechas | Stick izquierdo / cruceta |
| Saltar (mantén para más altura) | `Espacio`, `W` o `↑` | `A` / `✕` |
| Correr | `Shift` | `RT` / `R2` |
| Pausa | `Esc` | `Start` |
| Modo visual del lamento | `V` | — |
| Subtítulos | `C` | — |
| Panel de depuración | `I` | — |

## Correr en tu computadora

Necesitas [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
npm run dev        # servidor local con recarga en caliente
npm run build      # genera dist/
npm run typecheck  # revisa tipos de TypeScript
```

## Arquitectura en 30 segundos

```
src/
├── config.ts        ← TODOS los números de diseño (velocidades, radios, umbrales)
├── core/
│   ├── World.ts     ← simulación pura (sin Three.js): jugador + Llorona + Director
│   ├── Game.ts      ← game loop: física a paso fijo 60 Hz + render interpolado
│   └── Input.ts     ← teclado + Gamepad API
├── physics/aabb.ts  ← colisiones 2D en el plano XY
├── player/          ← Itzel
├── enemy/           ← La Llorona y el AI Director
├── audio/           ← el Lamento Invertido (fórmula del GDD §4.2)
├── render/          ← escena 3D, personajes, cámara 2.5D
├── world/level.ts   ← la sala gris (datos del nivel)
└── ui/              ← HUD y estilos
```

**Regla clave:** la lógica del juego (`World`, `Player`, `Llorona`, `aabb`) no importa Three.js. El 3D solo *dibuja* lo que la simulación decide. Así se puede probar la lógica sin navegador y cambiar el arte sin romper la jugabilidad.

¿Quieres ajustar el juego? Empieza por `src/config.ts`. Para ver qué pasa por dentro, presiona `I` mientras juegas.

## Trabajo en equipo

Este repositorio lo trabajan personas y agentes de IA (Claude, ChatGPT) al mismo tiempo. Antes de contribuir lee [`CONTRIBUTING.md`](CONTRIBUTING.md). Si eres un agente de IA, lee también [`AGENTS.md`](AGENTS.md).

Cada push a `main` se publica automáticamente en GitHub Pages (`.github/workflows/deploy.yml`).
