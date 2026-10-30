# New UI — the rail + panel chrome (in progress)

The plugin chrome is being rebuilt to the structure sketched in the Figma file
**Flows Builder** (`FhzvBsgVbtp6eIoZ54aWBs`): a 70px navigation rail (Flows ·
Chat · Settings) beside a 497px panel of sections, category rows and draggable
cards. The file is the source of truth — this document maps it to the code and
records the decisions the mapping needed. Work lands on the `new-ui` branch in
three layers: **tokens → components → screens**, each verifiable in the
browser before the next starts.

| Layer | Status | Where |
|---|---|---|
| 1 · tokens | done | `src/ui/tokens.css`, inlined by the build |
| 2 · components | done | `src/ui/components.ts` (DOM builders) + `src/ui/chrome.css` (`.ui-*`); `npm run gallery` renders every variant |
| 3 · screens | done | `ui.ts`: a route per screen, each built from the components; the tabs, the mode switch and the drawer are gone |

## Where things are in the file

| Page | What | Node |
|---|---|---|
| Page 1 | `New UI — conceito (fluxos atuais)` — the 9 concept screens + navigation map | `38:14` |
| Page 1 | `new ui` — the original sketch the structure comes from | `40:298` |
| Page 1 | `Plugin UI — telas do plugin` — the *current* UI, 1:1 at 500×740 | `17:448` |
| Page 1 | `wa-phone` — a 300×667 phone mockup frame (sheet, progress, footer) | `47:625` |
| Components | Atoms, Controls, Rows, Fields & bars, WhatsApp mockup, Navigation rail/item, `logo-flowbuilder` | sections + `65:2578` (logo) |
| icons | `Icon / <name>` sets, one per Lucide icon, sizes 18 · 22 · 26 | |
| _Backup | the concept before componentisation — do not build from it | |

Variables: collections **Chrome** (19 colours named by Material 3 role,
Light/Dark), **Typography** (the M3 type scale behind the `Chrome/*` text
styles), **WhatsApp** (22, Light/Dark — a copy of `COLOR_LIGHT/COLOR_DARK` in
`src/main/theme.ts`, annotated "não editar por gosto"), **Scale** (radius,
space, icon, size) and **Navigation item — icon states** (one alias per state).
The colour and type names, and how they map to the old ones, are in
`knowledge/MATERIAL_TOKENS.md`.

## Scale: the design is 578 wide, the panel is 500

The old screens in the file are 1:1 (500px, 14px text). The new design is drawn
at 578px with 22px body text — everything is ~1.16× the panel. Rather than
hand-round every value, `src/ui/tokens.css` keeps the Figma numbers literally
and multiplies them by one knob, `--ui-scale: 0.865` (500/578). Consequences:

- body text 22 → ~19px, titles 24 → ~21px, section headings 18 → ~15.6px;
- the 14px chrome minimum still holds: tokens that would drop under it
  (`body-small` and `label-small` sizes) are wrapped in `max(14px, …)`;
- if the panel is ever widened to the design's size (`showUI` in
  `src/main/index.ts`), set the knob to 1 and nothing else moves.

**Open for validation:** whether the chunky scale (19px labels in a 500px
panel) is what is wanted, or the panel should grow instead.

## Tokens (`src/ui/tokens.css`)

Colour and type use **Material 3 system-token names**; the full table, with the
old names and the reasons, is `knowledge/MATERIAL_TOKENS.md`. The rule is one
line: the Figma path, `/` → `-`, prefixed `--md-sys-`.

- **Colour** — `--md-sys-color-<role>`: `primary`, `on-primary`,
  `primary-container`, `on-primary-container`, `error`, `error-container`,
  `on-error-container`, `surface`, `surface-container-low`, `surface-container`,
  `on-surface`, `on-surface-variant`, `outline`, `outline-variant`,
  `inverse-surface` / `inverse-primary` (the icon tile), and the custom
  `warning` / `warning-container` / `on-warning-container`.
