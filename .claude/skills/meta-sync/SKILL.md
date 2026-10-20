---
name: meta-sync
description: Reconcile the project with Meta's current WhatsApp Flows spec — new Flow JSON versions, components, properties, limits or validation rules. Use when asked to check, sync or update against Meta's documentation, when a flow the builder calls valid is rejected by the Playground, or before a release that claims spec coverage.
---

# Syncing with Meta's WhatsApp Flows spec

The playbook is [`knowledge/META_SYNC.md`](../../../knowledge/META_SYNC.md):
**read it first.** It maps each Meta doc to the exact code that implements it,
pins the current values so a diff is obvious, and lists what is deliberately out
of scope. This file only carries how to *get* the docs and the shape of the job.

## Fetching the docs

The rendered HTML pages return **HTTP 500 to `WebFetch`** (bot protection), but
appending `.md` to any page path returns clean markdown over plain `curl`:

```bash
B=https://developers.facebook.com/documentation/business-messaging/whatsapp/flows
curl -sS -L -o components.md "$B/guides/components.md"
curl -sS -L -o flowjson.md   "$B/guides/flowjson.md"
curl -sS -L -o changelogs.md "$B/changelogs.md"
curl -sS -L -o errors.md     "$B/reference/error-codes.md"
```

Measured 2026-10-20: this works for **every** page, `changelogs` and
`reference/error-codes` included, and `components.md` is complete (26 sections).
An older note said otherwise — re-measure before trusting either claim.
`$B/llms.txt` is an index of every Flows page with its `.md` link.

The rendered pages serve the reader's locale, so if you fall back to the browser
MCP, search both the English and Portuguese term (`maximum` / `máximo`) — the
section headings are translated too.

## The routine

1. **Changelog first.** It names what changed: new version, new or renamed
   components, new properties, changed limits, deprecations. If its newest entry
   predates the "Last synced" line in META_SYNC.md, the spec has not moved —
   say so plainly instead of inventing work.
2. **Diff the pinned values** in META_SYNC.md against the current docs. A
   difference is the edit.
3. **Apply it in the right layer** — the playbook's mapping says which. A new
   limit is `validate.ts` + an `i18n.ts` key in en *and* pt. A new component
   type touches five files.
4. **Respect the scope decisions.** Data-endpoint flows, the routing model and
   payload-binding error families are deliberately not validated. Don't "fix"
   them.
5. **Update META_SYNC.md itself** — the pinned values table and the "Last
   synced" line. A sync that leaves the playbook stale has to be redone from
   scratch next time.

## Severity

Error level is for what Meta's static validator rejects on import, and for the
per-screen / per-flow component counts. Character limits are warnings — the
renderer truncates, the flow still imports. A rule with no backing line in
Meta's docs does not get error level; put it in `knowledge/BACKLOG.md` with the
question instead.

## Verifying

`npm run typecheck && npm run build` must stay green. The model is testable off
Figma — bundle a throwaway with `esbuild --platform=node` and run it with node.
Always re-check that `sample.ts` and every entry of `templates.ts` still
validate with **no errors and no warnings**, in both languages: that is the
regression that catches a limit set too tight.

Log anything non-obvious in `knowledge/BUGFIXES.md`.
