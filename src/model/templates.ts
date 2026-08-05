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

// Meta's own "Collect purchase intent" template (LEAD_GENERATION), ported
// verbatim from the use-case guide:
// developers.facebook.com/documentation/business-messaging/whatsapp/flows/gettingstarted/purchase-intent
//
// It's the only one of Meta's four documented use-case templates this builder can
// take as-is — the other three (personalised offer, pre-approved loan, insurance
// quote) are data-endpoint flows (`data_api_version` + `routing_model`), which are
// out of scope (see knowledge/META_SYNC.md).
//
// Kept faithful to the source on three points worth knowing:
//   - components sit inside a `Form` container (read/passthrough here — the
//     builder edits straight through it, see screenChildren);
//   - the navigate/complete payloads carry `${form.*}` / `${data.*}` bindings,
//     which pass answers between screens. The builder shows them read-only;
//     they survive a round-trip so the exported flow still imports at Meta.
//   - TERMS_AND_CONDITIONS has no Footer (WhatsApp's own back button returns).
const PURCHASE_INTENT: FlowJSON = {
  version: "7.3",
  screens: [
    {
      id: "JOIN_NOW",
      title: "Join Now",
      data: {},
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form", name: "form",
            children: [
              { type: "TextSubheading", text: "Get early access to our Mega Sales Day deals. Register now!" },
              { type: "TextInput", name: "name", label: "Name", "input-type": "text", required: true },
              { type: "TextInput", name: "email", label: "Email", "input-type": "email", required: true },
              {
                type: "OptIn", name: "tos_optin", label: "I agree to the terms.", required: true,
                "on-click-action": { name: "navigate", payload: {}, next: { type: "screen", name: "TERMS_AND_CONDITIONS" } },
              },
              { type: "OptIn", name: "marketing_optin", label: "Keep me up to date about offers and promotions" },
              {
                type: "Footer", label: "Continue",
                "on-click-action": {
                  name: "navigate", next: { type: "screen", name: "CATEGORIES" },
                  payload: {
                    name: "${form.name}", email: "${form.email}",
                    tos_optin: "${form.tos_optin}", marketing_optin: "${form.marketing_optin}",
                  },
                },
              },
            ],
          },
        ],
      },
    },
    {
      id: "CATEGORIES",
      title: "Join now",
      terminal: true,
      success: true,
      data: {
        name: { type: "string", __example__: "Example" },
        email: { type: "string", __example__: "Example" },
        tos_optin: { type: "boolean", __example__: false },
        marketing_optin: { type: "boolean", __example__: false },
      },
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form", name: "form",
            children: [
              { type: "TextSubheading", text: "Let us know which category you are interested in?" },
              {
                type: "CheckboxGroup", name: "categories", label: "Select categories", required: true,
                "data-source": [
                  { id: "mobile_phones", title: "Mobile phones" },
                  { id: "televisions", title: "Televisions" },
                  { id: "home_audio", title: "Home audio" },
                  { id: "headphones", title: "Headphones & earphones" },
                  { id: "ebook_readers", title: "eBook readers" },
                  { id: "cameras", title: "Cameras" },
                  { id: "accessories", title: "Accessories" },
                ],
              },
              {
                type: "Footer", label: "Confirm",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    name: "${data.name}", email: "${data.email}",
                    tos_optin: "${data.tos_optin}", marketing_optin: "${data.marketing_optin}",
                    categories: "${form.categories}",
                  },
                },
              },
            ],
          },
        ],
      },
    },
    {
      id: "TERMS_AND_CONDITIONS",
      title: "Terms and conditions",
      data: {},
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextHeading", text: "Our Terms" },
          { type: "TextSubheading", text: "Data usage" },
          { type: "TextBody", text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae odio dui. Praesent ut nulla tincidunt, scelerisque augue malesuada, volutpat lorem. Aliquam iaculis ex at diam posuere mollis. Suspendisse eget purus ac tellus interdum pharetra. In quis dolor turpis. Fusce in porttitor enim, vitae efficitur nunc. Fusce dapibus finibus volutpat. Fusce velit mi, ullamcorper ac gravida vitae, blandit quis ex. Fusce ultrices diam et justo blandit, quis consequat nisl euismod. Vestibulum pretium est sem, vitae convallis justo sollicitudin non. Morbi bibendum purus mattis quam condimentum, a scelerisque erat bibendum. Nullam sit amet bibendum lectus." },
          { type: "TextSubheading", text: "Privacy policy" },
          { type: "TextBody", text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae odio dui. Praesent ut nulla tincidunt, scelerisque augue malesuada, volutpat lorem. Aliquam iaculis ex at diam posuere mollis. Suspendisse eget purus ac tellus interdum pharetra. In quis dolor turpis. Fusce in porttitor enim, vitae efficitur nunc. Fusce dapibus finibus volutpat. Fusce velit mi, ullamcorper ac gravida vitae, blandit quis ex. Fusce ultrices diam et justo blandit, quis consequat nisl euismod. Vestibulum pretium est sem, vitae convallis justo sollicitudin non. Morbi bibendum purus mattis quam condimentum, a scelerisque erat bibendum. Nullam sit amet bibendum lectus." },
        ],
      },
    },
  ],
};

export const TEMPLATES: Template[] = [
  { name: "Appointment booking", flow: SAMPLE_FLOW },
  { name: "Feedback survey", flow: FEEDBACK },
  { name: "Sign-up", flow: SIGNUP },
  { name: "Collect purchase intent", flow: PURCHASE_INTENT },
];
