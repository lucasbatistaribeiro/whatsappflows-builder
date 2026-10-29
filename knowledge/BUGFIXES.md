# Bug fixes

A log of bugs found while hardening the plugin UI, with the root cause and the
fix for each. Newest first. Links point to the merged PR.

**Read the entries for the area you are about to touch** — several are
non-obvious traps that cost a day to find and a line to fix. The index is by
area so you don't have to read all of it.

| Area | Entries worth reading first |
|---|---|
| **Figma auto-layout** (`src/main/nodes.ts`) | [full-width fills didn't apply](#generated-figma-layout-was-broken-full-width-fills-didnt-apply--36) — why `markFill`/`applyFills` exists instead of `layoutAlign` |
| **Generated chrome** (`src/main/chrome.ts`) | [status bar ~115px tall](#generated-status-bar-was-115px-tall--38) · [broken block glyphs](#generated-status-bar-used-broken-block-glyphs--37) — SVG icons need `rescale` |
| **Sections & round-trip** (`src/main/index.ts`) | [a generated conversation cried "invalid Flow JSON"](#selecting-a-generated-conversation-cried-invalid-flow-json) · [NavigationList rows didn't navigate](#navigationlist-rows-didnt-navigate-in-the-generated-prototype) |
| **Re-render & focus** (`src/ui/*`) | [composer lost focus on every keystroke](#chat-composer-lost-focus-on-every-keystroke) — the `soft` / `structural` split · [cards never actually collapsed](#chat-cards-never-actually-collapsed) |
| **Dropdown** (`src/ui/dropdown.ts`) | [list width mismatch](#dropdown-list-width-didnt-match-the-combobox--28) · [not responsive](#dropdown-not-responsive-on-narrow-windows--27) · [closed while scrolling](#dropdown-closed-when-scrolling-inside-its-list--25) |
| **Preview fidelity** (`src/ui/preview.ts`) | [inconsistent phone size](#inconsistent-preview-phone-size-across-screens--23) · [phone proportion](#preview-phone-proportion--status-bar--22) |
| **Spec conformance** (`src/model/validate.ts`) | [missed static-validation errors](#validator-missed-several-static-validation-errors-meta-rejects-on-publish) · [exported JSON failed to import](#exported-flow-json-could-fail-to-import-into-the-playground) · [`Form`-wrapped flows](#flows-that-wrap-components-in-a-form-werent-recognized) |
| **Robustness** | [crashes on malformed input](#front-end-crashes-on-malformed-flow-input--12) |
| **Setup** | [Figma won't import on a fresh clone](#figma-fails-to-import-the-plugin-on-a-fresh-clone) — it's a missing build, not a bug |

---

## The dropdown threw on window resize instead of closing

**Symptom.** With a dropdown open, resizing the plugin window left the list
floating where it was and logged an uncaught `Failed to execute 'contains' on
'Node'`. Found by the UI tester during the new-chrome pass; it predates it.

**Root cause.** `window.addEventListener("resize", onScroll)` reused the scroll
handler, whose first line is `list.contains(e.target as Node)` — written to let
the user scroll *inside* the list without closing it. A resize event's target
is `window`, which is not a Node, so the check threw before `close()` ran.

**Fix.** A resize has nothing inside the list to exempt, so it gets its own
one-line handler that closes unconditionally (`src/ui/dropdown.ts`).

---

## Selecting a generated conversation cried "invalid Flow JSON"

**Symptom.** Clicking a section produced by chat mode popped an error toast:
*This section's embedded Flow JSON is invalid.* Nothing was wrong with it.

**Root cause.** Both modes embed their payload in a hidden TEXT node with the
same name (`flow.json - do not delete`), so `readEmbeddedFlow` picked up the
chat payload too. `JSON.parse` succeeded, `screens[]` was missing — and the
reader fell through to the "invalid" branch meant for a hand-mangled flow. It
declined the section correctly; it just shouted while doing it.

**Fix.** Separate the three outcomes: a parse failure or a shapeless object is
still an error, a `screens[]` array is still imported, and a payload carrying a
`mode` tag (chat mode writes `{ mode: "chat", thread }`) is another generator's
and is declined in silence.

---

## NavigationList rows didn't navigate in the generated prototype

**Symptom.** With "Interactive" on, every generated screen was clickable except
a NavigationList: its rows were inert frames.

**Root cause.** `buildScreen` read navigation targets with `navTargetOf(c)`,
which only looks at the component's own `on-click-action`. A NavigationList
doesn't work that way — the editor (`navItemsEditor`) and the validator both put
one `on-click-action` on each entry of `list-items`. So the component had no
target, no reaction was created, and nothing was wired.

**Fix.** `renderComponent` takes an optional `NodeLink[]` collector; the
NavigationList renderer pushes one `{ node: row, target }` per item, since only
it knows which Figma node a row became. `buildScreen` adds those to its
`navTargets` alongside the component-level one, and `wireNavigation` gives each
row its own reaction. The collector is threaded through If/Switch branches too.

---

## Chat composer lost focus on every keystroke

**Symptom.** Typing in any field of a message card in the chat composer (text /
caption, button label, list CTA, row title or description, time, the media
fields, the quoted reply) accepted exactly one character: the caret jumped to
`<body>` and the next keystroke went nowhere.

**Root cause.** Every editor in `chatComposer.ts` was handed a single `redraw`
callback and called it from `oninput`. `redraw` is `renderComposer(...)`, which
starts with `host.innerHTML = ""` — so each character tore down the focused
input and built a new one. The Flows side had already solved this: `ui.ts`
splits `softSync` (sync + preview, keeps the DOM) from `structuralSync`
(rebuild the cards), and the composer's own contact fields were correct because
they called `onChange` rather than `redraw`.

**Fix.** The same split, as a `ComposerSync { soft, structural }` threaded
through the editors. Value edits call `soft` (preview only); only edits that add
or remove fields — add/remove button or row, message type, direction,
interactive kind, the quoted-reply and sheet-open toggles — call `structural`.
The collapsed card summary used to refresh for free with the re-render, so each
card wraps `soft` to patch its own `.chat-summary` in place.

---

## Chat cards never actually collapsed

**Symptom.** A message card in the chat composer looked collapsible — the
`collapsed` class flipped, the chevron flipped — but the body stayed fully
visible. Collapsing did nothing you could see.

**Root cause.** The collapse animation lives on a wrapper: `.comp-body-wrap` is a
grid that goes `grid-template-rows: 1fr` → `0fr`, and the hiding rule is
`.comp.collapsed .comp-body-wrap`. The Flows list wraps its editor in that div;
the chat composer appended `.comp-body` straight into the card, so the rule had
nothing to match and the body was never hidden. A collapsed chat card measured
693px against a Flows card's 49px.

**Fix.** Wrap the body in `.comp-body-wrap`, as the Flows list does.

**Why it wasn't caught earlier.** Every assertion about collapsing measured
`classList.contains("collapsed")` — the *mechanism* — and the class was being set
correctly all along. Nothing measured the outcome. Asserting the height instead
would have failed on the first run.

**Second trap in the same area.** Re-measuring after the fix showed the body still
at 0 after clicking to expand, which looked like the fix hadn't worked. It had:
`grid-template-rows` is transitioned, and with `document.hidden` true the pane
doesn't advance CSS transitions, so a wall-clock wait measures nothing. Killing
transitions and measuring end states gave the real answer (49.2px collapsed,
701.4px expanded).

## Both tab rows rendered at once in Flows mode

**Symptom.** Chat mode got its own `Compose / Preview` tab row. In Flows mode both
rows showed — the Flows tabs *and* the chat tabs, stacked.

**Root cause.** A specificity tie decided by source order. The rule hiding the
chat row was `.chat-tabs { display: none }`, written next to the other top-bar
rules near the top of the stylesheet. `.tabs { display: flex }` comes further down
and matches the same element (`class="tabs chat-tabs"`). Both are 0,1,0, so the
later one wins — `display: flex` — and the row was never hidden. In chat mode it
looked fine, because `body.chat-mode .chat-tabs` is 0,2,0 and outranks both, which
is exactly why the bug only showed in the *other* mode.

**Fix.** Move the mode rules to sit **after** `.tabs`, so source order works in
their favour. Bumping specificity would also work, but ordering keeps the rules
next to what they override.

**Lesson.** When a `display` rule "doesn't apply", check for another rule matching
the same element at equal specificity before assuming the selector is wrong — and
test the state where the override *isn't* in play, since that's where the tie
surfaces.

## Figma fails to import the plugin on a fresh clone

**Symptom.** **Plugins → Development → Import plugin from manifest…** errors out
on a freshly cloned repo, before the plugin ever runs.

**Root cause.** Not a code bug — a missing build. `plugin/manifest.json` points at
`plugin/code.js` and `plugin/ui.html`, but those two bundles are gitignored (as is
`node_modules/`), so a fresh clone has the manifest and no bundles. Figma resolves
the manifest's `main`/`ui` paths at import time and fails when the files don't
exist.

**Fix.** Run the build before importing:

```bash
npm install
npm run build      # generates plugin/code.js + plugin/ui.html
```

Then import `plugin/manifest.json` again. Remember the two bundles are generated:
after any `src/` edit you must rebuild and reload the plugin, and `npm run watch`
only rebuilds the main bundle — **UI changes need a manual `npm run build`**.

**If the error persists,** it's a different failure with a different shape:
- *"Editor type not supported"* — the manifest declares `"editorType": ["figma"]`,
  so the plugin only opens in a Design file (not FigJam or Slides).
- *A blank/grey panel or a runtime stack* — that's a real bug, not the import;
  check **Plugins → Development → Open console**.

---

## Flows that wrap components in a `Form` weren't recognized

**Symptom.** Importing a real Meta Flow JSON (e.g. a data-endpoint RSVP flow)
showed every screen as a single unrecognized `[Form]` component — none of the
actual TextInputs / Images / selectors appeared in Build, Preview, or Generate.

**Root cause.** The builder's model is flat: it read `screen.layout.children`
directly as the component list. Data-endpoint flows (and any Flow JSON <4.0)
wrap all components in a single `Form` container:
`layout.children = [ { type: "Form", children: [ ...real components... ] } ]`.
`Form` wasn't in the model, so the plugin saw one unknown node per screen and
never descended into `Form.children`. Secondary crash risk: those flows use
dynamic bindings (`"data-source": "${data.sessions}"`, `"visible": "${…}"`),
and code that iterated `data-source` as an array would throw on a string.

**Fix.** Introduced three shared, pure helpers in `flowTypes.ts` so the UI and
the Figma generator agree on how to read flows:
- `screenChildren(screen)` — returns the effective component list, descending
  into a single `Form` container when present (returns the **live** array, so
  edits write back into the Form and the `Form` is preserved on export). Flat
  flows are returned unchanged — a no-op.
- `dataSourceOf(c)` — returns `data-source` as an array, or `[]` when it's a
  binding string (never iterates a string).
- `isBinding(v)` — detects `"${…}"` values.

All the flat-iteration sites now go through `screenChildren`
(`validate.ts`, `preview.ts`, `screen.ts`, and the Build list/add/move in
`ui.ts`) and all `data-source` reads through `dataSourceOf`. `vNeedsDataSource`
no longer fires on a dynamic binding. The Build prop editor shows a read-only
"Dynamic options · ${…}" note for binding data-sources; the preview shows the
binding expression. `normalizeFlow` also sanitises `Form.children`.

**Design / how to revert.** `Form` is treated as a *transparent read/passthrough
container* — it is deliberately **not** added to the palette, so the builder's
authoring model stays flat while it can now read/generate Form-wrapped flows.
Every new branch is gated on a `Form` actually being present, so flat flows are
untouched (covered by the sample/template regression tests). To revert: this
change is self-contained in the three helpers plus their call sites — reverting
the commit restores the flat-only behaviour with no data migration needed.

**Known limitations (out of scope here).** (1) Only a single `Form` per screen
is unwrapped; a screen mixing a `Form` with loose top-level components would show
only the Form's children. (2) Dynamic bindings render as placeholders — the
builder can't resolve `${data.*}` / `${form.*}`. (3) The 50-component limit now
counts the components *inside* the Form, so large generated forms (e.g. the RSVP
flow's 19-companion screen ≈ 100 components) correctly report `vMaxComponents`.

---

## Validator missed several static-validation errors Meta rejects on publish

**Symptom.** The builder reported a flow as valid, but the WhatsApp Flows
Playground rejected it on publish/preview with a static-validation error.

**Root cause.** Audited `validate.ts` against Meta's
[error-codes reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/reference/error-codes)
(static-validation family). Five cases were reachable from the UI but unchecked:
- a `complete` action on a non-terminal screen (`INVALID_COMPLETE_ACTION`);
- a `complete` action on an `EmbeddedLink` — `complete` is Footer-only
  (`INVALID_ENUM_VALUE`); the action dropdown even offered it;
- a `navigate` targeting its own screen (`INVALID_NAVIGATE_ACTION_NEXT_SCREEN_NAME`,
  loop);
- a stale `success` on a non-terminal screen (`NOT_KEYWORD_...`) — unchecking
  **Terminal** left `success: true` behind;
- a Footer `right-caption` without a `left-caption` (`INVALID_DEPENDENCIES`).

The routing-model and data-binding error families were deliberately left out —
they only apply to Data Endpoint flows, which this builder doesn't produce.

**Fix.** Added the five rules to `validate.ts` (with i18n keys). Restricted the
`EmbeddedLink` action editor to actions that exclude `complete`, and kept
`success` in lockstep with `terminal` in the screen-meta toggle so it can't go
stale.

---

## Exported Flow JSON could fail to import into the Playground

**Symptom.** A flow that the builder reported as "valid" (or at least
generatable/copyable) could be rejected by the WhatsApp Flows Playground on
import.

**Root cause.** Three conformance gaps the validator didn't catch:
- A `NavigationList` added from the palette carried a spurious `name` and **no
  `on-click-action`** on the component or its items — so it navigated nowhere,
  which the Playground rejects (the field isn't part of the spec either).
- `Image` / `ImageCarousel` were added with an empty `src`; empty base64 renders
  a placeholder in the Figma mockup but is invalid on import.
- **Copy JSON** was ungated — only `Generate` was blocked on errors — so a flow
  with an empty `navigate` target (`next.name: ""`) could be copied out broken.

**Fix.** In `validate.ts`: require a navigate action on every `NavigationList`
(component- or item-level) and validate item-level navigate targets; warn on
empty `Image`/`ImageCarousel` `src`. Dropped `name` from the `NavigationList`
palette default and gave each item a `navigate` action; the prop editor now
exposes a per-item **Go to** screen picker (and no longer shows `name`). Gated
**Copy JSON** on errors, mirroring `Generate`.

---

## Menu drawer shadow/border showed when closed — [#41](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/41)

**Symptom.** With the hamburger menu closed, a shadow strip lingered on the left
edge of the screen.

**Root cause.** Closed, the drawer sits at `translateX(-100%)` with its right edge
exactly at `x=0`, so its `box-shadow` (10px offset + 30px blur) and `border-right`
spilled into the visible area.

**Fix.** Apply the shadow and border on `#menu.open` only, so they exist while the
drawer is open and disappear when it's closed.

---

## Generated status bar was ~115px tall — [#38](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/38)

**Symptom.** The status bar of generated Figma screens rendered far too tall
(~115px) for a phone.

**Root cause.** An empty spacer frame inflated the row, and the icons imported via
`figma.createNodeFromSvg` came in larger than intended.

**Fix.** Drop the spacer and use `primaryAxisAlignItems = "SPACE_BETWEEN"` (time
left / icons right), and `rescale` each icon to a fixed 11px height regardless of
its imported size.

---

## Generated status bar used broken block glyphs — [#37](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/37)

**Symptom.** The generated status bar showed garbled boxes instead of the
signal/wifi/battery icons.

**Root cause.** It drew the icons with Unicode block characters (`▂▄▆ ▮`) as text,
which don't render as intended in Figma.

**Fix.** Use the same iOS-style bar as the live preview — real signal / wifi /
battery vectors via `figma.createNodeFromSvg` (theme ink baked in).

---

## Generated Figma layout was broken (full-width fills didn't apply) — [#36](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/36)

**Symptom.** Screens generated in Figma looked broken: the footer button hugged
its label (small, bottom-left) instead of stretching full width, radio/checkbox
option titles disappeared (their text column collapsed to ~0 width, wrapping into
an invisible sliver), and the OptIn label was missing.

**Root cause.** The generator used the old `layoutAlign = "STRETCH"` /
`layoutGrow = 1` model to make children fill the width. That's unreliable for
nested auto-layout **frames** whose parent's own axis was set to "hug" — the fill
had no definite width to resolve against, so it collapsed.

**Fix.** Switch to the modern, unambiguous `layoutSizingHorizontal` /
`layoutSizingVertical = "FILL"`. Because that API requires the node to already be
inside a non-hug auto-layout parent, fill intent is *marked* during the build and
resolved in a second pass (`applyFills`) that walks the finished tree **pre-order**
(parent sized before child) after the frames are on the page.

---

## Dropdown list width didn't match the combobox — [#28](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/28)

**Symptom.** The open dropdown list rendered ~10px narrower than its trigger.

**Root cause.** The list was appended to `<body>` as a *static* element and only
became fixed once `position()` set its offsets. In that brief window the
un-positioned list flowed in the page and forced a **transient scrollbar
(~10px)**, which shrank the trigger measured at that instant — so the width
copied onto the list was 10px short.

**Fix.** Give `.dd-list` `position: fixed` in CSS so it never flows on append;
the trigger is then measured correctly and the list matches its width.

---

## Dropdown not responsive on narrow windows — [#27](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/27)

**Symptom.** On a narrow plugin window, the full-width **Add component** popup
overflowed the right edge.

**Root cause.** `position()` set `left`/`min-width` from the trigger with no
viewport clamp.

**Fix.** Cap the list width to the viewport, align it to the trigger, and clamp
the horizontal position so it always stays on-screen (still flips up when there's
no room below).

---

## Dropdown closed when scrolling inside its list — [#25](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/25)

**Symptom.** Scrolling the 21-item **Add component** list closed the dropdown.

**Root cause.** A capture-phase `scroll` listener closed the popup on *any*
scroll — including scrolling inside the list itself.

**Fix.** Ignore scroll events whose target is within the list; still close when
the page/container scrolls (the fixed popup would otherwise detach from its
trigger).

---

## Inconsistent preview phone size across screens — [#23](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/23)

**Symptom.** The WhatsApp phone in the live preview was a different size on
different screens (e.g. WELCOME 300×633 vs DETAILS 226×477).

**Root cause.** `#panel-preview` used `display:flex; align-items:center`, which
made the phone's container `#preview` *shrink-to-content*. Combined with the
phone's `width:100%` + `aspect-ratio`, the width resolved from content, so
content-heavy screens rendered a smaller phone.

**Fix.** Switch the preview panel to **block** layout so `#preview` is full width
and the phone centers via `margin:auto`; every screen renders a stable 300×633.

---

## Preview phone proportion + status bar — [#22](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/22)

**Symptom.** The phone looked stretched, and the status bar used janky text
glyphs (`▂▄▆ Wi-Fi ▮`).

**Root cause.** An earlier responsive change left the phone width fluid but the
height fixed at 560px, distorting the aspect ratio.

**Fix.** Give the phone a real proportion with `aspect-ratio: 9/19` (height auto),
and replace the status bar with an iOS-style one (9:41 + signal/wifi/battery
SVG icons).

---

## Terminal checkbox rendered white / unstyled — [#17](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/17)

**Symptom.** The Terminal checkbox was a plain white native box, off-theme
(especially in dark mode).

**Root cause.** `accent-color` only tints the *checked* state; the unchecked
native box stayed white.

**Fix.** Custom control with `appearance:none` — `--elev` background + `--border`
when unchecked, `--accent` fill + white check when checked.

> **Sub-bug found while fixing this:** the checked style first used the
> `background: var(--accent) url(...)` **shorthand**, which is ambiguous (the
> `var()` could be a color *or* an image) and the browser dropped the color.
> Using `background-color` / `background-image` **longhands** fixed it.

---

## Card hover highlighted only the title — [#15](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/15)

**Symptom.** The hover background appeared only on the component card's title row.

**Root cause.** The hover background was on `.comp-head`.

**Fix.** Move it to the whole `.comp`; the header keeps just its pointer cursor.

---

## Misaligned Terminal checkbox — [#13](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/13)

**Symptom.** The Terminal checkbox was offset from the fields above it.

**Root cause.** The `screen-meta` grid's default `justify-items: stretch`
stretched the checkbox across the whole `1fr` column (~1155px), and the
browser's default margin pushed it 4px right of the inputs.

**Fix.** Constrain it to 16×16, `justify-self: start` (aligns to the inputs'
left edge), `margin: 0`, plus the theme `accent-color`.

---

## Front-end crashes on malformed flow input — [#12](https://github.com/lucasbatistaribeiro/whatsappflows-builder/pull/12)

**Symptom.** Structurally-valid-but-broken input (via the Flow JSON tab or
Import) threw and was surfaced as a misleading **"Invalid JSON"**, leaving the
Build tab half-rendered.

**Root cause.** The render pipeline assumed every screen had a valid
`layout.children` and that `screens[]` was non-empty. Empty `screens[]`, a
screen with no `layout`/`children`, or a `null` entry in `children` all threw.

**Fix.** `normalizeFlow()` on every load path (JSON editor + import/templates):
reject a flow with no screens (clear message, keep the previous flow) and coerce
each screen to a valid `layout.children` array while dropping null/invalid
children.
