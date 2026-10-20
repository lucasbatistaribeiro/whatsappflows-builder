import type { FlowJSON } from "./flowTypes";
import type { TemplateLang } from "./lang";

// Small two-screen sample used as the initial state of the editor, and as the
// first entry of the template picker. Authored copy follows the plugin's
// language (see templates.ts); screen ids and input `name`s do not — they are
// identifiers the Flow JSON refers to, not text anyone reads.
interface Copy {
  welcomeTitle: string; welcome: string; intro: string;
  service: string; haircut: string; color: string; beard: string;
  continue_: string;
  detailsTitle: string; almost: string; fullName: string; phone: string;
  reminders: string; confirm: string;
}

const COPY: Record<TemplateLang, Copy> = {
  en: {
    welcomeTitle: "Get started", welcome: "Welcome",
    intro: "Answer a couple of quick questions to book your appointment.",
    service: "Choose a service", haircut: "Haircut", color: "Coloring", beard: "Beard trim",
    continue_: "Continue",
    detailsTitle: "Your details", almost: "Almost done", fullName: "Full name", phone: "Phone",
    reminders: "Send me reminders", confirm: "Confirm booking",
  },
  pt: {
    welcomeTitle: "Comece aqui", welcome: "Boas-vindas",
    intro: "Responda duas perguntas rápidas para agendar seu horário.",
    service: "Escolha um serviço", haircut: "Corte", color: "Coloração", beard: "Barba",
    continue_: "Continuar",
    detailsTitle: "Seus dados", almost: "Quase lá", fullName: "Nome completo", phone: "Telefone",
    reminders: "Quero receber lembretes", confirm: "Confirmar agendamento",
  },
};

export function sampleFlow(lang: TemplateLang): FlowJSON {
  const c = COPY[lang];
  return {
    version: "7.3",
    screens: [
      {
        id: "WELCOME",
        title: c.welcomeTitle,
        layout: {
          type: "SingleColumnLayout",
          children: [
            { type: "TextHeading", text: c.welcome },
            { type: "TextBody", text: c.intro },
            {
              type: "RadioButtonsGroup",
              name: "service",
              label: c.service,
              "data-source": [
                { id: "haircut", title: c.haircut },
                { id: "color", title: c.color },
                { id: "beard", title: c.beard },
              ],
            },
            {
              type: "Footer",
              label: c.continue_,
              "on-click-action": { name: "navigate", next: { type: "screen", name: "DETAILS" }, payload: {} },
            },
          ],
        },
      },
      {
        id: "DETAILS",
        title: c.detailsTitle,
        terminal: true,
        success: true,
        layout: {
          type: "SingleColumnLayout",
          children: [
            { type: "TextSubheading", text: c.almost },
            { type: "TextInput", name: "full_name", label: c.fullName, "input-type": "text", required: true },
            { type: "TextInput", name: "phone", label: c.phone, "input-type": "phone", required: true },
            { type: "OptIn", name: "reminders", label: c.reminders },
            {
              type: "Footer",
              label: c.confirm,
              "on-click-action": { name: "complete", payload: {} },
            },
          ],
        },
      },
    ],
  };
}

// The editor's initial state, before saved preferences arrive. The UI swaps it
// for the localized one once it knows the language — but only while it is still
// untouched, so a swap can never discard an edit.
export const SAMPLE_FLOW: FlowJSON = sampleFlow("en");
