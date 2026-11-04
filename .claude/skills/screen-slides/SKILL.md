---
name: screen-slides
description: Document a plugin screen or state as a slide in the Figma file — title, description and the screens on a stage against near black. Use when a new screen, route or visual state needs documenting in Figma, when asked to document or redraw the screens, or when the slides have drifted from the code.
---

# Documenting a screen as a slide

The slides live on the **`New`** page of the Figma file *Flows Builder*
(`FhzvBsgVbtp6eIoZ54aWBs`). The written half is
[`knowledge/NEW_UI.md`](../../../knowledge/NEW_UI.md) — the anatomy table, the
component map and the decisions are there, and a change to the slides is not
done until that file says the same thing.

## The rule that decides everything

**A slide is a place in the product, not a frame.** One route and its states
is one slide; a rail destination and its screens is one slide; a screen and
the library it opens is one slide. Seven frames of the flow home as seven
slides read as seven routes, which they are not.

So before drawing: ask what *place* this screen belongs to, and whether that
place already has a slide. Most new work joins an existing stage.

## Anatomy

| | |
|---|---|
| slide | section, `#0B0B0B`, height 1624 |
| title | 48/SemiBold white at 100, 100 |
| description | 20/Regular `#9F9F9F`, 578 wide, at 100, 180 |
| roll-call | 20/Regular at 100, `180 + desc.height + 44`, line-height 150% |
| stage | nested section, `#1B1B1B`, height 1424, at 901, 100 |
| screen | 578×1224 at y 100, x `100 + n·678` |

Stage width is **`678n + 100`** for n screens — 778, 2134, 4846 for one,
three and seven — and the slide is `901 + stage + 100`. A one-screen slide is
the exception: 1756 wide with its stage at 878, which predates the rest and is
the only inconsistency left.

A grouped slide's left column carries a **roll-call**: the heading *"Da
esquerda para a direita"*, then one line per screen in stage order, each name
in white Medium and the rest in grey, separated by ` — `. Without it the
reader counts screens to work out which is which.

## Get the content from the code, not from taste

Every state drawn so far exists in the source, and the slide is wrong if it
shows one that does not:

- the four Generate faces are the branches of `paintGenerate` in `src/ui/ui.ts`;
- the skeleton is what `body.generating` paints in `src/ui/ui.html`;
- the error ring is `.ui-card.err`, the banner tones are `banner()`'s union;
- the picker's check-vs-circle is `row({ icon: on ? "check" : o.icon ?? "circle" })`.

Read the route in `ui.ts` and the rules in `chrome.css` before drawing, and
quote them in the description. "What the code does" is the whole value of
these slides; a pretty invention is worse than no slide.

## Figma traps, all of them paid for

- **Check the file first.** `figma.root.name === 'Flows Builder'` at the top of
  every script. The Desktop Bridge follows whatever document is open, and it
  has silently pointed at another project mid-session.
- **`resize()` freezes the auto-layout axis.** A frame built with
  `primaryAxisSizingMode = 'AUTO'` and then `resize()`d is FIXED afterwards and
  will render 10px tall. Set `layoutSizingVertical = 'HUG'` after building.
- **A variant set has one default per text property.** Both variants' layers
  reference the same `message#id`, so editing one changes the other. Use a
  neutral placeholder rather than a string that is a lie under the other
  variant.
- **Cloning a variant drops `componentPropertyReferences`.** Re-bind
  `{ characters: prop }` on the clone's layers, or the instances show the
  default forever while reporting the right value.
- **`addComponentProperty(name, 'INSTANCE_SWAP', …)` takes the node id**, not
  the component key. The key throws "incompatible with property type".
- **Swapping a variant resets text overrides.** Re-apply them after, from the
  backup page if the originals are gone.
- **Do not hold a node reference across a `remove()`.** Re-query inside the
  loop; a stale id throws on the next `absoluteTransform`.
- **`figma.createFrame()` lands on `figma.currentPage`.** `await
  figma.setCurrentPageAsync(page)` first, or `combineAsVariants` fails with
  "must be in the same page as the parent".
- **Section children use coordinates relative to the section**, unlike most
  containers. Set `x`/`y` after `appendChild`.
- **The icons page may not have the glyph.** Build it from the path in
  `src/ui/icons.ts`: a 24×24 `createNodeFromSvg`, `rescale(size/24)`, then
  `strokeWeight = size/12` per vector, as three variants 18 · 22 · 26.

## Before calling it done

1. Screenshot the slide and read it — the roll-call order must match the stage
   left to right.
2. No empty stages left behind: grouping a screen out of its own slide leaves
   a husk, and husks are deleted.
3. Captions consumed, not duplicated — the slide's title and description *are*
   the caption.
4. `knowledge/NEW_UI.md` updated: the slide table, and the decision if the
   grouping changed.
5. Nothing in `plugin/` or `src/` changed, unless the slide exposed a real
   gap in the code — which happens, and is worth a separate commit.
