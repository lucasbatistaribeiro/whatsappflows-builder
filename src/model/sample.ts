import type { FlowJSON } from "./flowTypes";

// Small two-screen sample used as the initial state of the editor.
export const SAMPLE_FLOW: FlowJSON = {
  version: "7.3",
  screens: [
    {
      id: "WELCOME",
      title: "Get started",
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextHeading", text: "Welcome" },
          { type: "TextBody", text: "Answer a couple of quick questions to book your appointment." },
          {
            type: "RadioButtonsGroup",
            name: "service",
            label: "Choose a service",
            "data-source": [
              { id: "haircut", title: "Haircut" },
              { id: "color", title: "Coloring" },
              { id: "beard", title: "Beard trim" },
            ],
          },
          {
            type: "Footer",
            label: "Continue",
            "on-click-action": { name: "navigate", next: { type: "screen", name: "DETAILS" }, payload: {} },
          },
        ],
      },
    },
    {
      id: "DETAILS",
      title: "Your details",
      terminal: true,
      success: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextSubheading", text: "Almost done" },
          { type: "TextInput", name: "full_name", label: "Full name", "input-type": "text", required: true },
          { type: "TextInput", name: "phone", label: "Phone", "input-type": "phone", required: true },
          { type: "OptIn", name: "reminders", label: "Send me reminders" },
          {
            type: "Footer",
            label: "Confirm booking",
            "on-click-action": { name: "complete", payload: {} },
          },
        ],
      },
    },
  ],
};
