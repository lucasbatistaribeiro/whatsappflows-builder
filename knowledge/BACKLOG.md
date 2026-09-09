# Backlog

Ideas accepted but not started, newest first. Each entry carries the research
already done, so picking it up doesn't mean redoing the investigation. Delete an
entry when it ships (and log anything non-obvious in `BUGFIXES.md`) or when it's
decided against — say which in the commit.

Status: **idea** (no design yet) · **ready** (approach settled) · **blocked**.

---

## Chat UI: generate WhatsApp conversation screens

**Status:** in progress on `feat/chat-mode` · raised 2026-08-05 · design spec: `CHAT_UI.md`

Same idea as the Flows generator, but for the **WhatsApp chat interface**: compose
a conversation in the plugin (bubbles in/out, header, input bar) and Generate it as
Figma frames. A new tab beside Build / Preview / Flow JSON — not a second plugin,
since the shell is the expensive part and it already exists.

### What's official from Meta (checked, don't re-check)

- **There is no official UI kit.** The Brand Resource Center
  (`meta.com/brand/resources/whatsapp/whatsapp-brand/`) publishes the logo and brand
  guidelines only — no Figma file, no mockups, no device frames — and its use is
  conditioned on accepting those guidelines. So don't embed WhatsApp marks; draw the
  chrome ourselves.
- **There is no official "conversation" format.** Meta specs one message at a time,
  so the message script would be **our own** format. The opposite of Flows, where
  Flow JSON dictates the model.
- The template docs don't publish how a template renders in the chat, and there's no
  public conversation playground (the editor with live preview is inside WhatsApp
  Manager, behind a business login).
- Upside: **no spec to conform to.** No mandatory validation, no version to track —
  this is pure rendering. Fidelity comes from matching the real app, which is already
  the rule in `CLAUDE.md` ("The WhatsApp mockup must look like WhatsApp").
- Two **official OpenAPI 3.1 specs** exist for message *content*, and they download
  with plain `curl` (unlike the Flows HTML docs, which 500):
  - Message API — `.../whatsapp-business-phone-number/message-api/v25.0.openapi.yaml`
    (~98 KB, ~60 examples; carries `maxLength`/`maxItems`)
  - Message Template API — `.../whatsapp-business-account/message-template-api/v25.0.openapi.yaml`
    (~51 KB; components HEADER/BODY/FOOTER/BUTTONS/CAROUSEL/LIMITED_TIME_OFFER,
    button types QUICK_REPLY/URL/PHONE_NUMBER/COPY_CODE/FLOW/MPM/CATALOG/OTP,
    categories MARKETING/UTILITY/AUTHENTICATION/FREE_SERVICE — but **no** length
    limits, those stay in the prose docs)
  Only needed for phase 3 (template-accurate bubbles); phases 1–2 don't touch them.

### Reuse (already built)

`statusBar()`, the light/dark palette — which already holds `#D9FDD3` (the outgoing
bubble green, as `chipSelectedBg`) and `#53BDEB` (the tick blue, as dark `link`) —
`markFill`/`applyFills`, fonts, `DEVICE 360x780`, and the whole shell: build,
postMessage contract, dropdown, icons, i18n, menu/prefs, the dated section with
embedded JSON, Generate feedback, and the `plugin-ui-tester` subagent.

### To build

- **Palette:** ~6 new tokens x 2 themes — `bubbleIn`, `bubbleOut`, `wallpaper`,
  `tick`, `chatHeader`, `systemPill`.
- **Chrome:** chat header (back, avatar, name, presence, video/call/menu) and the
  input bar (emoji, field, attach, camera, mic).
- **Bubbles:** in/out, tail, timestamp + ticks (sent/delivered/read), sender
  grouping, ~75% max width.
- **Extras:** date divider pill, end-to-end-encryption system pill, quoted reply
  block, media bubbles (image/video/document/audio waveform), typing indicator.
- **Model:** a message script — direction, type, text, time, status. Ours to define.
- **UI:** a composer, which can reuse the existing card machinery (drag-reorder +
  accordion) instead of a new interaction.

### Known hard parts

1. **Timestamp inline with the text.** WhatsApp embeds the time bottom-right *inside*
   the bubble and reflows the text around it, reserving space. Auto-layout can't do
   that. The usual approximation is to drop the time onto its own row past a text
   length — **decide this deliberately up front**; it's the one place fidelity will
   slip.
2. **The bubble tail** is an asymmetric shape, so `cornerRadius` won't do it — needs
   a vector (`figma.createNodeFromSvg`, as the status-bar icons already do).
3. **Content-driven heights everywhere** — squarely the BUGFIXES #36 territory, but
   `markFill` already handles it.
4. **Wallpaper:** the doodle pattern is a proprietary image. Use a flat colour —
   cleaner and safer.
5. **Avatars / emoji** need real assets (the same base64 problem as `Image` in Flows).

### Phases

1. Text bubbles in/out, chat header, input bar, date divider, ticks, light + dark,
   one frame per conversation. Covers most real use.
2. Media, quoted reply, audio.
3. Optional: template-accurate bubbles, using the OpenAPI specs above for button
   types and limits.

---

## Chat list screen (chat mode, later phase)

**Status:** idea · raised 2026-09-08

Chat mode renders a conversation. The **chat list** — the screen you land on — is a
second screen type worth having: it's the reference Lucas actually had on hand, and
mockups often need the inbox as well as a thread.

Structure (from that reference and the official Play Store screenshots): a white
header with the wordmark and camera/overflow icons, a search pill, filter chips
(All / Unread / Groups), then rows of avatar + name + message preview + time, with
an unread count badge, a pin glyph, and a media-type prefix icon on the preview
("Video", "Sticker", "GIF"). A green FAB, and bottom navigation
(Chats / Updates / Communities / Calls).

Note the design era: the older layout had a **green top bar**; the current one is
white with a green wordmark and bottom navigation. Pick one deliberately — the
palette in `CHAT_UI.md` is measured from the current Android design.

---

## Phase 3 of Playground parity: Android vs iOS chrome

**Status:** ready · planned 2026-08-04, never started

Phases 1 (interactive mode) and 2 (WhatsApp light/dark) shipped. The remaining gear
menu option from Meta's Playground is **OS**: the `os` field already rides in
`GenOptions`/`Prefs` and persists, but nothing consumes it — `src/main/chrome.ts`
renders one status bar and one header regardless. The work is an iOS variant of the
status bar (time centred/left, different icon set, no square/back nav) and of the
header, selected by `options.os`.
