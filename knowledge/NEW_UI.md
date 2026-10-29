# New UI — the rail + panel chrome (in progress)

The plugin chrome is being rebuilt to the structure sketched in the Figma file
**Flows Builder** (`FhzvBsgVbtp6eIoZ54aWBs`): a 79px navigation rail (Flows ·
Chat · Settings) beside a 497px panel of sections, category rows and draggable
cards. The file is the source of truth — this document maps it to the code and
records the decisions the mapping needed. Work lands on the `new-ui` branch in
three layers: **tokens → components → screens**, each verifiable in the
browser before the next starts.

## Where things are in the file

| Page | What | Node |
|---|---|---|
| Page 1 | `New UI — conceito (fluxos atuais)` — the 9 concept screens + navigation map | `38:14` |
| Page 1 | `new ui` — the original sketch the structure comes from | `40:298` |
| Page 1 | `Plugin UI — telas do plugin` — the *current* UI, 1:1 at 500×740 | `17:448` |
| Page 1 | `wa-phone` — a 300×667 phone mockup frame (sheet, progress, footer) | `47:625` |
| Components | Atoms, Controls, Rows, Fields & bars, WhatsApp mockup, Navigation rail/item | sections |
| icons | `Icon / <name>` sets, one per Lucide icon, sizes 18 · 22 · 26 | |
| _Backup | the concept before componentisation — do not build from it | |

Variables: collections **Chrome** (17 colours, Light/Dark), **WhatsApp** (22,
Light/Dark — a copy of `COLOR_LIGHT/COLOR_DARK` in `src/main/theme.ts`,
annotated "não editar por gosto"), **Scale** (radius, space, icon, size) and
**Navigation item — icon states** (one alias per state).

## Scale: the design is 578 wide, the panel is 500

The old screens in the file are 1:1 (500px, 14px text). The new design is drawn
at 578px with 22px body text — everything is ~1.16× the panel. Rather than
hand-round every value, `src/ui/tokens.css` keeps the Figma numbers literally
and multiplies them by one knob, `--ui-scale: 0.865` (500/578). Consequences:

- body text 22 → ~19px, titles 24 → ~21px, section headings 18 → ~15.6px;
- the 14px chrome minimum still holds: tokens that would drop under it
  (`--ui-text-meta`, `--ui-text-badge`) are wrapped in `max(14px, …)`;
- if the panel is ever widened to the design's size (`showUI` in
  `src/main/index.ts`), set the knob to 1 and nothing else moves.

**Open for validation:** whether the chunky scale (19px labels in a 500px
panel) is what is wanted, or the panel should grow instead.

## Tokens (`src/ui/tokens.css`)

Named after the Figma variable, `/` → `-`, prefixed `--ui-`:

| Figma (Chrome) | CSS | Used for |
|---|---|---|
| surface/default · sunken · muted | `--ui-surface`, `-sunken`, `-muted` | rail/panel/cards · option rows, code · hover |
| border/default | `--ui-border` | |
| text/primary · secondary · tertiary · on-accent | `--ui-text`, `-secondary`, `-tertiary`, `--ui-on-accent` | titles · labels · headings/meta · on accent |
| accent/default · soft · text | `--ui-accent`, `-soft`, `-text` | primary button · soft button, banner · text on soft |
| danger/default · soft | `--ui-danger`, `-soft` | |
| tile/bg · icon · border | `--ui-tile-*` | the dark icon tile on cards (inverts in dark) |
| icon/muted | `--ui-icon-muted` | chevrons, grip, idle rail icons |

Scale: `--ui-radius-{sm,md,lg,xl,pill}`, `--ui-space-{2…48}`,
`--ui-icon-{sm,md,lg}`, `--ui-size-{row,tile,control,control-sm,rail,panel}`.
Type sizes (`--ui-text-{title,body,button,option,sub,meta,badge}`) come from
the components, not a collection — Roboto in the file, but the plugin can't
load fonts (`networkAccess: none`), so `--ui-font` falls through to the
machine's stack.

**Legacy aliases** (`--ui-bg`, `--ui-panel`, `--ui-elev`, `--ui-dim`,
`--ui-accent-weak`, `--ui-radius`) point the old names at the new palette so
the current screens keep rendering while they are rebuilt. The dark palette is
the one the old chrome already had; the light one is new (whiter). The chrome
no longer derives from `--figma-color-*`: the Chrome collection is explicit
about both modes, and light/dark is still chosen by `prefers-color-scheme` +
`data-theme` (`applyTheme` in `ui.ts`).

