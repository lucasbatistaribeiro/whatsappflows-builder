// Component gallery: every builder in src/ui/components.ts in every variant,
// so the chrome can be seen and measured in a browser without a screen using
// it. Built by gallery.mjs (`npm run gallery`) into build/gallery.html — a dev
// artifact, gitignored, never part of plugin/.
import * as C from "../src/ui/components";

const root = document.getElementById("gallery")!;
const block = (name: string, ...kids: HTMLElement[]): void => {
  root.append(C.el("div", "g-block", C.el("h3", "", name), ...kids));
};
const hrow = (...kids: HTMLElement[]): HTMLElement => C.el("div", "g-row", ...kids);
const noop = (): void => undefined;

block("Navigation rail · Flows / Chat / Settings", hrow(...(["flows", "chat", "settings"] as C.RailKey[]).map((k) =>
  C.el("div", "g-frame", C.rail({ active: k, labels: { flows: "Flows", chat: "Chat", settings: "Settings" }, onSelect: noop,
    theme: { icon: "sun", title: "Theme", onClick: noop }, help: { title: "Help", onClick: noop } })))));

block("Toolbar · back × actions",
  C.toolbar({ title: "Barber booking", meta: "2 screens · Flow JSON 7.3", caret: true, onTitle: noop,
    actions: [C.button({ icon: "sparkles", label: "Generate", style: "primary", onClick: noop })] }),
  C.toolbar({ title: "WELCOME", meta: "Screen 1 of 2", back: { title: "Back", onClick: noop },
    actions: [C.button({ icon: "eye", title: "Preview", onClick: noop }), C.button({ icon: "more-vertical", title: "More", onClick: noop })] }),
  C.toolbar({ title: "Add component", meta: "to WELCOME", back: { title: "Back", onClick: noop } }),
);

block("Button · primary / secondary / soft × 48 / 40 × label",
  hrow(C.button({ icon: "sparkles", label: "Button", style: "primary" }), C.button({ icon: "sparkles", style: "primary", title: "Icon" }),
    C.button({ icon: "sparkles", label: "Button", style: "primary", sm: true }), C.button({ icon: "sparkles", style: "primary", sm: true, title: "Icon" }),
    C.button({ icon: "sparkles", label: "Button", style: "secondary" }), C.button({ icon: "sparkles", style: "secondary", title: "Icon" })),
  hrow(C.button({ icon: "sparkles", label: "Button", style: "secondary", sm: true }), C.button({ icon: "sparkles", style: "secondary", sm: true, title: "Icon" }),
    C.button({ icon: "sparkles", label: "Button", style: "soft" }), C.button({ icon: "sparkles", style: "soft", title: "Icon" }),
    C.button({ icon: "sparkles", label: "Button", style: "soft", sm: true }), C.button({ icon: "sparkles", style: "soft", sm: true, title: "Icon" }),
    C.button({ icon: "sparkles", label: "Disabled", style: "primary", disabled: true })),
);

block("Section + heading row + category rows (6 trailings)",
  C.section({ heading: "Section", hint: "Hint" },
    C.row({ icon: "layout-template", label: "Label" }),
    C.row({ icon: "layout-template", label: "Label", onClick: noop }),
    C.row({ icon: "layout-template", label: "Label", trailing: "count", count: 5, onClick: noop }),
    C.row({ icon: "layout-template", label: "Label", trailing: "count", count: 4, on: true, onClick: noop }),
    C.row({ icon: "layout-template", label: "Label", trailing: "value", value: "Sample", onClick: noop }),
    C.row({ icon: "palette", label: "Background", trailing: "value", value: "#353535", swatch: "#353535", onClick: noop }),
    C.row({ icon: "layout-template", label: "Label", trailing: "toggle", toggle: { on: true, onChange: noop } }),
    C.row({ icon: "import", label: "Import JSON", trailing: "none", action: true, onClick: noop }),
  ),
  C.section({ heading: "With action", action: { label: "Collapse all", onClick: noop } }),
);

block("Card · drag / chevron / badge / none × selected × strong / plain",
  C.section({},
    C.card({ icon: "phone", title: "Title", subtitle: "Subtitle" }),
    C.card({ icon: "phone", title: "Title", subtitle: "Subtitle", plain: true }),
    C.card({ icon: "phone", title: "Title", subtitle: "Subtitle", selected: true }),
    C.card({ icon: "phone", title: "Title", subtitle: "Subtitle", trailing: "chevron", onClick: noop }),
    C.card({ icon: "phone", title: "Title", subtitle: "Subtitle", trailing: "chevron", selected: true, onClick: noop }),
    C.card({ icon: "message-square-text", title: "Hi! I'd like to book a haircut", subtitle: "Text · 09:12 · read", trailing: "badge", badge: "out" }),
    C.card({ icon: "message-square-text", title: "Sure! Pick a time below", subtitle: "Text · 09:13", trailing: "badge", badge: "in" }),
    C.card({ icon: "circle-dot", title: "Radio group", trailing: "none" }),
    C.card({ icon: "circle-dot", title: "Radio group", trailing: "drag" }),
  ),
);

const body = C.el("div", "g-stack",
  C.field({ label: "Name", value: "service", required: true, mono: true, onInput: noop }),
  C.field({ label: "Label", value: "Choose a service", onInput: noop }));
const opts = C.el("div", "g-stack sm", C.el("div", "ui-field-label", C.el("span", "", "Options")));
for (const o of ["Haircut", "Coloring", "Beard trim"]) opts.append(C.optionRow({ value: o, onInput: noop, onRemove: noop }));
opts.append(C.addLink("Add option", noop));
body.append(opts);
block("Card · expanded",
  C.section({}, C.cardExpanded({ icon: "circle-dot", title: "RadioButtonsGroup", subtitle: "Choose a service · 3 options", body,
    actions: [C.button({ icon: "copy", label: "Duplicate", sm: true }), C.button({ icon: "trash-2", label: "Remove", sm: true })], onCollapse: noop })),
);

block("Search field · kbd, Field · required, Validation banner, Toggle, Dir badge, Kbd, Pill, Chips, Hint",
  C.section({},
    C.searchField({ placeholder: "Search", kbd: "⌘K", onInput: noop }),
    C.searchField({ placeholder: "Search", onInput: noop }),
    C.field({ label: "Label", value: "Value", required: true, onInput: noop }),
    C.field({ label: "Label", value: "", placeholder: "Placeholder", onInput: noop }),
    C.field({ label: "Showing", value: "Whole flow", trailing: C.ic("chevron-down"), onInput: noop }),
    C.textArea({ label: "Body", value: "Answer a couple of quick questions.", onInput: noop }),
    C.banner("ok", "Flow is valid — ready to generate"),
    C.banner("err", "2 errors found", noop),
    C.banner("warn", "1 warning"),
    hrow(C.toggle(true, noop), C.toggle(false, noop), C.dirBadge("out"), C.dirBadge("in"), C.el("span", "ui-kbd", "⌘K"), C.pill("ok", "Valid"), C.pill("err", "Invalid")),
    C.el("div", "ui-chips", C.chip("WELCOME", { active: true, onClick: noop }), C.chip("DETAILS", { onClick: noop }), C.chip("Summary", { err: true, onClick: noop })),
    C.hint("grip-vertical", "Drag onto the list, or tap to append"),
    C.divider(),
  ),
);

document.getElementById("theme")!.addEventListener("click", () => {
  const r = document.documentElement;
  r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark";
});
