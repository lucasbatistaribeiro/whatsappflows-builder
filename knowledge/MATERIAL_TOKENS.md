# Material 3 naming for the chrome's tokens

The plugin chrome's colour and type tokens follow the **Material Design 3**
system-token names: colour *roles* (`primary`, `on-surface`,
`surface-container-low`…) and the *type scale* (`title-large`, `body-medium`…,
plus M3 Expressive's `emphasized` variants). This file is the survey that led
there, the mapping from the old names, and the order the migration ran in.

**Scope.** Only the plugin's own chrome — the Figma collection **Chrome** and the
**`Chrome/*`** text styles, and their mirror in `src/ui/tokens.css`. Not touched:

- the **WhatsApp** collection and the `WhatsApp/*` text styles — they copy
  WhatsApp's identity (`src/main/theme.ts`, "não editar por gosto"), and M3 role
  names would say they are ours to theme;
- the **Scale** collection (radius, space, icon, size) — not part of the ask;
  M3 has shape tokens, but renaming them is a separate decision.

## Naming rule (Figma ↔ code)

One rule both ways: Figma path, `/` → `-`, prefixed `--md-sys-`.

| Figma | Code |
|---|---|
| variable `color/primary` (collection Chrome) | `--md-sys-color-primary` |
| variable `typescale/title-large/size` (collection Typography) | `--md-sys-typescale-title-large-size` |
| variable `typescale/emphasized/title-large/weight` | `--md-sys-typescale-emphasized-title-large-weight` |
| text style `Chrome/title-large` | the `title-large` token group |
| text style `Chrome/emphasized/title-large` | the `emphasized-title-large` group |

`--md-sys-` is Material's own namespace for system tokens (Material Web uses
the same names). The scale tokens keep `--ui-*`; the two-brand rule now reads:
`--md-sys-*` and `--ui-*` are the plugin's chrome, `--wa-*` is WhatsApp's.

## Colours — survey and mapping

Usage counts are bound fills/strokes on the Components page (+ the concept
screens on Page 1).

