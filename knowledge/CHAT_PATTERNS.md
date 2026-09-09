# Chat mode — interactive message patterns

The message *types* a conversation can contain: reply buttons, the list menu,
flows, catalogue messages, and template messages. `CHAT_UI.md` covers the chrome
around them (header, wallpaper, bubbles, input bar); this file covers what goes
*inside* a bubble when the message is more than text.

**This is the one part of chat mode with official grounding.** The chrome has none
— Meta publishes no UI kit — but message *content* is specified in two OpenAPI 3.1
documents, and every shape and limit below was extracted from them (or from the
prose docs where the spec omits them). Provenance and how to re-extract is at the
bottom.

Keep the distinction in mind while reading: **the payload is specified, the
rendering is not.** Meta says a list message has ≤10 rows with ≤24-char titles; it
does not say how the row is drawn. So the "renders as" notes are ours, and are
marked where no reference screenshot exists.

## Two families

| | session interactive | template |
|---|---|---|
| sent as | `type: "interactive"` | `type: "template"` |
| needs approval | no | **yes**, per template |
| can start a conversation | no (24-hour window only) | yes |
| defined in | Message API spec | Message Template API spec |

Both end up as a bubble in the thread, so both matter to us. Templates are how a
business *opens* a conversation, which makes them the more common thing to mock up.

---

# Session interactive messages

Sent as `interactive`, with a `type` from this enum — **verbatim from the v25.0
spec**, so nothing outside it exists:

```
button · list · flow · product · product_list · catalog_message · call_permission_request
```

Every variant shares the same optional envelope:

| part | limit | notes |
|---|---|---|
| `header.text` | **60** | or a media header (image/video/document) |
| `header.sub_text` | **60** | |
| `body.text` | **1024** | |
| `footer.text` | **60** | |

`action` is what changes per type. The spec models it as a `oneOf`, so the required
fields below are exclusive — you pick one shape.

## 1. Reply buttons — `type: "button"`

Up to three tappable buttons under the message. The most common "pick one" pattern.

```json
{ "type": "button",
  "body": { "text": "Confirm your appointment for Tuesday 10:00?" },
  "action": { "buttons": [
    { "type": "reply", "reply": { "id": "confirm", "title": "Confirm" } },
    { "type": "reply", "reply": { "id": "reschedule", "title": "Reschedule" } }
  ] } }
```

| field | limit |
|---|---|
| `action.buttons` | **1–3** |
| `reply.title` | **20** — emoji allowed, no markdown, must be unique, non-empty |
| `reply.id` | **256** — no leading/trailing spaces |
| `buttons[].type` | only `reply` |

**Renders as:** the body text, then buttons stacked full-width below it, inside or
attached under the bubble. *No reference screenshot yet — the split between
"inside the bubble" and "attached below it" needs checking.*

## 2. List message — `type: "list"` — **the menu**

A CTA that opens a sheet of grouped, selectable rows. This is the pattern usually
meant by "menu".

```json
{ "type": "list",
  "header": { "type": "text", "text": "Our menu" },
  "body":   { "text": "Pick a category to see today's dishes." },
  "footer": { "text": "Prices include service" },
  "action": {
    "button": "View menu",
    "sections": [
      { "title": "Mains", "rows": [
        { "id": "risotto", "title": "Mushroom risotto", "description": "Arborio, porcini, parmesan" }
      ] }
    ] } }
```

| field | limit |
|---|---|
| `action.button` | **20** — the CTA label; non-empty, unique, emoji ok, no markdown |
| `action.sections` | **1–10** |
| `section.title` | **24** — required once there is more than one section |
| `section.rows` | **max 10** *(per section in the schema; the documented product cap is 10 rows total — verify before relying on more)* |
| `row.title` | **24** |
| `row.description` | **72** — optional |
| `row.id` | **200** |

**Renders as two states**, and both are worth mocking:
1. **in the thread** — the bubble with header/body/footer and a full-width CTA row
   carrying `action.button`;
