# Chat mode — design spec

A second mode for the plugin: compose a **WhatsApp conversation** and generate it as
Figma frames, the way Flows mode does for flow screens. Viability and the Meta
research behind it are in `BACKLOG.md`; this file is the design.

Read `CLAUDE.md` first — the two-runtime-contexts rule, `markFill`/`applyFills`, and
"the WhatsApp mockup must look like WhatsApp" all apply here unchanged.

## The one structural difference from Flows mode

Flows mode is **spec-driven**: Flow JSON dictates the model, the validator enforces
Meta's rules, and the renderer visualises whatever the spec allows.

Chat mode has **no spec to conform to** — Meta publishes no conversation format and
no UI kit (checked; see `BACKLOG.md`). So:

- the message model is **ours to define**, and it should stay small,
- there is no mandatory validation and no version to track,
- **fidelity is the whole product.** The only measure of correctness is "does it look
  like WhatsApp", which makes this calibration work, not conformance work.

That inverts how we verify. In Flows mode a wrong value is a spec violation we can
look up; here it's a pixel that has to be compared against the real app.

## Where it plugs in

| concern | Flows mode | chat mode |
|---|---|---|
| tab | Build / Preview / Flow JSON | **+ Chat** (4th tab, same `data-tab` machinery) |
| model | `src/model/flowTypes.ts` | `src/model/chatTypes.ts` (new, pure) |
| tokens | `src/main/theme.ts` `Palette` | same file, extended (below) |
| preview | `src/ui/preview.ts` | `src/ui/chat.ts` (new) |
| generator | `src/main/screen.ts` + `components.ts` | `src/main/thread.ts` (new) |
| contract | `src/shared/messages.ts` | same file, a `generateChat` message |

Everything else is shared as-is: build pipeline, `postMessage`, dropdown, icons,
i18n, menu/prefs, the dated section with embedded JSON, Generate feedback, and the
`plugin-ui-tester` subagent.

The preview reads tokens through the `--wa-*` CSS vars that `applyThemeVars()`
pushes (`src/ui/preview.ts`), so chat CSS gets theming for free by using those same
vars. New tokens go into that map — never hardcoded in CSS.

## Palette additions

`Palette` already carries the two colours that are hardest to guess, and they are
already correct: `chipSelectedBg` is `#D9FDD3` — the outgoing bubble green — and
dark `link` is `#53BDEB`, the read-tick blue. Chat mode needs six more per theme:

| token | light | dark | use |
|---|---|---|---|
| `bubbleIn` | `#FFFFFF` | `#202C33` | incoming bubble |
| `bubbleOut` | `#D9FDD3` | `#005C4B` | outgoing bubble |
| `wallpaper` | `#EFEAE2` | `#0B141A` | thread background |
| `tick` | `#53BDEB` | `#53BDEB` | read receipt (same in both themes) |
| `chatHeader` | `#F0F2F5` | `#202C33` | conversation header + input bar |
| `systemPill` | `#FFEECC` | `#182229` | encryption / date notices |

Treat these as **starting values to calibrate**, not as spec — curated
approximations, in the same spirit as the existing `COLOR_DARK` comment. The
calibration step below is how they get confirmed.

## Anatomy

Top to bottom, inside the existing `.wa-phone` frame:

1. **status bar** — reuse as-is (`statusBar()` / `.wa-status`).
2. **conversation header** — back chevron, avatar, name over a presence line
   ("online" / "last seen ..."), then video, call and overflow icons.
3. **thread** — the scrolling area, on `wallpaper`. Messages are anchored to the
   **bottom**: a short conversation leaves empty wallpaper above it, not below.
   (`margin-top: auto` on the first child, not `justify-content: flex-end` — the
   latter clips the top once the thread overflows.)
   - **date divider** — a centred pill ("TODAY").
   - **encryption notice** — a one-off centred pill, first thing in a thread.
   - **message rows** — a bubble aligned left (incoming) or right (outgoing),
     max ~75% of the thread width, hugging its content.
   - **grouping** — consecutive messages from the same side tighten their vertical
     gap, and only the *first* of a run carries the tail.
4. **input bar** — emoji icon, rounded field ("Message"), attach and camera icons,
   then a mic button.

### Inside a bubble

- the text, then a **meta row**: time, plus for outgoing a tick glyph
  (single = sent, double = delivered, double in `tick` blue = read).
- optional **quoted reply block** above the text: a left accent bar, the quoted
  author, and one line of the quoted text.
- media variants: image, video (with a play badge), document (icon + filename +
  size), audio (avatar + waveform + duration).

## Decided trade-offs

**1. The timestamp does not sit inline with the text.**
Real WhatsApp embeds the time bottom-right *inside* the last text line, reserving
space so the text reflows around it. Neither CSS nor Figma auto-layout can do that —
it needs shape-aware text flow. We put the meta row on **its own row**,
right-aligned. It costs one line of height on short messages, where it is visibly
not pixel-identical. Accepted deliberately, because the alternatives are worse:
hand-measuring text to fake the inset breaks on every font and locale change, and
absolutely positioning the time over the text overlaps real content.

