# `src/ui` — the plugin UI (an iframe)

Bundled and inlined into `plugin/ui.html`. The DOM is available; **the `figma`
API is not**. `build/tsconfig.ui.json` sets `types: []`, so `figma.*` here is a
compile error. Talk to the sandbox through `bridge.ts` only.

Full guide: [`knowledge/CLAUDE.md`](../../knowledge/CLAUDE.md). What follows is
only what bites *in this directory*.

## You can verify this code — do it

The UI runs standalone outside Figma (the `--figma-color-*` vars fall back to
themed defaults):

```bash
npm run build && (cd plugin && python -m http.server 8791)
```

Then drive `http://localhost:8791/ui.html` with DevTools/JS. You can fake the
sandbox end of the channel by posting to the page:
`window.postMessage({ pluginMessage: { type: "prefs", prefs: {…} } }, "*")`, and
capture what the UI sends by listening for `message`. For a full pass, hand it
to the **`plugin-ui-tester`** subagent.

The browser cannot emulate a narrow Figma panel reliably — test responsiveness
by reading computed styles and clamping logic, not by resizing the window.

## Two visual languages, do not mix them

- **Plugin chrome** (`.comp`, `.dd`, `.topbar`, the menu…) follows Figma: tokens
  mapped from `--figma-color-*`, and a **14px minimum** for text.
- **`wa-*` / `wa-c-*`** is the WhatsApp mockup. It uses WhatsApp's *real* sizes
  and colours, which are often below 14px. Never restyle it to match the plugin
  chrome — the whole point is that it looks like WhatsApp. Its tokens come from
  `src/main/theme.ts` via CSS vars, so the mockup and the generated frames stay
  in step.

## Re-render only what has to change

A value edit must not rebuild the DOM it is being typed into: `renderComposer`
and `renderComponentList` empty their host, so re-rendering on a keystroke
removes the focused input and the caret lands on `<body>`. Both sides already
have the split — `softSync` / `structuralSync` in `ui.ts`, `ComposerSync` in
`chatComposer.ts`. Value change → `soft`. Fields appear or disappear →
`structural`. See the first entry in BUGFIXES.

## The dropdown must stay `position: fixed`

`dropdown.ts` replaces the native `<select>` because the OS popup can't be
themed. Its list is appended to `<body>`; a statically positioned popup causes a
transient scrollbar that mis-measures the trigger width. See BUGFIXES #28.

## i18n

Static text: `data-i18n`, `data-i18n-ph`, `data-i18n-title`, filled by
`applyI18n`. JS-built text: `t(key, params)` with `{n}` slots. English is the
source. **Component type names stay in English** — they mirror the Flow JSON
spec. Authored *content* (templates, the sample flow) is a different thing and
lives in `src/model`, keyed by language.

Watch the order: `applyI18n` resets anything with a `data-i18n` attribute, so a
label the code computes (the Generate button, which reads "Update" while a
section is linked) has to be repainted *after* it.

## Icons

Local copy of Lucide in `icons.ts` — no package, no network (the manifest
declares `networkAccess: ["none"]`, so a CDN would simply be blocked). Add the
path data to that file rather than reaching for a dependency.
