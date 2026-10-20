// Lints a Flow against the WhatsApp Flows constraints most likely to break a
// publish or a runtime. Pure and dependency-free (no i18n) — each issue carries
// a message key + params, and the UI translates it. Keys/text live in i18n.ts.
//
// Severity rule of thumb (errors block Generate/Copy in the UI):
// - **error** for what Meta's static validator rejects on import (the
//   error-codes reference) and for the per-screen / per-flow component counts
//   the components reference fixes.
// - **warning** for character limits: there is no max-chars static error, the
//   renderer just truncates or drops the overflow.
import type { FlowJSON, Screen, Component, Action } from "./flowTypes";
import { screenChildren, isBinding } from "./flowTypes";

export interface Issue {
  level: "error" | "warning";
  screen?: string;
  key: string;
  params?: (string | number)[];
}

type Push = (level: Issue["level"], key: string, params?: (string | number)[], screen?: string) => void;

const MAX_SCREENS = 100; // error-codes: MAX_SCREENS_NUMBER
const MAX_COMPONENTS = 50;
const MAX_OPT_IN = 5; // error-codes: MAX_OPT_IN_PER_SCREEN
const FOOTER_LABEL_MAX = 35;
const LINK_TEXT_MAX = 25;
const NAV_ITEMS_MAX = 20;
const CAROUSEL_IMAGES_MIN = 1;
const CAROUSEL_IMAGES_MAX = 3;
const MAX_CAROUSEL_PER_SCREEN = 2;
const MAX_CAROUSEL_PER_FLOW = 3;
// Dropdown's option ceiling drops when any option carries an image.
const DROPDOWN_MAX_WITH_IMAGES = 100;

// Max characters of a text component's `text` (components ref -> Text).
const TEXT_MAX: { [type: string]: number } = {
  TextHeading: 80,
  TextSubheading: 80,
  TextBody: 4096,
  TextCaption: 409,
};

// Max characters of the other per-component string properties, keyed by Flow
// JSON property name (components ref -> each type's "Limits and restrictions").
const PROP_MAX: { [type: string]: { [prop: string]: number } } = {
  Footer: { "left-caption": 15, "center-caption": 15, "right-caption": 15 },
  OptIn: { label: 120 },
  TextInput: { label: 20, "helper-text": 80, "error-message": 30 },
  TextArea: { label: 20, "helper-text": 80 },
  DatePicker: { label: 40, "helper-text": 80, "error-message": 80 },
  CalendarPicker: { title: 80, description: 300, label: 40, "helper-text": 80, "error-message": 80 },
};

// data-source option counts (components ref -> "Min/Max # of options").
const OPTIONS_MIN: { [type: string]: number } = { CheckboxGroup: 1, RadioButtonsGroup: 1, Dropdown: 1, ChipsSelector: 2 };
const OPTIONS_MAX: { [type: string]: number } = { CheckboxGroup: 20, RadioButtonsGroup: 20, Dropdown: 200, ChipsSelector: 20 };

export function validateFlow(flow: FlowJSON): Issue[] {
  const issues: Issue[] = [];
  const push: Push = (level, key, params, screen) => issues.push({ level, key, params, screen });

  if (!flow.version) push("warning", "vMissingVersion");
  if (!Array.isArray(flow.screens) || flow.screens.length === 0) {
    push("error", "vNoScreens");
    return issues;
  }

  if (flow.screens.length > MAX_SCREENS) {
    push("error", "vMaxScreens", [flow.screens.length, MAX_SCREENS]);
  }

  const ids = flow.screens.map((s) => s.id);
  const idSet = new Set(ids);

  // Duplicate / reserved ids.
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) push("error", "vDupScreenId", [id], id);
    seen.add(id);
    if (id === "SUCCESS") push("error", "vReservedSuccess", undefined, id);
  }

  if (!flow.screens.some((s) => s.terminal)) push("warning", "vNoTerminal");

  // ImageCarousel is capped per screen *and* per flow — the flow-wide count has
  // no single screen to attach to.
  let carousels = 0;
  for (const s of flow.screens) carousels += screenChildren(s).filter((c) => c.type === "ImageCarousel").length;
  if (carousels > MAX_CAROUSEL_PER_FLOW) push("error", "vMaxCarouselFlow", [carousels, MAX_CAROUSEL_PER_FLOW]);

  for (const s of flow.screens) validateScreen(s, idSet, push);
  return issues;
}