**2. The bubble tail is a vector, not a border-radius.**
It is an asymmetric notch, so `cornerRadius` cannot express it. In the preview a CSS
pseudo-element is fine; in the generator use `figma.createNodeFromSvg` + `rescale`,
the approach the status-bar icons already take (BUGFIXES #37/#38).

**3. The wallpaper is a flat colour.**
The doodle pattern is a proprietary Meta image. Flat `wallpaper` colour only —
better legally, and a cleaner mockup base.

**4. No WhatsApp marks.**
Meta's Brand Resource Center licenses the logo under conditions we do not want to
inherit. Draw all chrome ourselves; never embed WhatsApp logos or wordmarks.

**5. Avatars and emoji are placeholders.**
The same base64 problem `Image` has in Flows mode. Default to a monogram circle and
let the user paste a base64 image later.

## Message model (draft)

Ours to define, so it stays deliberately small. A sketch, not final:

```ts
type Direction = "in" | "out";
type Status = "sent" | "delivered" | "read";

interface Message {
  id: string;
  direction: Direction;
  type: "text" | "image" | "video" | "document" | "audio";
  text?: string;
  time?: string;   // display string, not a timestamp — a mockup is not a clock
  status?: Status; // outgoing only
  replyTo?: { author: string; text: string };
  media?: { src?: string; name?: string; size?: string; duration?: string };
}

interface Thread {
  contact: { name: string; presence?: string; avatar?: string };
  messages: Message[];
  showEncryptionNotice?: boolean;
  dateLabel?: string;
}
```

`time` is a display string on purpose: a mockup wants "09:41", not a live clock, and
a string keeps the model free of timezone questions.

## Phases

1. **Preview fidelity** — the thread rendered in the plugin's HTML preview: header,
   text bubbles both directions, tail, meta row with ticks, date and encryption
   pills, input bar, light and dark. Verifiable in a browser, so this is where
   calibration happens. *Built (structure + geometry verified); the colour and
   spacing calibration below is still open.*
2. **Figma generator** — the same thread as frames, reusing `markFill`/`applyFills`
   and the dated-section round-trip. *Built; only verifiable inside Figma.*
3. **Composer** — the authoring UI, reusing the existing card machinery
   (drag-reorder + accordion) rather than inventing an interaction.
4. **Media and extras** — image/video/document/audio bubbles, quoted replies.
5. *(optional)* **Template-accurate bubbles** — render a real WhatsApp template
   message, using the official OpenAPI specs noted in `BACKLOG.md` for button types.

Phase 1 first and on its own: if the bubbles do not look right, nothing downstream
matters.

## How to verify

Phase 1 is UI, so it follows the normal path — serve `plugin/` and drive it in a
browser (`CLAUDE.md` → *How to verify changes*), and hand a full pass to the
`plugin-ui-tester` subagent.

**Calibration is a separate, manual step, and it needs you.** Geometry and computed
styles can be measured, but "does this look like WhatsApp" cannot be asserted from
inside the browser. Take a real WhatsApp screenshot at the same width and compare
side by side. Until that happens, the token values above and every padding are
**unconfirmed**, and should be described that way.

Phase 2 is generator code: `typecheck` + `build` is all that can be checked
automatically; a real run in Figma is required.

## Generator notes (`src/main/thread.ts`)

Things the Figma side forces that the CSS side doesn't:

- **The scroll area must be named `body`.** `enforceMinHeight()` in `index.ts`
  finds the child by that name to absorb the slack when a short thread is padded
  to the standard phone height. Rename it and the input bar stops being pinned to
  the bottom.
- **Bottom anchoring** is `primaryAxisAlignItems = "MAX"` on a vertically-filling
  frame — the counterpart of the CSS `margin-top: auto`. It only works because the
  frame fills; on a hugging frame, alignment is a no-op.
- **Grouping needs one frame per run.** Figma auto-layout has a single item
  spacing per frame and no per-child margin, so tightening a run can't be done by
  poking the row — each run of same-direction messages gets its own frame
  (`ROW_GAP` between runs, `GROUPED_GAP` inside).
- **There is no max-width.** A bubble's text is measured at its natural width and
  rebuilt at a fixed width only if it exceeds the 75% cap.
- **The section is shared.** `placeInSection()` in `index.ts` is used by both
  modes, so a run looks identical whichever produced it.
- The embedded round-trip payload is tagged `{ mode: "chat", thread }`. Flow mode
  still writes the bare Flow JSON, so sections generated before chat mode existed
  keep re-importing; the flow reader requires `screens[]`, so it declines a chat
  section rather than mis-importing it. No chat importer yet.

## Open questions

- Does chat mode share the Generate button and the dated section, or get its own?
  (Leaning: share both — one section per run, chat frames inside it.)
- One frame per thread, or one frame per "scroll state", so long threads stay
  readable on the canvas?
- ~~Does the round-trip JSON need to record which mode produced it?~~ Answered:
  yes, chat sections embed `{ mode: "chat", thread }`. The importer that reads it
  back still has to be written.
