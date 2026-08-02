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
  | "Image"
  | "EmbeddedLink"
  | "OptIn"
  | "Footer";

export interface DataSourceItem {
  id: string;
  title: string;
  description?: string;
  enabled?: boolean;
}

// A permissive shape: every renderer reads the fields it cares about.
export interface Component {
  type: ComponentType;
  name?: string;
  text?: string;
  label?: string;
  "helper-text"?: string;
  "input-type"?: string;
  required?: boolean;
  visible?: boolean;
  "font-weight"?: string;
  "data-source"?: DataSourceItem[];
  src?: string; // Image base64 (data URI without prefix in Flow JSON)
  "on-click-action"?: Action;
  "left-caption"?: string;
  "center-caption"?: string;
  "right-caption"?: string;
  [key: string]: unknown;
}
