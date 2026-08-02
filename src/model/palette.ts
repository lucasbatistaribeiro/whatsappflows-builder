// Palette definitions consumed by the plugin UI: label, group, and a factory
// producing a fresh default component instance when the user adds it to a screen.
import type { Component, ComponentType } from "./flowTypes";

export interface PaletteEntry {
  type: ComponentType;
  label: string;
  group: "Text" | "Input" | "Selection" | "Media" | "Action";
  make: () => Component;
}

export const PALETTE: PaletteEntry[] = [
  // Text
  { type: "TextHeading", label: "Heading", group: "Text", make: () => ({ type: "TextHeading", text: "Heading" }) },
  { type: "TextSubheading", label: "Subheading", group: "Text", make: () => ({ type: "TextSubheading", text: "Subheading" }) },
  { type: "TextBody", label: "Body", group: "Text", make: () => ({ type: "TextBody", text: "Body text goes here." }) },
  { type: "TextCaption", label: "Caption", group: "Text", make: () => ({ type: "TextCaption", text: "Caption" }) },
  { type: "RichText", label: "Rich text", group: "Text", make: () => ({ type: "RichText", text: "**Rich** text" }) },

  // Input
  { type: "TextInput", label: "Text input", group: "Input", make: () => ({ type: "TextInput", name: "field", label: "Label", "input-type": "text" }) },
  { type: "TextArea", label: "Text area", group: "Input", make: () => ({ type: "TextArea", name: "notes", label: "Label" }) },
  { type: "DatePicker", label: "Date picker", group: "Input", make: () => ({ type: "DatePicker", name: "date", label: "Select date" }) },
  { type: "CalendarPicker", label: "Calendar", group: "Input", make: () => ({ type: "CalendarPicker", name: "range", label: "Select date", mode: "single" }) },
  { type: "PhotoPicker", label: "Photo upload", group: "Input", make: () => ({ type: "PhotoPicker", name: "photos", label: "Add photos", description: "Upload up to 5 photos" }) },
  { type: "DocumentPicker", label: "Doc upload", group: "Input", make: () => ({ type: "DocumentPicker", name: "docs", label: "Add documents" }) },
  { type: "OptIn", label: "Opt-in", group: "Input", make: () => ({ type: "OptIn", name: "optin", label: "I agree to the terms" }) },

  // Selection
  {
    type: "RadioButtonsGroup", label: "Radio group", group: "Selection",
    make: () => ({ type: "RadioButtonsGroup", name: "choice", label: "Pick one", "data-source": [
      { id: "0", title: "Option A" }, { id: "1", title: "Option B" },
    ] }),
  },
  {
    type: "CheckboxGroup", label: "Checkbox group", group: "Selection",
    make: () => ({ type: "CheckboxGroup", name: "picks", label: "Pick many", "data-source": [
      { id: "0", title: "Option A" }, { id: "1", title: "Option B" },
    ] }),
  },
  {
    type: "Dropdown", label: "Dropdown", group: "Selection",
    make: () => ({ type: "Dropdown", name: "select", label: "Choose", "data-source": [
      { id: "0", title: "Option A" }, { id: "1", title: "Option B" },
    ] }),
  },
  {
    type: "ChipsSelector", label: "Chips", group: "Selection",
    make: () => ({ type: "ChipsSelector", name: "chips", label: "Pick tags", "data-source": [
      { id: "0", title: "Tag A" }, { id: "1", title: "Tag B" }, { id: "2", title: "Tag C" },
    ] }),
  },

  // Media / links
  { type: "Image", label: "Image", group: "Media", make: () => ({ type: "Image", src: "" }) },
  { type: "ImageCarousel", label: "Carousel", group: "Media", make: () => ({ type: "ImageCarousel", images: [{ src: "", "alt-text": "Image 1" }, { src: "", "alt-text": "Image 2" }] }) },
  {
    type: "NavigationList", label: "Nav list", group: "Selection",
    make: () => ({ type: "NavigationList", name: "nav", "list-items": [
      { id: "0", "main-content": { title: "First item", description: "Description" } },
      { id: "1", "main-content": { title: "Second item", description: "Description" } },
    ] }),
  },
  { type: "EmbeddedLink", label: "Link", group: "Media", make: () => ({ type: "EmbeddedLink", text: "Learn more", "on-click-action": { name: "navigate", next: { type: "screen", name: "" }, payload: {} } }) },

  // Action
  { type: "Footer", label: "Footer button", group: "Action", make: () => ({ type: "Footer", label: "Continue", "on-click-action": { name: "navigate", next: { type: "screen", name: "" }, payload: {} } }) },
];
