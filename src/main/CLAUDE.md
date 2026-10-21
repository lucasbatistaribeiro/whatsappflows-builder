# `src/main` — the Figma sandbox

Bundled to `plugin/code.js`. The `figma` API is available; **the DOM is not**.
`build/tsconfig.main.json` omits the `DOM` lib, so `document.*` or `window.*`
here is a compile error, not a runtime surprise.

Full guide: [`knowledge/CLAUDE.md`](../../knowledge/CLAUDE.md). What follows is
only what bites *in this directory*.

## You cannot verify this code outside Figma

`npm run typecheck && npm run build` is the most that is automatable. Rendering,
layout, prototype wiring — all of it needs **Import plugin from manifest… →
Generate** in a real Design file. Be conservative, and say plainly in your
report what you could not check.

## Auto-layout: never set `layoutAlign` / `layoutGrow`

They are unreliable for nested frames whose parent hugs. Mark the intent with
`markFill(node)` / `markFillV(node)` while building; `applyFills(frame)` resolves
it (setting `layoutSizingHorizontal/Vertical = "FILL"`) in a **pre-order** pass
after the frame is already on the page. A parent must be sized before its
children, which is why the order matters. See BUGFIXES #36.

## Read the active palette at call time

`COLOR` is a Proxy over whichever palette `setPalette(theme)` selected. Never
capture `COLOR.x` at module load — a `const ink = COLOR.textPrimary` at the top
of a file bakes the light theme into every dark-theme run. `src/main/chrome.ts`
takes the ink as an argument for exactly this reason.

## Icons are SVG, and arrive at the wrong size

`figma.createNodeFromSvg` ignores the width/height you asked for often enough
that every icon goes through `iconNode()`, which `rescale`s it to a fixed
height. See BUGFIXES #37/#38.

## `documentAccess: "dynamic-page"` is declared in the manifest

So the synchronous getters **throw**: use `getNodeByIdAsync`, `setReactionsAsync`
and friends. `figma.root.findAll/findOne` additionally require an explicit
`await figma.loadAllPagesAsync()`. `node.findChild` on a node you already have
is fine. Figma's list of what was replaced:
<https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading/>

## One generate = one section

`placeInSection` wraps the run, `embedPayload` hides the source JSON in a locked,
invisible TEXT node, and a run linked to an existing section rebuilds it at the
old one's x/y and removes it — **built first, removed second**, so a failure
mid-build leaves the original standing. The frame named `body` is load-bearing:
`enforceMinHeight` finds it by that name to absorb slack so the footer stays
pinned.

## Fonts

`loadFonts()` must finish before any text node is created. Figma preloads Inter
for plugins, which is why the generator uses it.