2. **the open sheet** — a bottom sheet listing section titles and rows, each row a
   title over an optional description, with a radio on the right.

*No reference screenshot yet for either state.*

## 3. Flow — `type: "flow"`

The bridge to the flow builder this plugin already has: a bubble whose CTA opens a
WhatsApp Flow.

```json
{ "type": "flow",
  "body": { "text": "Book a table in a few taps." },
  "action": { "name": "flow", "parameters": {
    "flow_message_version": "3",
    "flow_id": "1234567890",
    "flow_cta": "Book now",
    "flow_action": "navigate"
  } } }
```

| field | limit / values |
|---|---|
| `flow_message_version` | must be `"3"` |
| `flow_cta` | **30** |
| `flow_id` *or* `flow_name` | one is required, never both |
| `flow_action` | `navigate` or `data_exchange` |

**Worth connecting:** the flow this points at is exactly what Flows mode builds. A
mock showing the chat bubble *and* the flow it opens is the strongest artefact this
plugin could produce — and it needs both modes, which is an argument for keeping
them in one plugin.

## 4. Catalogue family — `product`, `product_list`, `catalog_message`

| type | required action fields | notes |
|---|---|---|
| `product` | `catalog_id`, `product_retailer_id` | single product |
| `product_list` | `catalog_id`, `sections` | `section.product_items` **1–30** |
| `catalog_message` | `parameters.thumbnail_product_retailer_id` | opens the catalogue |

These need real product data and imagery to look like anything, so they are the
lowest-value ones to mock. Low priority.

## 5. Call permission request — `type: "call_permission_request"`

Asks the user to allow the business to call them. Newer, and it also exists as a
template category. Only `name` is required on the action.

---

# Template messages

Pre-approved, and the only way a business can start a conversation. Composed of
components rather than an `action`.

**Structure:** 1 header (optional) · 1 body (**required**) · 1 footer (optional) ·
**up to 10 buttons** (optional).

```json
{ "name": "order_ready", "language": "en_US", "category": "UTILITY",
  "components": [
    { "type": "HEADER", "format": "TEXT", "text": "Order {{1}} is ready" },
    { "type": "BODY",   "text": "Pick it up until {{2}} today." },
    { "type": "FOOTER", "text": "Aurora Books" },
    { "type": "BUTTONS", "buttons": [
      { "type": "QUICK_REPLY", "text": "On my way" },
      { "type": "URL", "text": "Track order", "url": "https://example.com/{{1}}" }
    ] } ] }
```

| enum | values |
|---|---|
| component `type` | `HEADER` · `BODY` · `FOOTER` · `BUTTONS` · `CAROUSEL` · `LIMITED_TIME_OFFER` |
| header `format` | `TEXT` · `IMAGE` · `VIDEO` · `DOCUMENT` · `LOCATION` |
| button `type` | `QUICK_REPLY` · `URL` · `PHONE_NUMBER` · `COPY_CODE` · `FLOW` · `MPM` · `CATALOG` · `OTP` |
| `otp_type` | `COPY_CODE` · `ONE_TAP` · `ZERO_TAP` |
| `category` | `MARKETING` · `UTILITY` · `AUTHENTICATION` · `FREE_SERVICE` |
| `parameter_format` | `NAMED` · `POSITIONAL` |

Button shapes: `URL` takes `url` (+ `example` when it has a variable),
`PHONE_NUMBER` takes `phone_number`, `FLOW` takes `flow_id` + `flow_action` +
`navigate_screen`, `OTP` takes `otp_type` (and for `ONE_TAP`, `autofill_text` +
`package_name` + `signature_hash`).

### Template limits — from the prose, not the spec

The Template API OpenAPI carries **zero** length constraints (checked: no
`maxLength` anywhere in it). These come from the custom-template prose doc:

