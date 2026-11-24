# Cómo contribuir a Lamento

Aquí trabajan al mismo tiempo **personas** y **agentes de IA** (Claude, ChatGPT…). Estas reglas existen para que nadie pise el trabajo de otro.

## 1. Nunca trabajes directo en `main`

`main` es lo que está publicado en GitHub Pages. Todo cambio entra por **Pull Request**.

```bash
git switch main
git pull
git switch -c tu-nombre/lo-que-haces
```

### Nombres de rama

| Quién | Formato | Ejemplo |
|---|---|---|
| Persona | `nombre/tema` | `ana/sonido-pasos` |
| Claude | `claude/tema` | `claude/escondites` |
| ChatGPT / Codex | `chatgpt/tema` | `chatgpt/menu-pausa` |

## 2. Un tema por rama, un tema por PR

Un PR pequeño se revisa en 5 minutos; uno gigante nadie lo revisa. Si tu tarea crece, divídela.

## 3. Toma un Issue antes de empezar

1. Busca un Issue con la etiqueta del hito actual (`M0`, `M1`…), o crea uno.
2. Asígnatelo o comenta «lo tomo» para que nadie más lo haga en paralelo.
3. Menciona el Issue en tu PR: `Cierra #12`.

Etiquetas: `gameplay` · `ia` · `audio` · `arte` · `nivel` · `ui` · `tech` · `bug` · `accesibilidad` · `M0` · `M1` · `M2` · `M3`

## 4. Commits

Mensajes cortos, en español y en presente:

```
Agrega escondites en armarios
Corrige salto doble al caer de plataforma
Ajusta volumen del lamento a media distancia
```

## 5. Antes de abrir el PR

```bash
npm run typecheck
npm run build
npm run dev   # y juega un minuto
```

En la descripción del PR incluye:
- **Qué** cambia y **por qué** (enlaza la sección del GDD si aplica).
- **Cómo probarlo** (qué hacer en el juego para verlo).
- Si lo hizo una IA, **cuál** (y quién lo revisó).

## 6. Revisión

- Otra persona (no quien lo escribió) aprueba antes de hacer merge.
- El código de una IA **siempre** lo revisa una persona.
- Usa **Squash and merge** para que el historial de `main` quede limpio.

## 7. Dónde va cada cosa

- Números de diseño (velocidades, radios, tiempos) → `src/config.ts`. No pongas «números mágicos» en el código.
- Lógica de juego → `World`, `Player`, `Llorona`, `physics/`. **Sin importar Three.js.**
- Dibujo → `src/render/`. Sonido → `src/audio/`. DOM → `src/ui/`.
- Cambios al diseño → actualiza `docs/GDD.md` en el mismo PR.

## 8. Conflictos

Si tu PR tiene conflictos con `main`:

```bash
git switch main && git pull
git switch tu-rama
git merge main
# resuelve, prueba, y sube
```

Si no sabes cómo resolverlo, pide ayuda en el PR antes de borrar el trabajo de alguien.