| Old variable | Uses | M3 role (new name) | Why this role | Value change |
|---|---|---|---|---|
| `surface/default` | 62 | `color/surface` | the base the panel, rail, cards and inputs sit on | — |
| `surface/sunken` | 5 | `color/surface-container-low` | option rows, code editor: a container one step off the surface | — |
| `surface/muted` | 1 | `color/surface-container` | hover, the IN badge: the next container step | — (see note 1) |
| `border/default` | 53 | `color/outline-variant` | decorative borders and dividers | — |
| `text/primary` | 23 | `color/on-surface` | titles, values | — |
| `text/secondary` | 155 | `color/on-surface-variant` | row labels, secondary text and icons | — |
| `text/tertiary` | 38 | `color/outline` | headings, meta, placeholders — M3 has no third text role; `outline` is its mid-grey | — |
| `icon/muted` | 64 | **merged into** `color/outline` | chevrons, grip, idle rail icons: the same mid-grey as `text/tertiary` | light #969A98 → #929494 (ΔE < 1); dark identical |
| `text/on-accent` | 22 | `color/on-primary` | text and icons on the primary fill | — |
| `accent/default` | 42 | `color/primary` | | — |
| `accent/soft` | 11 | `color/primary-container` | soft button, valid banner, OUT badge | — |
| `accent/text` | 6 | `color/on-primary-container` | text on `primary-container` | — |
| `danger/default` | 6 | `color/error` | required asterisk, error states | — |
| `danger/soft` | 1 | `color/error-container` | error banner | — |
| — (new) | | `color/on-error-container` | text on the error banner, which used `danger/default`; same value as `error` | — |
| `tile/bg` | 18 | `color/inverse-surface` | the dark tile in light, light in dark — exactly M3's inverse surface | — |
| `tile/icon` | 36 | `color/inverse-primary` | the accent on the inverse surface | — |
| `tile/border` | 18 | **removed** | no M3 role; a 1px edge one shade off the tile it frames | the tile loses a near-invisible edge |
| — (code only: `--ui-warn`) | | `color/warning`, `color/warning-container`, `color/on-warning-container` | an M3 *custom colour* (same role quartet pattern); the warning banner existed in code and not in Figma | — (container is the hex the code's `color-mix` produced) |

The **Navigation item — icon states** collection aliases keep working through
the rename (aliases point at variable ids): Enabled → `outline`, Selected →
`primary`, Hover → `on-surface-variant`, Pressed → `on-primary-container`.

**Note 1 — dark containers.** In M3 dark, containers get *lighter* as they
step up. Ours don't: dark `surface-container` (#0E1513) is darker than dark
`surface` (#101917). The rename keeps every value, so this is now visible in
the names; re-tuning the dark ramp is a design call, left open.

## Type — survey and mapping

The text in the components already used 12 `Chrome/*` text styles (all Roboto,
line height auto). Each maps to the M3 role that does the same job; the sizes
and weights are ours (M3 lets a product set them), the role names are M3's.
Within a size, the plain role is the lighter weight and `emphasized` the
heavier, as in M3 Expressive.

| Old style | Size / weight | Used for | M3 style (new name) |
|---|---|---|---|
| `Chrome/title` | 24 / 600 | toolbar title | `Chrome/headline-small` |
| `Chrome/item` | 22 / 400 | row label, input text | `Chrome/title-large` |
| `Chrome/item strong` | 22 / 500 | card title | `Chrome/emphasized/title-large` |
| `Chrome/action weak` | 21 / 400 | secondary button | `Chrome/label-large` |
| `Chrome/action` | 21 / 500 | primary button | `Chrome/emphasized/label-large` |
| `Chrome/value` | 20 / 400 | trailing value, banner, option row, kbd | `Chrome/body-large` |
| `Chrome/link` | 20 / 500 | inline action (Add option) | `Chrome/emphasized/body-large` |
| `Chrome/section` | 18 / 400, tracking 2 | section heading (uppercase) | `Chrome/title-small` |
| `Chrome/label` | 18 / 400 | card subtitle, field label, count | `Chrome/body-medium` |
| — (secondary 40px button used `Chrome/label`) | 18 / 400 | secondary small button | `Chrome/label-medium` (new; same values) |
| `Chrome/action small` | 18 / 500 | primary small button | `Chrome/emphasized/label-medium` |
| `Chrome/meta` | 17 / 400 | toolbar meta, hints | `Chrome/body-small` |
| `Chrome/badge` | 14 / 500 | IN/OUT badge | `Chrome/label-small` |

Each style is backed by variables in a new **Typography** collection:
`typeface/plain` (Roboto), and per role `size`, `weight`, `tracking`
(emphasized variants alias the base `size` and `tracking` and carry their own
`weight`). **Line height is not tokenised yet:** every style uses Figma's
*auto*, and the code uses the matching ~1.2; M3 defines a line height per role,
which would move text by a pixel or two — left as a follow-up.

Roles not used by the chrome (display-*, headline-large/-medium, title-medium,
the other emphasized variants) are not defined rather than invented.

### What this changes in code

- `Chrome/link` is 20 in Figma; the code drew the "Add option" link at 19 →
  now 20 (`emphasized-body-large`).
- Nothing else moves: every size, weight and colour keeps its value.

## Migration order

1. **Figma, colours** — version saved first; rename the 14 variables, merge
   `icon/muted` into `outline` (rebind its strokes and the Enabled alias),
   remove `tile/border` (and the tile's stroke), add `on-error-container`
   (rebind the error banner's text and icon) and the three warning colours.
2. **Figma, type** — create the Typography collection, rename the `Chrome/*`
   styles, bind their size/weight/tracking/family to the variables, add
   `Chrome/label-medium` and apply it to the secondary small button.
3. **Code, colours** — `tokens.css` to `--md-sys-color-*`, every use in
   `chrome.css`, `ui.html`, the gallery; drop the legacy aliases.
4. **Code, type** — `--ui-text-*` to `--md-sys-typescale-*` (size, weight,
   tracking), and the literal `font-weight`s in `chrome.css` to the weight tokens.
5. Verify: computed colours and fonts on every screen, light and dark, equal
   before and after (bar the two deliberate changes above).