| field | limit |
|---|---|
| body text | **1024** |
| footer text | **60** |
| quick-reply button label | **25** |
| URL button label | **25** |
| phone-number button label | **25** |
| phone number itself | **20** |
| template name | **512** |

Note the button labels are **25** for templates but **20** for session reply
buttons — an easy detail to get wrong in a validator.

**Renders as:** header (text or media), body, footer in a smaller muted style, then
buttons as full-width rows divided by hairlines, each with a leading glyph for its
type (arrow for URL, phone for PHONE_NUMBER, copy for COPY_CODE). *Inferred; not
yet checked against a screenshot.*

---

## Consolidated limits

Everything above in one place, for whatever validator eventually gets written:

| context | field | limit | source |
|---|---|---|---|
| interactive (any) | `header.text`, `header.sub_text` | 60 | spec |
| interactive (any) | `body.text` | 1024 | spec |
| interactive (any) | `footer.text` | 60 | spec |
| media | `caption` | 1024 | spec |
| reply buttons | count | 1–3 | spec |
| reply buttons | `reply.title` | 20 | spec |
| reply buttons | `reply.id` | 256 | spec |
| list | `action.button` | 20 | spec |
| list | `sections` | 1–10 | spec |
| list | `section.title` | 24 | spec |
| list | `rows` | 10 | spec |
| list | `row.title` | 24 | spec |
| list | `row.description` | 72 | spec |
| list | `row.id` | 200 | spec |
| flow | `flow_cta` | 30 | spec |
| product list | `product_items` | 1–30 | spec |
| contacts | `contacts` | 1–5 | spec |
| template | components | 1 header / 1 body / 1 footer / ≤10 buttons | prose |
| template | body / footer | 1024 / 60 | prose |
| template | button labels | 25 | prose |
| template | name | 512 | prose |

## What the spec does not give us

- **Any rendering detail.** No sizes, colours, spacing, or glyphs. That comes from
  screenshots, the same way the chrome was calibrated (`CHAT_UI.md` → Provenance).
- **No screenshots of these patterns.** The one official conversation screenshot
  found so far shows text, audio and image bubbles only. Reply buttons, the list
  sheet and template buttons have **no visual reference yet** — so every "renders
  as" note above is an inference, and is labelled as one.

## Suggested model growth (draft)

`Message.type` currently covers `text | image | video | document | audio`. These
patterns are a second axis — a message is text *or* media *and* may carry an
interactive part — so they belong in their own optional field rather than as more
`type` values:

```ts
type Interactive =
  | { kind: "buttons"; buttons: { id: string; title: string }[] }        // ≤3, title ≤20
  | { kind: "list"; cta: string; sections: { title?: string;             // cta ≤20
        rows: { id: string; title: string; description?: string }[] }[] }
  | { kind: "flow"; cta: string }                                        // cta ≤30
  | { kind: "template"; header?: ...; footer?: string;
      buttons: { type: TemplateButtonType; text: string }[] };           // ≤10, text ≤25
```

Deliberately narrower than the API: a mockup needs what is *drawn*, so `catalog_id`,
`signature_hash` and friends stay out until something actually renders them.

## Provenance

Two official OpenAPI 3.1 specs, both fetchable with plain `curl` (unlike the HTML
docs, which return 500 — see `META_SYNC.md`):

```
.../reference/whatsapp-business-phone-number/message-api/v25.0.openapi.yaml   (~98 KB)
.../reference/whatsapp-business-account/message-template-api/v25.0.openapi.yaml (~51 KB)
```

both under `https://developers.facebook.com/documentation/business-messaging/whatsapp`.

Template length limits came from
`.../templates/marketing-templates/custom-marketing-templates.md`.

To re-extract the limits, walk the YAML tracking indentation and print every
`maxLength` / `maxItems` / `minItems` with its enclosing property path — a plain
grep loses which field a number belongs to, which is how "button label 20 vs 25"
gets mixed up. Pin the version (`v25.0`) so a spec bump is a visible diff.
