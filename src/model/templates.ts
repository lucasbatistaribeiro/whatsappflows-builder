// Built-in starter flows offered in the Template picker.
import type { FlowJSON } from "./flowTypes";
import { SAMPLE_FLOW } from "./sample";

export interface Template {
  name: string;
  flow: FlowJSON;
}

const FEEDBACK: FlowJSON = {
  version: "7.3",
  screens: [
    {
      id: "FEEDBACK",
      title: "Your feedback",
      terminal: true,
      success: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextHeading", text: "How did we do?" },
          {
            type: "RadioButtonsGroup", name: "rating", label: "Rate your experience",
            "data-source": [
              { id: "5", title: "Excellent" },
              { id: "4", title: "Good" },
              { id: "3", title: "Okay" },
              { id: "2", title: "Poor" },
            ],
          },
          { type: "TextArea", name: "comments", label: "Anything else?" },
          { type: "Footer", label: "Submit", "on-click-action": { name: "complete", payload: {} } },
        ],
      },
    },
  ],
};

const SIGNUP: FlowJSON = {
  version: "7.3",
  screens: [
    {
      id: "DETAILS",
      title: "Create account",
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextHeading", text: "Create your account" },
          { type: "TextInput", name: "name", label: "Full name", "input-type": "text", required: true },
          { type: "TextInput", name: "email", label: "Email", "input-type": "email", required: true },
          { type: "TextInput", name: "phone", label: "Phone", "input-type": "phone" },
          { type: "Footer", label: "Continue", "on-click-action": { name: "navigate", next: { type: "screen", name: "TERMS" }, payload: {} } },
        ],
      },
    },
    {
      id: "TERMS",
      title: "Terms",
      terminal: true,
      success: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextSubheading", text: "Almost there" },
          { type: "TextBody", text: "Review and accept our terms to finish creating your account." },
          { type: "OptIn", name: "accept", label: "I accept the Terms of Service" },
          { type: "Footer", label: "Create account", "on-click-action": { name: "complete", payload: {} } },
        ],
      },
    },
  ],
};

export const TEMPLATES: Template[] = [
  { name: "Appointment booking", flow: SAMPLE_FLOW },
  { name: "Feedback survey", flow: FEEDBACK },
  { name: "Sign-up", flow: SIGNUP },
];
