# Working on this repo (AI agent guide)

A Figma plugin that turns the WhatsApp Flows Playground into a visual builder:
compose flow screens, edit the Flow JSON live, preview a WhatsApp phone mockup,
and **Generate** navigable, WhatsApp-styled frames in Figma. See `README.md` for
the user-facing overview and `docs/BUGFIXES.md` for a log of past bugs + fixes
(read it — several are non-obvious Figma/auto-layout traps). To reconcile the
project with changes to Meta's WhatsApp Flows spec (new components, limits,
versions, validation rules), follow `docs/META_SYNC.md` — it maps each Meta doc
to the exact code and gives a step-by-step routine.

## Commands

```bash
npm install
npm run build      # esbuild.mjs -> dist/code.js (main) + dist/ui.html (UI inlined)
npm run watch      # rebuild main on change (re-run for UI changes)
npm run typecheck  # tsc --noEmit (strict; noUnusedLocals)
```

Never edit `dist/` — it's generated. Edit `src/`, then `npm run build`.

## Two runtime contexts (don't mix them)

- **`src/main/*` = the Figma sandbox** (the `figma` API, no DOM). Bundled to
  `dist/code.js`. Builds the generated screens.
- **`src/ui/*` = the plugin UI** (an iframe: DOM, no `figma` API). Bundled and
  inlined into `dist/ui.html`. This is the builder interface.
- They talk only via `postMessage`; the typed contract is `src/shared/messages.ts`.
- `src/model/*` is pure (no `figma`, no DOM) and imported by both sides — keep it
  that way (e.g. `validate.ts` returns message *keys*, not translated strings).

## How to verify changes

- **UI changes are verifiable outside Figma.** Serve the built UI and open it in a
  browser — it runs standalone (Figma's `--figma-color-*` vars fall back to the
  themed defaults):
  ```bash
  (cd dist && python -m http.server 8791)   # then open http://localhost:8791/ui.html
  ```
  Drive it with DevTools/JS. The browser can't reliably emulate a narrow viewport,
  so test responsiveness by reading computed styles / clamping logic, not by resizing.
- **Generator changes (`src/main/*`) can only be verified inside Figma** — there is
  no browser/CI path for them. `typecheck` + `build` is the most you can check
  automatically; a real run (Import plugin from `manifest.json` → Generate) is
  required to confirm. Be conservative and say so.
- **Model layer** can be unit-tested by bundling a throwaway script with esbuild
  `--platform=node` and running it with node (the model has no figma/DOM deps).

## Critical conventions & gotchas

- **Auto-layout "fill" in the generator:** do NOT rely on `layoutAlign = "STRETCH"`
  / `layoutGrow` — it's unreliable for nested frames whose parent hugs. Instead
  mark intent with `markFill` / `markFillV` (`src/main/nodes.ts`) during build, and
  `applyFills(frame)` resolves it (sets `layoutSizingHorizontal/Vertical = "FILL"`)
  in a pre-order pass after the frame is on the page. See BUGFIXES #36.
- **The WhatsApp mockup must look like WhatsApp.** The live preview classes (`wa-*`
  in `ui.html`) and the generated screens use *real* WhatsApp sizes/colors — don't
  restyle them to match the plugin chrome. Plugin-chrome text has a **14px minimum**;
  `wa-*` does not.
- **Theme:** tokens in `ui.html` map to `--figma-color-*` with light/dark fallbacks;
  a manual toggle sets `:root[data-theme="light|dark"]`. The generator's own tokens
  live in `src/main/theme.ts` and also feed the preview via CSS vars (single source).
- **i18n (`src/ui/i18n.ts`):** static text uses `data-i18n` / `data-i18n-ph`
  (filled by `applyI18n`); JS-built text uses `t(key, params)` with `{n}` slots.
  The validator emits `{key, params}` and the UI translates it. **Component type
  names stay in English** (they mirror the Flow JSON spec). English is the source.
- **Custom dropdown (`src/ui/dropdown.ts`)** replaces native `<select>` for full
  theming. It must stay `position: fixed` in CSS (a static popup causes a transient
  scrollbar that mis-measures width — BUGFIXES #28). Width is matched to the trigger;
  `searchable` adds a filter box.
- **Icons:** local, offline copy of Lucide in `src/ui/icons.ts` (no package).
  Static: `data-icon` + `applyIcons`. JS: `iconEl(name, size)`. In the generator,
  status-bar icons come from `figma.createNodeFromSvg` and are `rescale`d to a
  fixed height (BUGFIXES #37/#38).
- **Preferences** (theme + language) persist via `figma.clientStorage` through the
  message channel (`savePrefs` / `prefs`).
- **Validation rules** live in `src/model/validate.ts` (pure). Add a rule there and
  its message key/text in `i18n.ts`.

## Map

```
src/model/   flowTypes, palette, templates, sample, validate   (pure, shared)
src/shared/  messages                                          (UI <-> main contract)
src/main/    theme, fonts, nodes, chrome, components, screen, routing, index  (Figma sandbox)
src/ui/      ui.html, ui.ts, preview, propEditor, dropdown, icons, i18n       (plugin UI)
```

## Workflow

Land changes as small, focused PRs (squash-merged); keep `typecheck` + `build`
green. Update `docs/BUGFIXES.md` when you fix a non-obvious bug.