function validateScreen(s: Screen, ids: Set<string>, push: Push): void {
  if (!s.layout || s.layout.type !== "SingleColumnLayout") {
    push("error", "vLayoutType", undefined, s.id);
    return;
  }
  const kids = screenChildren(s); // descends into a Form container if present

  // Advisory only (WhatsApp's own guidance): warn, but don't block generating or
  // exporting — a large screen is still usable in the Figma mockup.
  if (kids.length > MAX_COMPONENTS) {
    push("warning", "vMaxComponents", [kids.length, MAX_COMPONENTS], s.id);
  }

  const footers = kids.filter((c) => c.type === "Footer");
  if (footers.length > 1) push("error", "vOneFooter", undefined, s.id);
  if (s.terminal && footers.length === 0) push("error", "vTerminalNoFooter", undefined, s.id);

  // `success` is a terminal-only property (defaults true on terminal screens).
  if (s.success && !s.terminal) push("error", "vSuccessNonTerminal", undefined, s.id);

  // Component-level actions: navigate targets must exist and not self-loop;
  // `complete` is Footer-only and terminal-only.
  for (const c of kids) {
    const a = c["on-click-action"];
    if (a?.name === "navigate") {
      const target = a.next?.name;
      if (!target) push("error", "vNavNoTarget", [c.type], s.id);
      else if (!ids.has(target)) push("error", "vNavTargetMissing", [target], s.id);
      else if (target === s.id) push("error", "vNavSelfLoop", [s.id], s.id);
    }
    if (a?.name === "complete") {
      if (c.type === "EmbeddedLink") push("error", "vLinkComplete", undefined, s.id);
      else if (!s.terminal) push("error", "vCompleteNonTerminal", undefined, s.id);
    }
  }

  // Per-component limits.
  const links = kids.filter((c) => c.type === "EmbeddedLink").length;
  if (links > 2) push("error", "vMaxLinks", undefined, s.id);
  const images = kids.filter((c) => c.type === "Image").length;
  if (images > 3) push("error", "vMaxImages", undefined, s.id);
  const optIns = kids.filter((c) => c.type === "OptIn").length;
  if (optIns > MAX_OPT_IN) push("error", "vMaxOptIn", [optIns, MAX_OPT_IN], s.id);
  const carousels = kids.filter((c) => c.type === "ImageCarousel").length;
  if (carousels > MAX_CAROUSEL_PER_SCREEN) push("error", "vMaxCarouselScreen", [carousels, MAX_CAROUSEL_PER_SCREEN], s.id);

  // NavigationList constraints.
  const navs = kids.filter((c) => c.type === "NavigationList");
  if (navs.length > 2) push("error", "vMaxNavList", undefined, s.id);
  // The components ref says a NavigationList "cannot be used in combination with
  // any other components in the same screen", but no static-validation error code
  // backs it — such a flow still imports, it just renders poorly. Advisory, like
  // the 50-component limit: warn without blocking Generate or Copy.
  if (navs.length > 0 && kids.length > navs.length) push("warning", "vNavListCombine", undefined, s.id);
  if (navs.length > 0 && s.terminal) push("error", "vNavListTerminal", undefined, s.id);
  for (const nav of navs) {
    const li = nav["list-items"];
    if (!Array.isArray(li) || li.length === 0) { push("error", "vNavListItems", undefined, s.id); continue; }
    if (li.length > NAV_ITEMS_MAX) push("error", "vMaxNavItems", [li.length, NAV_ITEMS_MAX], s.id);
    // A NavigationList must navigate somewhere — via a component-level action or
    // a per-item action. Without one the list does nothing and the flow won't
    // import. Item-level navigate targets are checked here (component-level ones
    // are covered by the generic on-click-action loop above).
    let hasAction = !!nav["on-click-action"];
    let itemActions = 0;
    for (const item of li as Array<Record<string, unknown>>) {
      const ia = item["on-click-action"] as Action | undefined;
      if (!ia) continue;
      hasAction = true;
      itemActions++;
      if (ia.name === "navigate") {
        const target = ia.next?.name;
        if (!target) push("error", "vNavNoTarget", ["NavigationList"], s.id);
        else if (!ids.has(target)) push("error", "vNavTargetMissing", [target], s.id);
        else if (target === s.id) push("error", "vNavSelfLoop", [s.id], s.id);
      }
    }
    if (!hasAction) push("error", "vNavListNoAction", undefined, s.id);
    // The action belongs either on the list or on its items, never on both.
    if (nav["on-click-action"] && itemActions > 0) push("error", "vNavListActionBoth", undefined, s.id);
  }

  // Upload pickers.
  const photos = kids.filter((c) => c.type === "PhotoPicker").length;
  const docs = kids.filter((c) => c.type === "DocumentPicker").length;
  if (photos > 1) push("error", "vOnePhoto", undefined, s.id);
  if (docs > 1) push("error", "vOneDoc", undefined, s.id);
  if (photos > 0 && docs > 0) push("error", "vPhotoDoc", undefined, s.id);

  // Unique input names.
  const names = new Map<string, number>();
  for (const c of kids) if (c.name) names.set(c.name, (names.get(c.name) ?? 0) + 1);
  for (const [name, count] of names) {
    if (count > 1) push("error", "vDupName", [name], s.id);
  }

  for (const c of kids) validateComponent(c, s.id, push);
}

