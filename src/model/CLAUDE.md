# `src/model` — the pure, shared layer

Imported by **both** runtimes, so it must compile with neither the DOM nor the
`figma` API. Both `build/tsconfig.main.json` and `build/tsconfig.ui.json`
include this directory, which is what proves it.

Full guide: [`knowledge/CLAUDE.md`](../../knowledge/CLAUDE.md).

## The one rule the compiler does *not* enforce

**Never import from `src/ui` or `src/main`.** The tsconfigs catch a stray
`document.*` or `figma.*`, but nothing stops `import { t } from "../ui/i18n"` —
and that would drag the UI's dictionary into the Figma sandbox bundle.
`src/shared` is fine (it is types only); the other direction is not.

The consequence shows up in `validate.ts`: it returns message **keys plus
params**, never translated strings, because the sandbox has no translator. The
UI is what calls `t()`.

## Authored content is localized; identifiers are not

`templates(lang)` and `sampleFlow(lang)` return the starter flows written in the
plugin's language. What never gets translated is anything the Flow JSON refers
to **by name**: screen ids, input `name`s, `data-source` ids, the keys of a
screen's `data` schema, and the `${form.*}` / `${data.*}` bindings that read
them. Translating those breaks the references and changes nothing a user reads.

The regression test is cheap and worth re-running after any edit to the
templates: strip the copy from the en and pt flows and they must be
byte-identical.

## Changing the spec surface

Component types, limits and validation rules mirror Meta's published spec. Do
not adjust a number from memory — follow
[`knowledge/META_SYNC.md`](../../knowledge/META_SYNC.md), which maps each Meta
doc to the exact code and pins the current values, or invoke the `meta-sync`
skill. Adding a component type touches five files; that list is in the playbook.

## Severity convention in `validate.ts`

- **error** — what Meta's static validator rejects on import (the error-codes
  reference), and the per-screen / per-flow component counts the components
  reference fixes. Errors block Generate and Copy.
- **warning** — character limits, and advisory guidance. The renderer truncates
  or drops the overflow; it still imports.

A rule with no backing line in Meta's docs does not get error level.