`--wa-*` is untouched: set at runtime by `applyThemeVars()` from
`src/main/theme.ts`, which the WhatsApp collection merely mirrors.

## Components (layer 2) — Figma → CSS class

Measured from the Components page (values at design scale; the tokens scale them):

| Figma component | Variants / props | Spec | CSS (planned) |
|---|---|---|---|
| Navigation rail | active = Flows · Chat · Settings | 79 wide, padding 18/12, 2px right border; brand 54² accent r12 + sparkle; nav gap 16, brand→nav 48; bottom: theme (sun) button 54² + help 54×48 | `.rail`, `.rail-brand`, `.rail-nav`, `.rail-foot` |
| Navigation item | Enabled · Disabled (.38) · Selected (surface + border, shadow) · Hover (muted) · Pressed (accent/soft) · Focus (2px accent) | 54², r13, icon 28; icon colour by state: muted · accent · secondary · accent/text | `.rail-item[aria-current]` + `:hover/:active/:focus-visible` |
| Toolbar | back · actions 0/1/2 · caret | h82, padding 16, gap 10; Back = secondary 48 icon button; title 24/600 + caret 22, meta 17 tertiary | `.toolbar`, `.toolbar-title`, `.toolbar-meta` |
| Heading row | hint | 18 tertiary, tracking 2, uppercase; hint 17 right | `.section-head` |
| Category row | trailing = none · chevron · count · caret · value · toggle | h57, padding 0/14, gap 12; icon 26 muted; label 22 secondary; count 18 tertiary; chevron 22 | `.row`, `.row-count`, `.row-value` |
| Card | trailing = drag · chevron · badge · none; state default/selected; title strong/plain | padding 9/12, gap 12, r md, border 1 (selected: 2px accent); tile 40; title 22 (strong 500 primary / plain 400 secondary), subtitle 18 tertiary | `.card`, `.card.selected`, `.card-title` |
| Card · expanded | — | header as Card + fields, option rows, Duplicate/Remove (secondary 40) | `.card.open` + `.pe-*` |
| Option row | label | h44, r md, surface/sunken, padding 0/12, gap 10; grip 18, label 20 primary, x 18 | `.opt-row` |
| Tile | icon swap | 40², r sm, tile/bg + 1px tile/border, icon 22 tile/icon | `.tile` |
| Drag handle | — | 23×34, r sm, surface + border, grip 18 | `.grip` |
| Button | style primary/secondary/soft · size 48/40 · label | padding 0/18 (40: 0/12), gap 10, r md; label 21/500 (40: 18); icon 22; primary accent+on-accent, secondary surface+border + text secondary, soft accent/soft + accent/text | `.btn`, `.btn.primary/.secondary/.soft`, `.btn.sm` |
| Search field | kbd | h51, r md, padding 0/14, gap 13; icon 22; placeholder 22 tertiary; kbd 20 in r sm border | `.search` |
| Field | required | label 18 tertiary (+ red *), gap 8; input h51 r md padding 0/14 value 22 primary | `.field` |
| Validation banner | valid · error | h47, r md, padding 12/14, gap 10; icon 22; text 20; valid = accent/soft + accent/text, error = danger/soft + danger | `.banner.ok/.err` |
| Toggle | on | 52×30 pill, padding 3, knob 24 surface; on accent, off border | `.switch` (replaces `.menu-switch`) |
| Dir badge | dir | r sm, padding 3/8, 14/500; OUT accent/soft + accent/text, IN muted + tertiary | `.dir` |
| Value | swatch | 20 tertiary + chevron, optional 22 swatch r6 | `.row-value` |
| Divider | — | 2px border, full width | `.divider` |
| Kbd | key | 20 tertiary, r sm, border | `.kbd` |
| WA · * | status bar, chat header, nav bar, composer, bubble in/out, system pill, reply/flow button | the mockup — already in `.wa-*`; keep | — |

Icons: the `icons` page is the same Lucide set as `src/ui/icons.ts` (names
match the keys used in the concept build: `box`, `msg`, `sliders`, `help`,
`search`, `right`/`down`/`up`, `back`, `grip`, `type`, `input`, `checks`,
`image`, `click`, `corner`, `code`, `eye`, `template`, `plus`, `palette`,
`lang`, `sun`, `frame`, `import`, `copy`, `user`, `bubble`, `check`, `alert`,
`reply`, `list`, `workflow`, `file`, `link`, `calendar`, `radio`, `checkbox`,
`updown`, `tag`, `mic`, `video`, `sparkles`, `trash`, `x`, `more`, `flag`).
Several are missing from `icons.ts` and get added in layer 2.

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
  file name.
