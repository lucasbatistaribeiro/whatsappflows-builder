# Bug fixes

A log of bugs found while hardening the plugin UI, with the root cause and the
fix for each. Newest first. Links point to the merged PR.

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