const len = (v: unknown) => (typeof v === "string" ? v.length : 0);
const blank = (v: unknown) => typeof v !== "string" || v.trim() === "";

// `text` is usually a string (or a binding), but TextBody/TextCaption with
// `markdown: true` take an array of lines — any of those with content counts.
function blankText(v: unknown): boolean {
  return Array.isArray(v) ? v.every((line) => blank(line)) : blank(v);
}

function validateComponent(c: Component, screenId: string, push: Push): void {
  // Media needs real base64 in `src`. Empty src renders a placeholder in the
  // Figma mockup but is rejected on import — warn so it surfaces either way.
  if (c.type === "Image" && blank(c.src)) push("warning", "vImageNoSrc", undefined, screenId);
  if (c.type === "ImageCarousel" && !isBinding(c.images)) {
    const imgs = Array.isArray(c.images) ? (c.images as Array<Record<string, unknown>>) : [];
    if (imgs.length < CAROUSEL_IMAGES_MIN || imgs.length > CAROUSEL_IMAGES_MAX) {
      push("error", "vCarouselCount", [imgs.length, CAROUSEL_IMAGES_MIN, CAROUSEL_IMAGES_MAX], screenId);
    }
    if (imgs.length > 0 && imgs.some((im) => blank(im?.src))) {
      push("warning", "vCarouselNoSrc", undefined, screenId);
    }
  }

  // Footer captions come in exactly two shapes: left + right, or center alone.
  if (c.type === "Footer") {
    const center = !blank(c["center-caption"]);
    const left = !blank(c["left-caption"]);
    const right = !blank(c["right-caption"]);
    if (center && (left || right)) push("error", "vCaptionMix", undefined, screenId);
    else if (right && !left) push("error", "vCaptionDep", undefined, screenId);
  }

  // Empty/blank text is rejected on import for the text components and the link.
  if ((TEXT_MAX[c.type] !== undefined || c.type === "EmbeddedLink") && blankText(c.text)) {
    push("error", "vTextBlank", [c.type], screenId);
  }

  if (c.type === "Footer" && len(c.label) > FOOTER_LABEL_MAX) {
    push("warning", "vFooterLen", [FOOTER_LABEL_MAX], screenId);
  }
  const textMax = TEXT_MAX[c.type];
  if (textMax !== undefined && len(c.text) > textMax) {
    push("warning", "vHeadingLen", [c.type, textMax], screenId);
  }
  if (c.type === "EmbeddedLink" && len(c.text) > LINK_TEXT_MAX) {
    push("warning", "vLinkLen", [LINK_TEXT_MAX], screenId);
  }
  const propMax = PROP_MAX[c.type];
  if (propMax) {
    for (const prop of Object.keys(propMax)) {
      if (len(c[prop]) > propMax[prop]) push("warning", "vPropLen", [c.type, prop, propMax[prop]], screenId);
    }
  }

  const needsData = ["RadioButtonsGroup", "CheckboxGroup", "Dropdown", "ChipsSelector"];
  if (needsData.includes(c.type)) {
    const ds = c["data-source"];
    // A dynamic binding ("${data.x}") is a valid data-source — options come from
    // the endpoint at runtime, so don't flag it as empty (nor count its options).
    if (!isBinding(ds) && (!Array.isArray(ds) || ds.length === 0)) {
      push("error", "vNeedsDataSource", [c.type], screenId);
    } else if (Array.isArray(ds)) {
      const min = OPTIONS_MIN[c.type];
      if (min !== undefined && ds.length < min) push("error", "vMinOptions", [c.type, min], screenId);
      let max = OPTIONS_MAX[c.type];
      if (c.type === "Dropdown" && ds.some((o) => !blank((o as unknown as Record<string, unknown>)["image"]))) {
        max = DROPDOWN_MAX_WITH_IMAGES;
      }
      if (max !== undefined && ds.length > max) push("error", "vMaxOptions", [c.type, ds.length, max], screenId);
    }
  }

  const needsName = ["TextInput", "TextArea", "DatePicker", "CalendarPicker", "PhotoPicker", "DocumentPicker", "RadioButtonsGroup", "CheckboxGroup", "ChipsSelector", "OptIn"];
  if (needsName.includes(c.type) && !c.name) push("warning", "vNeedsName", [c.type], screenId);
}
