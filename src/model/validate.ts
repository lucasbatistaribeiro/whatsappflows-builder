// Lints a Flow against the WhatsApp Flows constraints most likely to break a
// publish or a runtime. Pure and dependency-free (no i18n) — each issue carries
// a message key + params, and the UI translates it. Keys/text live in i18n.ts.
import type { FlowJSON, Screen, Component, Action } from "./flowTypes";
import { screenChildren, isBinding } from "./flowTypes";

export interface Issue {
  level: "error" | "warning";
  screen?: string;
  key: string;
  params?: (string | number)[];
}

type Push = (level: Issue["level"], key: string, params?: (string | number)[], screen?: string) => void;

const MAX_COMPONENTS = 50;
const FOOTER_LABEL_MAX = 35;
const HEADING_MAX = 80;
const LINK_TEXT_MAX = 25;

export function validateFlow(flow: FlowJSON): Issue[] {
  const issues: Issue[] = [];
  const push: Push = (level, key, params, screen) => issues.push({ level, key, params, screen });

  if (!flow.version) push("warning", "vMissingVersion");
  if (!Array.isArray(flow.screens) || flow.screens.length === 0) {
    push("error", "vNoScreens");
    return issues;
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

  for (const s of flow.screens) validateScreen(s, idSet, push);
  return issues;
}

function validateScreen(s: Screen, ids: Set<string>, push: Push): void {
  if (!s.layout || s.layout.type !== "SingleColumnLayout") {
    push("error", "vLayoutType", undefined, s.id);
    return;
  }
  const kids = screenChildren(s); // descends into a Form container if present

  if (kids.length > MAX_COMPONENTS) {
    push("error", "vMaxComponents", [kids.length, MAX_COMPONENTS], s.id);
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

  // NavigationList constraints.
  const navs = kids.filter((c) => c.type === "NavigationList");
  if (navs.length > 2) push("error", "vMaxNavList", undefined, s.id);
  if (navs.length > 0 && kids.length > navs.length) push("warning", "vNavListCombine", undefined, s.id);
  if (navs.length > 0 && s.terminal) push("error", "vNavListTerminal", undefined, s.id);
  for (const nav of navs) {
    const li = nav["list-items"];
    if (!Array.isArray(li) || li.length === 0) { push("error", "vNavListItems", undefined, s.id); continue; }
    // A NavigationList must navigate somewhere — via a component-level action or
    // a per-item action. Without one the list does nothing and the flow won't
    // import. Item-level navigate targets are checked here (component-level ones
    // are covered by the generic on-click-action loop above).
    let hasAction = !!nav["on-click-action"];
    for (const item of li as Array<Record<string, unknown>>) {
      const ia = item["on-click-action"] as Action | undefined;
      if (!ia) continue;
      hasAction = true;
      if (ia.name === "navigate") {
        const target = ia.next?.name;
        if (!target) push("error", "vNavNoTarget", ["NavigationList"], s.id);
        else if (!ids.has(target)) push("error", "vNavTargetMissing", [target], s.id);
        else if (target === s.id) push("error", "vNavSelfLoop", [s.id], s.id);
      }
    }
    if (!hasAction) push("error", "vNavListNoAction", undefined, s.id);
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

function validateComponent(c: Component, screenId: string, push: Push): void {
  const len = (v: unknown) => (typeof v === "string" ? v.length : 0);
  const blank = (v: unknown) => typeof v !== "string" || v.trim() === "";

  // Media needs real base64 in `src`. Empty src renders a placeholder in the
  // Figma mockup but is rejected on import — warn so it surfaces either way.
  if (c.type === "Image" && blank(c.src)) push("warning", "vImageNoSrc", undefined, screenId);
  if (c.type === "ImageCarousel") {
    const imgs = c.images as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(imgs) || imgs.length === 0 || imgs.some((im) => blank(im?.src))) {
      push("warning", "vCarouselNoSrc", undefined, screenId);
    }
  }

  // Footer captions: a right-caption requires a left-caption (spec dependency).
  if (c.type === "Footer" && !blank(c["right-caption"]) && blank(c["left-caption"])) {
    push("error", "vCaptionDep", undefined, screenId);
  }

  if (c.type === "Footer" && len(c.label) > FOOTER_LABEL_MAX) {
    push("warning", "vFooterLen", [FOOTER_LABEL_MAX], screenId);
  }
  if ((c.type === "TextHeading" || c.type === "TextSubheading") && len(c.text) > HEADING_MAX) {
    push("warning", "vHeadingLen", [c.type, HEADING_MAX], screenId);
  }
  if (c.type === "EmbeddedLink" && len(c.text) > LINK_TEXT_MAX) {
    push("warning", "vLinkLen", [LINK_TEXT_MAX], screenId);
  }

  const needsData = ["RadioButtonsGroup", "CheckboxGroup", "Dropdown", "ChipsSelector"];
  if (needsData.includes(c.type)) {
    const ds = c["data-source"];
    // A dynamic binding ("${data.x}") is a valid data-source — options come from
    // the endpoint at runtime, so don't flag it as empty.
    if (!isBinding(ds) && (!Array.isArray(ds) || ds.length === 0)) {
      push("error", "vNeedsDataSource", [c.type], screenId);
    }
  }

  const needsName = ["TextInput", "TextArea", "DatePicker", "CalendarPicker", "PhotoPicker", "DocumentPicker", "RadioButtonsGroup", "CheckboxGroup", "ChipsSelector", "OptIn"];
  if (needsName.includes(c.type) && !c.name) push("warning", "vNeedsName", [c.type], screenId);
}
