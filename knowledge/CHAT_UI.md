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

## Chat is a mode, not a tab

The two generators are switched by a segmented control in the top bar, right of the
hamburger. They are separate products that happen to share a shell: different model,
different panels, different Generate payload, and a validator that only applies to
one of them.

What the switch does:

- swaps the panel — Chat has one view so far, so the **Flows tab row and screen
  rail are hidden** rather than left sitting there empty;
- **hides the validation badge**, which reports Flow JSON problems and says nothing
  about a conversation. Leaving it up in chat mode just misleads;
- **lifts the validation gate**: a broken flow must not block generating a
  conversation, so `Generate` stays enabled in chat mode;
- routes `Generate` to `generateChat` instead of `generate`;
- **remembers the Flows tab** you were on, so switching away and back doesn't reset
  you to Build;
- persists in `Prefs.mode`, so the plugin reopens in the generator last used.

## Where it plugs in

| concern | Flows mode | chat mode |
|---|---|---|
| entry point | the Flows tabs | **a mode**, switched in the top bar next to the hamburger |
| model | `src/model/flowTypes.ts` | `src/model/chatTypes.ts` (new, pure) |
| tokens | `src/main/theme.ts` `Palette` | same file, extended (below) |
| preview | `src/ui/preview.ts` | `src/ui/chat.ts` (new) |
| composer | `src/ui/ui.ts` + `propEditor.ts` | `src/ui/chatComposer.ts` (new) |
| palette | `src/model/palette.ts` | `src/model/chatPalette.ts` (new, same shape) |
| drag-reorder | — | `src/ui/drag.ts`, now shared by both |
| generator | `src/main/screen.ts` + `components.ts` | `src/main/thread.ts` (new) |
| contract | `src/shared/messages.ts` | same file, a `generateChat` message |

Everything else is shared as-is: build pipeline, `postMessage`, dropdown, icons,
i18n, menu/prefs, the dated section with embedded JSON, Generate feedback, and the
`plugin-ui-tester` subagent.

The preview reads tokens through the `--wa-*` CSS vars that `applyThemeVars()`
pushes (`src/ui/preview.ts`), so chat CSS gets theming for free by using those same
vars. New tokens go into that map — never hardcoded in CSS.

## Palette additions

Chat mode adds six tokens per theme. These are **measured**, not guessed —
sampled from WhatsApp LLC's own Play Store screenshots (see Provenance below):

| token | light | dark | use |
|---|---|---|---|
| `bubbleIn` | `#FFFFFF` | `#1D272B` | incoming bubble |
| `bubbleOut` | `#CFFFCF` | `#004F37` | outgoing bubble |
| `wallpaper` | `#F4F1E9` | `#091015` | thread background |
| `tick` | `#53BDEB` | `#53BDEB` | read receipt (same in both themes) |
| `chatHeader` | `#FFFFFF` | `#091015` | conversation header + input bar |
| `systemPill` | `#FFEFD1` | `#182229` ¹ | encryption / date notices |

¹ the only one still a guess — no encryption pill was visible in the dark
screenshot that was sampled.

In light mode the header measures the **same white as an incoming bubble**; the
bubble's shadow is what separates them. In dark mode the header measures the same
as the wallpaper (an edge-to-edge header).

### Provenance, and why the first guesses were wrong

The first pass used `#EFEAE2` (wallpaper) and `#F0F2F5` (header). Both are
WhatsApp **Web** values — and this mocks **Android** (`DEVICE` is 360×780 with
Android screen heights), which is why they were consistently off rather than
randomly off. Worth remembering the next time a colour "looks nearly right".

Meta publishes no UI kit and no measurable UI screenshots in its developer docs —
checked twice; the only real image on the components page is the brand logo, whose
greens (`#2CB741`–`#54CE61`) are the logo gradient, not UI tokens. What *is*
official and measurable: **the app's own Play Store listing**, published by
WhatsApp LLC. Those screenshots serve with permissive CORS, so they can be drawn
to a canvas and sampled.

To re-measure: open `play.google.com/store/apps/details?id=com.whatsapp`, take a
portrait screenshot's URL, request it at `=w1080`, find the phone's horizontal
bounds by scanning a row for where the marketing background ends (it was
`#FDF5EA`, x 145→935 of 1080), then sample a 5×5 patch and take its median so an
antialiased edge can't skew the reading.

