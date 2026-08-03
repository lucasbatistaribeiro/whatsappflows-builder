// Pragmatic TypeScript model of the WhatsApp Flow JSON (subset used by the builder).
// Ref: developers.facebook.com WhatsApp Flows — Flow JSON, screens, layout, components, actions.

export interface FlowJSON {
  version: string; // e.g. "7.3"
  data_api_version?: string; // e.g. "3.0"
  routing_model?: Record<string, string[]>;
  screens: Screen[];
}

export interface Screen {
  id: string;
  title?: string;
  terminal?: boolean;
  success?: boolean;
  refresh_on_back?: boolean;
  data?: Record<string, unknown>;
  layout: Layout;
}

export interface Layout {
  type: "SingleColumnLayout";
  children: Component[];
}

// ---- Actions ------------------------------------------------------------

export type ActionName =
  | "navigate"
  | "complete"
  | "data_exchange"
  | "update_data"
  | "open_url";

export interface Action {
  name: ActionName;
  next?: { type: "screen"; name: string };
  url?: string;
  payload?: Record<string, unknown>;
}

// ---- Components ----------------------------------------------------------

export type ComponentType =
  | "TextHeading"
  | "TextSubheading"
  | "TextBody"
  | "TextCaption"
  | "RichText"
  | "TextInput"
  | "TextArea"
  | "CheckboxGroup"
  | "RadioButtonsGroup"
  | "Dropdown"
  | "ChipsSelector"
  | "DatePicker"
  | "CalendarPicker"
  | "Image"
  | "ImageCarousel"
  | "PhotoPicker"
  | "DocumentPicker"
  | "NavigationList"
  | "EmbeddedLink"
  | "OptIn"
  | "Footer"
  | "Form"
  | "If"
  | "Switch";

export interface DataSourceItem {
  id: string;
  title: string;
  description?: string;
  enabled?: boolean;
}

// A permissive shape: every renderer reads the fields it cares about.
// Note several fields (required, visible, data-source, src, label) can also
// arrive as dynamic-binding strings (e.g. "${data.x}") in data-endpoint flows,
// hence the wide types — read them through the helpers below, never blindly.
export interface Component {
  type: ComponentType;
  name?: string;
  text?: string;
  label?: string;
  "helper-text"?: string;
  "input-type"?: string;
  required?: boolean | string;
  visible?: boolean | string;
  "font-weight"?: string;
  "data-source"?: DataSourceItem[] | string;
  src?: string; // Image base64 (data URI without prefix in Flow JSON)
  "on-click-action"?: Action;
  "left-caption"?: string;
  "center-caption"?: string;
  "right-caption"?: string;
  children?: Component[]; // Form / container children
  [key: string]: unknown;
}

// ---- Container & binding helpers ----------------------------------------
// Shared by the UI and the Figma generator so both agree on how to read flows.

// A screen may wrap its components in a single `Form` container (Flow JSON <4.0
// style, and still common in data-endpoint flows). The builder is otherwise
// flat, so we treat that Form as a transparent container: the components to
// render / list / edit / generate are its children. Returns the LIVE array
// reference (mutations write through), so editing a Form-wrapped flow keeps the
// Form on export. Flat flows (no Form) are returned unchanged — a no-op.
export function screenChildren(screen: Screen): Component[] {
  const kids = screen.layout?.children ?? [];
  const form = kids.find(
    (c) => c && c.type === "Form" && Array.isArray((c as Component).children),
  ) as Component | undefined;
  return form ? (form.children as Component[]) : kids;
}

// `data-source` is an array of options for static flows, but a binding string
// ("${data.sessions}") in data-endpoint flows. Always read it through this so a
// binding never gets iterated as if it were an array (which would throw).
export function dataSourceOf(c: Component): DataSourceItem[] {
  const ds = c["data-source"];
  return Array.isArray(ds) ? (ds as DataSourceItem[]) : [];
}

// True when a value is a dynamic-data binding like "${data.x}" / "${form.x}".
export function isBinding(v: unknown): v is string {
  return typeof v === "string" && /^\$\{[^}]*\}$/.test(v.trim());
}
