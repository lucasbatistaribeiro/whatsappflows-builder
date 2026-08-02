// Lints a Flow against the WhatsApp Flows constraints most likely to break a
// publish or a runtime. Pure and dependency-free so both the UI and (later) the
// generator can call it.
import type { FlowJSON, Screen, Component } from "./flowTypes";

export interface Issue {
  level: "error" | "warning";
  screen?: string;
  message: string;
}

const MAX_COMPONENTS = 50;
const FOOTER_LABEL_MAX = 35;
const HEADING_MAX = 80;
const LINK_TEXT_MAX = 25;

export function validateFlow(flow: FlowJSON): Issue[] {
  const issues: Issue[] = [];
  const push = (level: Issue["level"], message: string, screen?: string) =>
    issues.push({ level, message, screen });

  if (!flow.version) push("warning", "Missing top-level \"version\" (e.g. \"7.3\").");
  if (!Array.isArray(flow.screens) || flow.screens.length === 0) {
    push("error", "Flow has no screens.");
    return issues;
  }

  const ids = flow.screens.map((s) => s.id);
  const idSet = new Set(ids);

  // Duplicate / reserved ids.
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) push("error", `Duplicate screen id "${id}".`, id);
    seen.add(id);
    if (id === "SUCCESS") push("error", '"SUCCESS" is a reserved screen id.', id);
  }

  if (!flow.screens.some((s) => s.terminal)) {
    push("warning", "No terminal screen — a flow should end on a screen with terminal: true.");
  }

  for (const s of flow.screens) validateScreen(s, idSet, push);
  return issues;
}

function validateScreen(
  s: Screen,
  ids: Set<string>,
  push: (level: Issue["level"], message: string, screen?: string) => void,
): void {
  if (!s.layout || s.layout.type !== "SingleColumnLayout") {
    push("error", "layout.type must be \"SingleColumnLayout\".", s.id);
    return;
  }
  const kids = s.layout.children ?? [];

  if (kids.length > MAX_COMPONENTS) {
    push("error", `Screen has ${kids.length} components (max ${MAX_COMPONENTS}).`, s.id);
  }

  const footers = kids.filter((c) => c.type === "Footer");
  if (footers.length > 1) push("error", "Only one Footer is allowed per screen.", s.id);
  if (s.terminal && footers.length === 0) {
    push("error", "Terminal screen must contain a Footer.", s.id);
  }

  // Navigation targets must exist.
  for (const c of kids) {
    const a = c["on-click-action"];
    if (a?.name === "navigate") {
      const target = a.next?.name;
      if (!target) push("error", `${c.type} navigate action has no target screen.`, s.id);
      else if (!ids.has(target)) push("error", `navigate target "${target}" does not exist.`, s.id);
    }
  }

  // Per-component limits.
  const links = kids.filter((c) => c.type === "EmbeddedLink").length;
  if (links > 2) push("error", "Max 2 EmbeddedLink components per screen.", s.id);
  const images = kids.filter((c) => c.type === "Image").length;
  if (images > 3) push("error", "Max 3 Image components per screen.", s.id);

  // Unique input names.
  const names = new Map<string, number>();
  for (const c of kids) {
    if (c.name) names.set(c.name, (names.get(c.name) ?? 0) + 1);
  }
  for (const [name, count] of names) {
    if (count > 1) push("error", `Duplicate input name "${name}" on this screen.`, s.id);
  }

  for (const c of kids) validateComponent(c, s.id, push);
}

function validateComponent(
  c: Component,
  screenId: string,
  push: (level: Issue["level"], message: string, screen?: string) => void,
): void {
  const len = (v: unknown) => (typeof v === "string" ? v.length : 0);

  if (c.type === "Footer" && len(c.label) > FOOTER_LABEL_MAX) {
    push("warning", `Footer label exceeds ${FOOTER_LABEL_MAX} chars.`, screenId);
  }
  if ((c.type === "TextHeading" || c.type === "TextSubheading") && len(c.text) > HEADING_MAX) {
    push("warning", `${c.type} text exceeds ${HEADING_MAX} chars.`, screenId);
  }
  if (c.type === "EmbeddedLink" && len(c.text) > LINK_TEXT_MAX) {
    push("warning", `EmbeddedLink text exceeds ${LINK_TEXT_MAX} chars.`, screenId);
  }

  const needsData = ["RadioButtonsGroup", "CheckboxGroup", "Dropdown", "ChipsSelector"];
  if (needsData.includes(c.type)) {
    const ds = c["data-source"];
    if (!Array.isArray(ds) || ds.length === 0) {
      push("error", `${c.type} needs a non-empty data-source.`, screenId);
    }
  }

  const needsName = ["TextInput", "TextArea", "DatePicker", "RadioButtonsGroup", "CheckboxGroup", "ChipsSelector", "OptIn"];
  if (needsName.includes(c.type) && !c.name) {
    push("warning", `${c.type} should have a unique "name".`, screenId);
  }
}
