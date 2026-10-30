# Working on this repo (AI agent guide)

A Figma plugin that turns the WhatsApp Flows Playground into a visual builder:
compose flow screens, edit the Flow JSON live, preview a WhatsApp phone mockup,
and **Generate** navigable, WhatsApp-styled frames in Figma. See `README.md` for
the user-facing overview and `knowledge/BUGFIXES.md` for a log of past bugs + fixes
(read it — several are non-obvious Figma/auto-layout traps). To reconcile the
project with changes to Meta's WhatsApp Flows spec (new components, limits,
versions, validation rules), follow `knowledge/META_SYNC.md` — it maps each Meta doc
to the exact code and gives a step-by-step routine. Accepted-but-unstarted work
lives in `knowledge/BACKLOG.md` — check it before planning something new, and add
an entry there instead of dropping an idea. `knowledge/CHAT_UI.md` is the design
spec for chat mode (generating WhatsApp conversation screens), in progress, and
`knowledge/CHAT_PATTERNS.md` documents the interactive message types (reply
buttons, the list menu, flows, templates) with their official shapes and limits.

## Commands

```bash
npm install
npm run build      # build/esbuild.mjs -> plugin/code.js (main) + plugin/ui.html (UI inlined)
npm run watch      # rebuild main on change (re-run for UI changes)
npm run typecheck  # both projects: typecheck:main + typecheck:ui (strict)
npm run gallery    # build/gallery.html: every new-chrome component, light + dark
```

`plugin/` is the deliverable: after a build it holds only `manifest.json`,
`code.js` and `ui.html` — the three files Figma loads. Keep it that way; anything
used to develop or build the plugin belongs outside it (`src/`, `build/`, `knowledge/`).

Never edit `plugin/code.js` or `plugin/ui.html` — they're generated. Edit `src/`,
then `npm run build`.

## Two runtime contexts (don't mix them)

- **`src/main/*` = the Figma sandbox** (the `figma` API, no DOM). Bundled to
  `plugin/code.js`. Builds the generated screens.
- **`src/ui/*` = the plugin UI** (an iframe: DOM, no `figma` API). Bundled and
  inlined into `plugin/ui.html`. This is the builder interface.
- They talk only via `postMessage`; the typed contract is `src/shared/messages.ts`
  (**types only** — the UI's send helper is `src/ui/bridge.ts`, where `parent` exists).
- **The split is enforced by the compiler, not by discipline.** `build/tsconfig.main.json`
  omits the `DOM` lib, so `document.*` in `src/main` fails to compile;
  `build/tsconfig.ui.json` sets `types: []`, so `figma.*` in `src/ui` fails to
  compile. `npm run typecheck` runs both. Both include `src/model` and
  `src/shared`, which is what keeps those two layers pure.
- `src/model/*` is pure (no `figma`, no DOM) and imported by both sides — keep it
  that way (e.g. `validate.ts` returns message *keys*, not translated strings).
  The one rule no compiler enforces: the model must never import from `src/ui`
  or `src/main`.
- Each of the three has a **`CLAUDE.md` of its own** — `src/main`, `src/ui`,
  `src/model` — carrying the rules and traps specific to it. This file stays the
  map; those are the fine print, and they load when you work in that directory.

## How to verify changes

- **UI changes are verifiable outside Figma.** Serve the built UI and open it in a
  browser — it runs standalone (Figma's `--figma-color-*` vars fall back to the
  themed defaults):
  ```bash
  (cd plugin && python -m http.server 8791)   # then open http://localhost:8791/ui.html
  ```
  Drive it with DevTools/JS. The browser can't reliably emulate a narrow viewport,
  so test responsiveness by reading computed styles / clamping logic, not by resizing.
- **Generator changes (`src/main/*`) can only be verified inside Figma** — there is
  no browser/CI path for them. `typecheck` + `build` is the most you can check
  automatically; a real run (Import plugin from `plugin/manifest.json` → Generate) is
  required to confirm. Be conservative and say so.
- **Model layer** can be unit-tested by bundling a throwaway script with esbuild
  `--platform=node` and running it with node (the model has no figma/DOM deps).
- For a full UI pass, hand it to the **`plugin-ui-tester`** subagent
  (`.claude/agents/plugin-ui-tester.md`): it builds, serves `plugin/`, drives the
  real UI in a browser (import/export/Generate/preview/menu/cards, en + pt) and
  reports measured results. It encodes the non-obvious techniques — faking the
  sandbox over `postMessage`, injecting a File to test import, and why a hidden
  browser pane makes animations look broken.

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
- **Theme:** the chrome's tokens live in `src/ui/tokens.css` (inlined into
  `ui.html` by the build), a mirror of the Figma file's Chrome, Typography and
  Scale variable collections with light/dark values. Colour and type follow
  **Material 3 system-token names** (`--md-sys-color-*`, `--md-sys-typescale-*`;
  `knowledge/MATERIAL_TOKENS.md`), the scale keeps `--ui-*` (`knowledge/NEW_UI.md`
  has the knob). Light/dark follows `prefers-color-scheme`; a manual toggle
  sets `:root[data-theme="light|dark"]`. The generator's own tokens live in
  `src/main/theme.ts` and also feed the preview via CSS vars (single source).
