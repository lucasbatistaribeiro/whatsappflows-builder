# Keeping the builder in sync with WhatsApp Flows (Meta)

This project mirrors a **subset** of Meta's WhatsApp Flows spec (Flow JSON,
components, limits, static-validation rules). When Meta ships changes, use this
file as the playbook to reconcile the code. It maps **each Meta doc → the exact
code that implements it**, gives a **step-by-step routine**, and pins the
**current values** so a diff is obvious.

> How to run it: point an agent at this file — e.g. *"Follow `knowledge/META_SYNC.md`
> and reconcile the project with Meta's current Flow JSON spec."* The agent
> should follow [The routine](#the-routine) below.

---

## Meta documentation links

Meta moved these in 2026: the old `/docs/whatsapp/...` paths still redirect, but
`reference/flowjson` and `reference/components` also **changed shape** to `guides/`.
Use the current URLs.

| Area | Link |
|---|---|
| Flow JSON reference (top-level, screens, routing) | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowjson |
| Components reference (types, properties, per-component limits) | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/components |
| Media upload — **PhotoPicker / DocumentPicker live here**, not in the components ref | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/media_upload |
| Error codes (incl. **static validation** errors) | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/reference/error-codes |
| Best practices (rationale for limits, UX) | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/bestpractices |
| **Changelog** (Flow JSON versions — check this first) | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/changelogs |
| Playground | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/playground |
| **Index of every Flows doc** (title + one-line summary + `.md` link each) | https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/llms.txt |

> ⚠️ **Fetching gotcha.** The HTML pages return **HTTP 500 to `WebFetch`** (bot
> protection). **Append `.md` to the page path and fetch it with plain `curl`** —
> that returns clean markdown and is the fastest, most greppable way in:
>
> ```bash
> curl -sS -L -o components.md \
>   https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/components.md
> ```
>
> Re-measured **2026-10-20**: this now works for **every** page — `guides/*`, and
> also `changelogs` and `reference/error-codes`, which used to be HTML-only. And
> `components.md` is no longer truncated: it carries all **26** sections, including
> `NavigationList`, `ChipsSelector` and `ImageCarousel` (the 2026-08-05 note about
> 23 of 26 sections is obsolete). `llms.txt` above lists every page's `.md` URL.
>
> Keep the **in-app browser MCP** (`mcp__Claude_Browser__navigate` →
> `get_page_text` / `javascript_tool`) as the fallback when a `.md` looks thin or
> you want to confirm against the rendered page. It renders in the reader's
> locale, so search both the English term and the Portuguese one (`maximum` /
> `máximo`) — section headings are translated too (`NavigationList` appears as
> *"Lista de navegação"*). The `.md` is always English.
>
> Both specs for *conversation* messaging (not Flows) publish official **OpenAPI
> 3.1** that downloads with plain `curl` — see `BACKLOG.md` if that's ever needed.

---

## Where each part of the spec lives in the code

Two runtime contexts share the **pure model** in `src/model/*` (see `knowledge/CLAUDE.md`).
Symbol names below are stable anchors; grep for them.

### 1. Flow JSON shape & versions
- **`src/model/flowTypes.ts`** — `FlowJSON` (version, `data_api_version`,
  `routing_model`, `screens`), `Screen`, `Layout`, `Action` / `ActionName`,
  `ComponentType` union, `Component` interface, and the container/binding helpers
  `screenChildren` / `dataSourceOf` / `isBinding`.
- **Version pin:** the default Flow JSON version is a literal `"7.3"` in
  `src/model/sample.ts` and `src/model/templates.ts` (grep `"7.3"`), and the
  hint text in `src/ui/i18n.ts` (`vMissingVersion`).

### 2. Component catalogue
Adding/removing a component type or changing its props touches **all five** of
these (keep them in step):
- **`src/model/flowTypes.ts`** — add the name to the `ComponentType` union.
- **`src/model/palette.ts`** — `PALETTE`: the default instance the "Add
  component" picker creates. (`Form` is intentionally **absent** — see
  [Scope decisions](#intentional-scope-decisions).)
- **`src/ui/propEditor.ts`** — `buildPropEditor` switch: the editable fields.
- **`src/ui/preview.ts`** — `renderComp` switch: the live HTML mockup.
- **`src/main/components.ts`** — `renderComponent` switch: the Figma generator.
  (`src/main/screen.ts` assembles the screen and handles the `Footer`.)

### 3. Limits, constraints & static-validation rules
- **`src/model/validate.ts`** — the single source of truth for rules. Numeric
  limits are constants at the top (`MAX_SCREENS`, `MAX_COMPONENTS`, `MAX_OPT_IN`,
  `FOOTER_LABEL_MAX`, `LINK_TEXT_MAX`, the `*_CAROUSEL_*` counts), plus four
  lookup tables for the per-component limits that are too numerous to name one by
  one: `TEXT_MAX` (text-component `text`), `PROP_MAX` (other string props, keyed
  by Flow JSON property name), `OPTIONS_MIN` / `OPTIONS_MAX` (data-source option
  counts). Each rule `push()`es a message **key**.
- **Severity convention** (errors block Generate/Copy in the UI): **error** for
  what the error-codes reference rejects on import and for the per-screen /
  per-flow component *counts*; **warning** for *character* limits — Meta has no
  max-chars static error, the renderer truncates or drops the overflow.
- **`src/ui/i18n.ts`** — the `v*` keys hold the en/pt message text. Every rule in
  `validate.ts` must have a matching key here (English is the source).

### 4. Actions
- **`src/model/flowTypes.ts`** — `ActionName` union (`navigate`, `complete`,
  `data_exchange`, `update_data`, `open_url`).
- **`src/ui/propEditor.ts`** — `FOOTER_ACTIONS` / `LINK_ACTIONS` control which
  actions each component's editor offers (e.g. `complete` is Footer-only).

---

## Current pinned values (diff Meta against these)

If Meta's number differs from the value here, that's the edit.

| Rule | Value in code | Constant / key | Meta source |
|---|---|---|---|
| Flow JSON version (default) | `7.3` | `"7.3"` literals | Changelog |
| Max screens per Flow | `100` | `MAX_SCREENS` → `vMaxScreens` | Error codes (`MAX_SCREENS_NUMBER`) |
| Max components per screen | `50` | `MAX_COMPONENTS` → `vMaxComponents` | Components ref: *"maximum number of components per screen is 50"* (re-confirmed 2026-08-05); rationale in Best practices `#number-of-components` |
| Footer label max chars | `35` | `FOOTER_LABEL_MAX` → `vFooterLen` | Components ref (Footer) |
| Footer caption max chars | `15` each | `PROP_MAX.Footer` → `vPropLen` | Components ref (Footer) |
| Text max chars | Heading `80`, Subheading `80`, Body `4096`, Caption `409` | `TEXT_MAX` → `vHeadingLen` | Components ref (Text) |
| Text / EmbeddedLink blank text | rejected | `vTextBlank` | Components ref: *"Empty or Blank value is not accepted"* |
| EmbeddedLink text max chars | `25` | `LINK_TEXT_MAX` → `vLinkLen` | Components ref (EmbeddedLink) |
| OptIn content max chars | `120` | `PROP_MAX.OptIn` → `vPropLen` | Components ref (OptIn) |
| TextInput max chars | label `20`, helper-text `80`, error-message `30` | `PROP_MAX.TextInput` → `vPropLen` | Components ref (Text Entry) |
| TextArea max chars | label `20`, helper-text `80` | `PROP_MAX.TextArea` → `vPropLen` | Components ref (Text Entry) |
| DatePicker max chars | label `40`, helper-text `80`, error-message `80` | `PROP_MAX.DatePicker` → `vPropLen` | Components ref (DatePicker) |
| CalendarPicker max chars | title `80`, description `300`, label `40`, helper-text `80`, error-message `80` | `PROP_MAX.CalendarPicker` → `vPropLen` | Components ref (CalendarPicker) |
| data-source option count | Checkbox/Radio `1`–`20`, Chips `2`–`20`, Dropdown `1`–`200` (`100` when any option has an `image`) | `OPTIONS_MIN` / `OPTIONS_MAX` / `DROPDOWN_MAX_WITH_IMAGES` → `vMinOptions` / `vMaxOptions` | Components ref (each type's limits) |
| Max EmbeddedLink per screen | `2` | `vMaxLinks` | Components ref; Error codes (`MAX_EMBEDDED_LINK_PER_SCREEN`) |
| Max Image per screen | `3` | `vMaxImages` | Components ref; Error codes (`MAX_IMAGE_PER_SCREEN`) |
| Max OptIn per screen | `5` | `MAX_OPT_IN` → `vMaxOptIn` | Error codes (`MAX_OPT_IN_PER_SCREEN`) |
| ImageCarousel images | `1`–`3` | `CAROUSEL_IMAGES_MIN/MAX` → `vCarouselCount` | Components ref (ImageCarousel) |
| Max ImageCarousel per screen / per Flow | `2` / `3` | `MAX_CAROUSEL_PER_SCREEN` / `MAX_CAROUSEL_PER_FLOW` → `vMaxCarouselScreen` / `vMaxCarouselFlow` | Components ref (ImageCarousel) |
| Max NavigationList per screen | `2` | `vMaxNavList` | Components ref |
| NavigationList list-items | `1`–`20` | `vNavListItems` / `NAV_ITEMS_MAX` → `vMaxNavItems` | Components ref (NavigationList) |
| NavigationList on-click-action | list **or** items, never both | `vNavListActionBoth` | Components ref (NavigationList) |
| PhotoPicker / DocumentPicker | 1 each, not together | `vOnePhoto` / `vOneDoc` / `vPhotoDoc` | **Media upload** ref (the components ref doesn't mention either type) |
| Selection needs data-source | required (binding ok) | `vNeedsDataSource` | Components ref |
| `complete` → terminal only | enforced | `vCompleteNonTerminal` | Error codes (`INVALID_COMPLETE_ACTION`) |
| `complete` → Footer only | enforced | `vLinkComplete` | Error codes (`INVALID_ENUM_VALUE`) |
| navigate self-loop | blocked | `vNavSelfLoop` | Error codes (`INVALID_NAVIGATE_ACTION_NEXT_SCREEN_NAME`) |
| `success` → terminal only | enforced | `vSuccessNonTerminal` | Error codes (`NOT_KEYWORD_...`) |
| Footer right-caption needs left | enforced | `vCaptionDep` | Error codes (`INVALID_DEPENDENCIES`) |
| Footer caption combinations | left + right, **or** center alone | `vCaptionMix` | Components ref (Footer): *"not all 3 at once"* |
| Reserved screen id `SUCCESS` | blocked | `vReservedSuccess` | Flow JSON ref |
| Terminal screen needs a Footer | enforced | `vTerminalNoFooter` | Flow JSON ref |
| `open_url` offered on EmbeddedLink / OptIn | yes (Flow JSON 6.0+) | `LINK_ACTIONS` in `propEditor.ts` | Components ref (EmbeddedLink, OptIn) |

---

## The routine

Do this when Meta announces a change (or on a periodic check):

1. **Read the changelog first** (browser MCP — see the fetch gotcha above). It
   names what changed: new version, new/renamed components, new properties,
   changed limits, deprecations.
2. **Locate the code** using [the mapping](#where-each-part-of-the-spec-lives-in-the-code)
   and diff [the pinned values](#current-pinned-values-diff-meta-against-these)
   against the current doc.
3. **Apply the change in the right layer:**
   - *New/changed limit or rule* → edit `src/model/validate.ts` (constant or
     rule) **and** add/adjust the message key in `src/ui/i18n.ts` (en + pt).
   - *New component type* → touch all five files in
     [§2](#2-component-catalogue). Keep component **type names in English**
     (they mirror the spec).
   - *New/changed component property* → `propEditor.ts` (editor) +
     `preview.ts` (mockup) + `components.ts` (generator); widen the `Component`
     interface in `flowTypes.ts` only if a field can be a binding string.
   - *New action* → `ActionName` in `flowTypes.ts` + the action lists in
     `propEditor.ts`.
   - *New Flow JSON version* → bump the `"7.3"` literals in `sample.ts` /
     `templates.ts` (and the `vMissingVersion` hint) **only after** confirming
     the version is GA in the changelog.
4. **Respect the [scope decisions](#intentional-scope-decisions)** — don't
   "fix" something that's deliberately out of scope.
5. **Verify** (see below) and **log** the change in `knowledge/BUGFIXES.md` if it was
   a non-obvious fix, per `knowledge/CLAUDE.md`.

### Verification (must stay green)

```bash
npm run typecheck
npm run build
```

- **Model changes** (`src/model/*`) are unit-testable off-Figma: bundle a
  throwaway with esbuild `--platform=node` and run it (validator, `screenChildren`,
  etc.). Always re-check that `sample.ts` + all `templates.ts` still validate with
  **no errors** (regression).
- **UI changes** (`src/ui/*`) are verifiable in a browser: `cd plugin &&
  python -m http.server 8791` → open `ui.html`, drive with DevTools/JS.
- **Generator changes** (`src/main/*`) can only be fully confirmed **inside
  Figma** (Import from `plugin/manifest.json` → Generate). `typecheck` + `build` is the
  most that's automatable — be conservative and say so.

---

## Intentional scope decisions

These are deliberate; changing them is a product decision, not a spec-sync fix:

- **The builder models the flat, static subset.** `Form` is supported as a
  **transparent read/passthrough container** (see `screenChildren` and
  `knowledge/BUGFIXES.md`) so Form-wrapped flows import — but `Form` is **not** in the
  palette; the builder authors flat.
- **Data Endpoint / dynamic-data flows are out of scope.** Bindings
  (`${data.*}` / `${form.*}`) render as placeholders and can't be resolved. The
  `routing_model`, data-model, and payload-binding error families
  (`INVALID_ROUTING_MODEL`, `INVALID_*_ACTION_PAYLOAD`) are **not** validated —
  they only apply to endpoint flows this builder doesn't produce.
- **The 50-component limit counts real components** (descending into a `Form`),
  but is a **warning** (advisory) — it does not block Generate or Copy, matching
  WhatsApp's own "don't use too many components" guidance.
- **"NavigationList can't be combined with other components on a screen"** stays a
  **warning** (`vNavListCombine`), re-decided 2026-10-20. The components ref states
  it, but no static-validation error code backs it: such a flow still imports, it
  just renders poorly. Promoting it to an error would block Generate on a mockup
  that WhatsApp itself accepts — same reasoning as the 50-component limit.

---

_Last synced against Meta docs: 2026-10-20 (Flow JSON 7.3, data_api_version 3.0/4.0 —
the changelog's latest entry is still 2025-11-11, Data API 4.0, so no version bump;
this pass closed the gaps between the components / error-codes refs and `validate.ts`)._
