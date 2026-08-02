# WhatsApp Flows Builder (Figma plugin)

Turns the [WhatsApp Flows Playground](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/playground)
into a Figma plugin: compose flow screens from a component palette, edit the
**Flow JSON** live (two-way sync), export it, and click **Generate in Figma** to
render navigable, WhatsApp-styled mockups on the canvas.

## What it does

- **Palette** — add WhatsApp Flows components to a screen (text, inputs,
  selection, media, footer).
- **Screens** — add / remove / rename screens, mark terminal screens.
- **Flow JSON tab** — a live editor kept in sync with the visual builder in both
  directions; invalid JSON is flagged, never applied.
- **Copy JSON** — export a Flow JSON ready to paste into WhatsApp Manager.
- **Generate in Figma** — draws one phone-sized frame per screen (status bar,
  header, body, footer) with WhatsApp visual tokens, and wires `navigate`
  actions into **prototype reactions** so the frames form a clickable prototype.
  The entry screen becomes the prototype starting point.

## Component coverage (v1)

Text (`TextHeading`, `TextSubheading`, `TextBody`, `TextCaption`, `RichText`),
inputs (`TextInput`, `TextArea`, `DatePicker`, `OptIn`), selection
(`RadioButtonsGroup`, `CheckboxGroup`, `Dropdown`, `ChipsSelector`), media
(`Image`, `EmbeddedLink`) and `Footer`.

> Server-driven behavior (`data_exchange`, `complete`, `If`/`Switch`, dynamic
> `${data}` lists) renders as a representative static state — Figma prototypes
> can't execute an endpoint. Only `navigate` becomes a real prototype link.

## Develop

```bash
npm install
npm run build      # -> dist/code.js + dist/ui.html
npm run watch      # rebuild main on change
npm run typecheck
```

## Load in Figma

1. Figma desktop → **Plugins → Development → Import plugin from manifest…**
2. Select `manifest.json` in this folder.
3. Run **WhatsApp Flows Builder** from the Plugins menu.

## Architecture

```
src/model/      Flow JSON types, component palette, sample flow
src/shared/     UI <-> main message contract
src/main/       Figma sandbox: theme tokens, node helpers, chrome,
                per-component renderers, screen assembly, prototype routing
src/ui/         Plugin UI (playground): palette, screen manager, live JSON editor
esbuild.mjs     Bundles main (dist/code.js) and inlines the UI (dist/ui.html)
```