- **i18n (`src/ui/i18n.ts`):** static text uses `data-i18n` / `data-i18n-ph` /
  `data-i18n-title` (filled by `applyI18n`); JS-built text uses `t(key, params)`
  with `{n}` slots. The validator emits `{key, params}` and the UI translates it.
  **Component type names stay in English** (they mirror the Flow JSON spec).
  English is the source.
- **Authored content follows the language too** — `templates(lang)` and
  `sampleFlow(lang)` (`src/model/*`, locale type in `src/model/lang.ts`) return
  the starter flows written in the plugin's language; the picker rebuilds on a
  language change. Their copy lives beside them, not in `i18n.ts`, which is the
  chrome's dictionary. **What is never translated is anything the Flow JSON
  refers to by name**: screen ids, input `name`s, `data-source` ids, `data`
  schema keys and `${form.*}` / `${data.*}` bindings. Translating those breaks
  the references and changes nothing anyone reads — the regression test is that
  the en and pt flows are byte-identical once the copy is stripped.
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

`plugin/` is the shippable plugin only; source, tooling and knowledge sit beside it.

```
plugin/        manifest.json + code.js + ui.html (the last two generated, gitignored)
src/
  model/       flowTypes, palette, templates, sample, validate, lang (pure, shared)
  shared/      messages                                          (UI <-> main contract)
  main/        theme, fonts, nodes, chrome, components, screen, routing, index  (Figma sandbox)
  ui/          ui.html, ui.ts, bridge, preview, propEditor, dropdown, icons, i18n (plugin UI)
               tokens.css + chrome.css + components.ts: the new chrome (NEW_UI.md)
               each of those three carries its own CLAUDE.md with the rules
               that bite there — the compiler-enforced split, the traps, how
               to verify. They load when you open files in that directory.
build/         esbuild.mjs (paths resolve from the file, not the cwd) + three
               tsconfigs: base, main (no DOM), ui (no figma); gallery.ts/.mjs
               render every new-chrome component (`npm run gallery`)
knowledge/     docs to read: this file, BUGFIXES.md, META_SYNC.md, BACKLOG.md,
               CHAT_UI.md, CHAT_PATTERNS.md, NEW_UI.md (the rail + panel chrome),
               MATERIAL_TOKENS.md (the M3 colour + type token names)
.claude/agents/ runnable subagent definitions — not docs (see plugin-ui-tester)
.claude/skills/ invocable procedures: release (cut a tagged release + verify the
               published zip), meta-sync (reconcile with Meta's spec)
CLAUDE.md      root pointer here (agent tooling looks for it there); AGENTS.md too
```

`knowledge/` and `.claude/` are different things: the first is prose you read,
the second holds things you *run* — subagents and skills. `.claude/agents/` is a fixed path — the
runtime only discovers subagents there — so don't "tidy" it into `knowledge/`.

## Workflow

Land changes as small, focused PRs (squash-merged); keep `typecheck` + `build`
green. Update `knowledge/BUGFIXES.md` when you fix a non-obvious bug, and
`knowledge/BACKLOG.md` when work is deferred or a backlog entry ships.