- **Type** — `--md-sys-typescale-<role>-{size,weight,tracking}` for
  `headline-small`, `title-large`, `title-small`, `body-large`, `body-medium`,
  `body-small`, `label-large`, `label-medium`, `label-small`, and
  `--md-sys-typescale-emphasized-<role>-*` (M3 Expressive's heavier variant)
  for title-large, body-large, body-small, label-large, label-medium. The face
  is `--md-ref-typeface-plain` — Roboto in the file; the plugin can't load fonts
  (`networkAccess: none`), so the stack falls through to the machine's.
- **Scale** keeps `--ui-*`: `--ui-radius-{sm,md,lg,xl,pill}`,
  `--ui-space-{2…48}`, `--ui-icon-{sm,md,lg}`,
  `--ui-size-{row,tile,control,control-sm,rail,panel}`, plus `--ui-ring` (focus,
  the primary at 38%) and `--ui-shadow-{sm,lg}`.

The dark palette is the one the old chrome already had; the light one is new
(whiter). Light/dark is chosen by `prefers-color-scheme` + `data-theme`
(`applyTheme` in `ui.ts`).

`--wa-*` is untouched: set at runtime by `applyThemeVars()` from
`src/main/theme.ts`, which the WhatsApp collection merely mirrors.

## Components (layer 2) — Figma → `components.ts` / `chrome.css`

Measured from the Components page (values at design scale; the tokens scale
them). Each row is a builder in `components.ts` and a rule block in
`chrome.css`; `npm run gallery` shows them all (`build/gallery.html`). The
builders are pure DOM — translated strings go in, nodes come out — so the
screens own the i18n and the model.

| Figma component | Variants / props | Spec | Builder · CSS |
|---|---|---|---|
| Navigation rail | active = Flows · Chat · Settings | hugs to 70 wide (48 + padding 10, 2px right border), padding 18 top/bottom; the `logo-flowbuilder` instance; nav gap 16, logo→nav 48; foot gap 16: theme (sun) as a secondary icon button 48² r12, help 48² bare | `rail()` · `.ui-rail`, `.ui-rail-brand`, `.ui-rail-top/-foot`, `.ui-rail-item.boxed/.plain` |
| Navigation item | Enabled · Disabled (.38) · Selected (surface + border) · Hover (muted) · Pressed (accent/soft) · Focus (2px accent); 1px shadow on every filled state | 48², r8 (= radius/sm, not bound), icon 28; icon colour by state: outline · primary · on-surface-variant · on-primary-container | `.ui-rail-item` + `[aria-current="page"]`, `:hover`, `:active`, `:focus-visible`, `:disabled` |
| logo-flowbuilder | — | 48², r12, radial gradient #008069 → #86DEC4 (literal, not bound), white four-point sparkle; the brand mark, same in both themes | `LOGO` SVG in `components.ts` · `.ui-rail-brand` |
| Toolbar | back · actions 0/1/2 · caret | h82, padding 16, gap 10; Back = secondary 48 icon button; title 24/600 + caret 22, meta 17 tertiary | `toolbar()` · `.ui-toolbar`, `-title`, `-meta` |
| Heading row | hint | 18 tertiary, tracking 2, uppercase; hint 17 right | `section()` · `.ui-section`, `.ui-section-head`, `-hint` |
| Category row | trailing = none · chevron · count · caret · value · toggle | h57, padding 0/14, gap 12; icon 26 muted; label 22 secondary; count 18 tertiary; chevron 22 | `row()` · `.ui-row`, `-count`, `-value`, `-swatch` |
| Card | trailing = drag · chevron · badge · none; state default/selected; title strong/plain | padding 9/12, gap 12, r md, border 1 (selected: 2px accent); tile 40; title 22 (strong 500 primary / plain 400 secondary), subtitle 18 tertiary | `card()` · `.ui-card`, `.selected`, `.plain`, `-title`, `-sub` |
| Card · expanded | — | header as Card + fields, option rows, Duplicate/Remove (secondary 40) | `cardExpanded()` · `.ui-card.open`, `-head`, `-actions` |
| Option row | label | h44, r md, surface-container-low, padding 0/12, gap 10; grip 18, label 20 primary, x 18 | `optionRow()`, `addLink()` · `.ui-option`, `.ui-add` |
| Tile | icon swap | 40², r sm, inverse-surface (no border since the M3 rename), icon 22 inverse-primary | `tile()` · `.ui-tile` |
| Drag handle | — | 23×34, r sm, surface + border, grip 18 | `grip()` · `.ui-grip` |
| Button | style primary/secondary/soft · size 48/40 · label | padding 0/18 (40: 0/12), gap 10, r md; label 21/500 (40: 18); icon 22; primary = primary + on-primary, secondary = surface + outline-variant + on-surface-variant, soft = primary-container + on-primary-container | `button()` · `.ui-btn`, `.primary/.secondary/.soft`, `.sm`, `.icon` |
| Search field | kbd | h51, r md, padding 0/14, gap 13; icon 22; placeholder 22 tertiary; kbd 20 in r sm border | `searchField()` · `.ui-search`, `.ui-kbd` |
| Field | required | label 18 tertiary (+ red *), gap 8; input h51 r md padding 0/14 value 22 primary | `field()`, `textArea()` · `.ui-field`, `-label`, `.ui-input` |
| Validation banner | valid · error | h47, r md, padding 12/14, gap 10; icon 22; text 20; valid = primary-container + on-primary-container, error = error-container + on-error-container, warn = warning-container + on-warning-container | `banner()` · `.ui-banner.ok/.err/.warn` |
| Toggle | on | 52×30 pill, padding 3, knob 24 surface; on accent, off border | `toggle()` · `.ui-switch` |
| Dir badge | dir | r sm, padding 3/8, 14/500; OUT primary-container + on-primary-container, IN surface-container + outline | `dirBadge()` · `.ui-dir.in/.out` |
| Value | swatch | 20 tertiary + chevron, optional 22 swatch r6 | part of `row({trailing:"value"})` |
| Divider | — | 2px border, full width | `divider()` · `.ui-divider` |
| Kbd | key | 20 tertiary, r sm, border | `.ui-kbd` |
| WA · * | status bar, chat header, nav bar, composer, bubble in/out, system pill, reply/flow button | the mockup — already in `.wa-*`; keep | — |

Icons: the `icons` page is the same Lucide set as `src/ui/icons.ts` (names
match the keys used in the concept build: `box`, `msg`, `sliders`, `help`,
`search`, `right`/`down`/`up`, `back`, `grip`, `type`, `input`, `checks`,
`image`, `click`, `corner`, `code`, `eye`, `template`, `plus`, `palette`,
`lang`, `sun`, `frame`, `import`, `copy`, `user`, `bubble`, `check`, `alert`,
`reply`, `list`, `workflow`, `file`, `link`, `calendar`, `radio`, `checkbox`,
`updown`, `tag`, `mic`, `video`, `sparkles`, `trash`, `x`, `more`, `flag`).
They are in `icons.ts` under their Lucide names (`box`, `message-square-text`,
`sliders-vertical`, `circle-help`, `arrow-left`, `text-cursor-input`,
`list-checks`, `mouse-pointer-click`, `corner-down-right`, `code-xml`,
`layout-template`, `languages`, `circle-dot`, `square-check`,
`chevrons-up-down`, `ellipsis`…).

## Screens (layer 3) — navigation

```
Rail ▸ Flows     01 Flow home ─▶ 02 Screen editor ─▶ 03 Component library
                 01 Flow home ─▶ 04 Live preview · 05 Flow JSON
Rail ▸ Chat      06 Compose ─▶ 07 Add message · 08 Chat preview
Rail ▸ Settings  09 Settings (Flow · Figma · System)
```

Rules: root of each rail = title + Generate in the toolbar; drill-in screens =
Back + title, no Generate; the two libraries (03, 07) share one pattern (search
▸ groups ▸ draggable cards). The Build/Preview/JSON tabs, the Flows/Chat
switch and the hamburger drawer go away; Import/Copy JSON move to Flow home.

What each screen replaces in today's `ui.html`: 01 ← `#screens` chips + the
menu's Flow group; 02 ← `#screen-meta` + `#comp-list`; 03 ← `#palette`
dropdown; 04 ← `#panel-preview`; 05 ← `#panel-json`; 06/07 ← `#chat-composer`;
08 ← `#panel-chat-preview`; 09 ← `#menu`.

## How the screens are wired (layer 3)

`ui.ts` keeps one `route` (`home`, `screen`, `library`, `preview`, `json`,
`chat`, `chatAdd`, `chatPreview`, `settings`, `pick`) and a `SCREENS` table of
builders returning `{ toolbar, body, foot }`; `go()` swaps the three hosts in
`ui.html` and moves the rail's current marker, `back()` follows `PARENT`.
Value edits call `softSync()` (JSON + preview + banner, in place); structural
ones call `structuralSync()` (rebuild the screen, keep the scroll). The
elements the old code addressed by id (`#json`, `#preview`, `#generate`) now
exist only while their screen is up, so every repaint looks them up and skips
what is absent. Pickers (template, header style, size, themes, language) are a
drill-in screen each, not dropdowns; the text prefs persist on commit.
`chatComposer.ts` renders through the same builders and no longer owns the
"add" picker — `addMessage()` is what the `chatAdd` screen calls.

`.claude/agents/plugin-ui-tester.md` has the route table with what to query on
each screen.

**Out of step in the file:** the `size/rail` variable still reads 79 while the
rail component hugs to 70. The code follows the component
(`--ui-size-rail: 70`); update the variable, or bind the rail's width to it.

## Decisions taken (validate or revert)

- **Back on the left** of the toolbar (the sketch's `Toolbar` frame had it on
  the right; the `Toolbar` component now has it on the left).
- **Library "Action" group** holds Footer, NavigationList and EmbeddedLink
  (the palette files NavigationList under Selection and EmbeddedLink under
  Media — the palette's `group` field decides what the code shows, so this is
  a `src/model/palette.ts` change if kept).
- **Import / Copy JSON** leave Settings for Flow home.
- The concept's flow name ("Barber booking") is a placeholder: the sample
  flow has no name. The title slot shows the template name or the imported
  file name, and "Flow" for the sample.
- **Left out of this pass** (in `knowledge/BACKLOG.md`): the search field on
  Flow home, the rail's Help button, dragging a library card onto the list (tap
  appends), the collapse animation on cards (expand/collapse rebuilds the list),
  and the message and component editors' own field layout (they keep the
  `.pe-*` structure, restyled).
