# Bug fixes

A log of bugs found while hardening the plugin UI, with the root cause and the
fix for each. Newest first. Links point to the merged PR.

---

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
[error-codes reference](https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes)
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
