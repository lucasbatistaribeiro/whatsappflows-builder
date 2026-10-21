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

## The generated screen is a sheet over a chat

A flow never opens on a blank phone — it slides up over the conversation it was
sent in. `buildScreen` stacks status bar → `chat-header` → `flow-sheet`
(rounded at the top) → `nav-bar`, and the flow's own chrome goes *inside* the
sheet. With `showChat: false` the sheet is the frame itself and you get the old
bare layout.

The sizes are measured off Meta's Flows artwork, not chosen: a 58px header (a
42px photo in 8px of padding), no sliver of wallpaper — the sheet's rounded top
sits against the header — a 40px CTA inset 9px, and a 41px nav bar, which is
what keeps the CTA off the bottom edge. A raised sheet also dims the header
behind it: `SHEET_SCRIM`, black at a third, as an absolutely-positioned
rectangle so it covers the contact's photo too.

**Two frame names are load-bearing**, both read back by `enforceMinHeight` in
`index.ts` when a short screen is padded to the standard phone height:
`flow-sheet` has to absorb the slack first, then `body` inside it absorbs what
is left — that is what keeps the footer pinned to the bottom. Rename either and
the footer floats. The lookup falls back to a direct `body` child when there is
no sheet, which is what chat mode produces.

## Images: decode, don't placeholder

`figma.createImage` wants bytes and the sandbox has no `atob` — use
`figma.base64Decode`. Payloads arrive either as a full data URI (what a file
picker produces) or bare base64 (what Flow JSON uses for `Image.src`), so strip
the `data:…;base64,` prefix either way, and fall back rather than throwing: one
unreadable image must not fail the whole generate. `headerAvatar` in `chrome.ts`
is the worked example. Note the `Image` / `ImageCarousel` components still draw
grey placeholders — that is a gap, not a rule.

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