**Caveat that has to stay attached to these numbers:** they come from *marketing*
screenshots, which may be colour-graded, and were served resized. Several
independent samples agreed, which is reassuring but not proof. A screenshot taken
on a real device would still beat this.

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

## No scrollbars inside the phone

A phone doesn't show a scrollbar, so the mockup mustn't either.

**Preview:** the stylesheet themes scrollbars globally for the plugin chrome, and
that reached into the mockup — an 11px desktop scrollbar inside a phone frame. The
rules are now cancelled inside `.wa-phone` (`scrollbar-width: none` plus the
`::-webkit-scrollbar` reset), scoped so the chrome keeps its own. Scrolling still
works by wheel, trackpad and touch; only the track is hidden.

**Generated Figma frames:** there is nothing to fix — no code sets
`overflowDirection`, so a Figma frame never shows a scrollbar. What happens instead
is that the frame **grows to fit the conversation**: `enforceMinHeight` only pins a
height when the content is *shorter* than the standard phone height, so nothing is
ever clipped. The consequence worth knowing is the other one: a long thread makes a
frame taller than a phone. Capping it to one screen height would trade a scrollbar
for hidden content, which is why it isn't done — but it's a real choice, not an
oversight.

## Decided trade-offs

**1. The timestamp does not sit inline with the text.** *(Confirmed as a real
divergence: the official screenshot clearly shows the time and blue double-tick
sitting inline at the bottom-right of the last text line.)*
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
   calibration happens. *Built; colours calibrated from official screenshots.
   Spacing and type sizes are still uncalibrated.*
2. **Figma generator** — the same thread as frames, reusing `markFill`/`applyFills`
   and the dated-section round-trip. *Built; only verifiable inside Figma.*
3. **Composer** — the authoring UI. *Built.* Reuses the Flows card machinery
   (grip + accordion + drag) and its CSS, so there is one interaction to learn,
   not two. Chat mode gained its own **Compose / Preview** tab row, since it now
   has two views.

   The composer is where the official limits from `CHAT_PATTERNS.md` are actually
   *felt*: `maxlength` on every capped field and an "add" button that disables at
   the cap and says why (`Button (3/3)`), so an over-long label can't be typed
   rather than being flagged afterwards. `LIMITS` is read for every one — no
   literals.

   Messages are added from the **same grouped, searchable picker** the Flows
   palette uses (`src/model/chatPalette.ts` mirrors `palette.ts` entry for entry),
   so adding a list menu is the same gesture as adding a `RadioButtonsGroup`.
   Entries arrive **fully formed** — a list menu comes with a section and two
   rows, a template with header, footer and buttons — because something you have
   to assemble from empty fields hasn't really been "added".

   The list editor also carries **"Show the menu open"** — the switch between the
   list's two states. It's a property of the message, so the preview never decides
   it, and it's exclusive across messages because the sheet is an overlay.

   Known gap, deliberate: the list editor exposes **one section**. The model and
   the renderer both support up to 10; multi-section authoring needs a nested
   repeatable UI that isn't worth it until someone asks.
4. **Media and extras** — image/video/document/audio bubbles, quoted replies.
   *Built.* Grounded on the one official conversation screenshot for audio and
   image; document is inferred.

   Two details that came from that screenshot rather than from guessing: a voice
   note is `[play] [playhead + waveform] [avatar with a mic badge]` with the
   duration on the left of the row below and the meta on its right; and on an
   image the **meta is overlaid on the media**, bottom-right over a dark scrim,
   not on a row underneath. The overlay only applies when there's no caption —
   with one, the meta hangs under the caption instead.

   Divergence in the Figma renderer: the overlay needs absolute positioning
   inside auto-layout, so there the meta stays a row below the media. Base64
   media is not decoded either, so the generator draws the tinted placeholder —
   the same gap `Image` has in Flows mode.
5. **Interactive patterns** — reply buttons, the list menu, flows and template
   bubbles. *Built, in both renderers.* Shapes and limits are official
   (`CHAT_PATTERNS.md`); the layout is our reading, since no screenshot of these
   patterns exists in either official listing.

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
