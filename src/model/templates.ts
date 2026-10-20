// Built-in starter flows offered in the Template picker.
//
// A template is authored content, so it follows the plugin's language: the
// picker rebuilds on a language change and `templates(lang)` hands back the
// same flows written in that locale. What does NOT get translated is anything
// the Flow JSON refers to by name — screen ids, input `name`s, `data-source`
// ids, the keys of a screen's `data` schema and the `${form.*}` / `${data.*}`
// bindings that read them. Those are identifiers; translating them would break
// the references and change nothing a user reads.
//
// The copy lives here rather than in src/ui/i18n.ts, which is the plugin
// chrome's dictionary: a template's name and its screens are one thing to keep
// in step, and the model can't import from src/ui anyway.
import type { FlowJSON } from "./flowTypes";
import type { TemplateLang } from "./lang";
import { sampleFlow } from "./sample";

export interface Template {
  name: string;
  flow: FlowJSON;
}

type Copy<T> = Record<TemplateLang, T>;

// ---- Feedback survey -----------------------------------------------------

interface FeedbackCopy {
  name: string; title: string; heading: string; rate: string;
  excellent: string; good: string; okay: string; poor: string;
  comments: string; submit: string;
}

const FEEDBACK_COPY: Copy<FeedbackCopy> = {
  en: {
    name: "Feedback survey", title: "Your feedback", heading: "How did we do?",
    rate: "Rate your experience",
    excellent: "Excellent", good: "Good", okay: "Okay", poor: "Poor",
    comments: "Anything else?", submit: "Submit",
  },
  pt: {
    name: "Pesquisa de satisfação", title: "Sua opinião", heading: "Como foi sua experiência?",
    rate: "Avalie seu atendimento",
    excellent: "Excelente", good: "Bom", okay: "Regular", poor: "Ruim",
    comments: "Quer comentar algo?", submit: "Enviar",
  },
};

function feedback(lang: TemplateLang): FlowJSON {
  const c = FEEDBACK_COPY[lang];
  return {
    version: "7.3",
    screens: [
      {
        id: "FEEDBACK",
        title: c.title,
        terminal: true,
        success: true,
        layout: {
          type: "SingleColumnLayout",
          children: [
            { type: "TextHeading", text: c.heading },
            {
              type: "RadioButtonsGroup", name: "rating", label: c.rate,
              "data-source": [
                { id: "5", title: c.excellent },
                { id: "4", title: c.good },
                { id: "3", title: c.okay },
                { id: "2", title: c.poor },
              ],
            },
            { type: "TextArea", name: "comments", label: c.comments },
            { type: "Footer", label: c.submit, "on-click-action": { name: "complete", payload: {} } },
          ],
        },
      },
    ],
  };
}

// ---- Sign-up -------------------------------------------------------------

interface SignupCopy {
  name: string; detailsTitle: string; heading: string;
  fullName: string; email: string; phone: string; continue_: string;
  termsTitle: string; almost: string; intro: string; accept: string; create: string;
}

const SIGNUP_COPY: Copy<SignupCopy> = {
  en: {
    name: "Sign-up", detailsTitle: "Create account", heading: "Create your account",
    fullName: "Full name", email: "Email", phone: "Phone", continue_: "Continue",
    termsTitle: "Terms", almost: "Almost there",
    intro: "Review and accept our terms to finish creating your account.",
    accept: "I accept the Terms of Service", create: "Create account",
  },
  pt: {
    name: "Cadastro", detailsTitle: "Criar conta", heading: "Crie sua conta",
    fullName: "Nome completo", email: "E-mail", phone: "Telefone", continue_: "Continuar",
    termsTitle: "Termos", almost: "Quase lá",
    intro: "Revise e aceite nossos termos para concluir seu cadastro.",
    accept: "Aceito os Termos de Uso", create: "Criar conta",
  },
};

function signup(lang: TemplateLang): FlowJSON {
  const c = SIGNUP_COPY[lang];
  return {
    version: "7.3",
    screens: [
      {
        id: "DETAILS",
        title: c.detailsTitle,
        layout: {
          type: "SingleColumnLayout",
          children: [
            { type: "TextHeading", text: c.heading },
            { type: "TextInput", name: "name", label: c.fullName, "input-type": "text", required: true },
            { type: "TextInput", name: "email", label: c.email, "input-type": "email", required: true },
            { type: "TextInput", name: "phone", label: c.phone, "input-type": "phone" },
            { type: "Footer", label: c.continue_, "on-click-action": { name: "navigate", next: { type: "screen", name: "TERMS" }, payload: {} } },
          ],
        },
      },
      {
        id: "TERMS",
        title: c.termsTitle,
        terminal: true,
        success: true,
        layout: {
          type: "SingleColumnLayout",
          children: [
            { type: "TextSubheading", text: c.almost },
            { type: "TextBody", text: c.intro },
            { type: "OptIn", name: "accept", label: c.accept },
            { type: "Footer", label: c.create, "on-click-action": { name: "complete", payload: {} } },
          ],
        },
      },
    ],
  };
}

// ---- Collect purchase intent --------------------------------------------

// Meta's own "Collect purchase intent" template (LEAD_GENERATION), ported from
// the use-case guide:
// developers.facebook.com/documentation/business-messaging/whatsapp/flows/gettingstarted/purchase-intent
//
// It's the only one of Meta's four documented use-case templates this builder can
// take as-is — the other three (personalised offer, pre-approved loan, insurance
// quote) are data-endpoint flows (`data_api_version` + `routing_model`), which are
// out of scope (see knowledge/META_SYNC.md).
//
// The *structure* is kept faithful to the source on three points worth knowing
// (the copy is localized like every other template, but none of this is):
//   - components sit inside a `Form` container (read/passthrough here — the
//     builder edits straight through it, see screenChildren);
//   - the navigate/complete payloads carry `${form.*}` / `${data.*}` bindings,
//     which pass answers between screens. The builder shows them read-only;
//     they survive a round-trip so the exported flow still imports at Meta.
//   - TERMS_AND_CONDITIONS has no Footer (WhatsApp's own back button returns).

interface IntentCopy {
  name: string; joinTitle: string; pitch: string;
  firstName: string; email: string; tos: string; marketing: string; continue_: string;
  categoriesTitle: string; categoriesPitch: string; selectCategories: string;
  phones: string; tvs: string; audio: string; headphones: string;
  readers: string; cameras: string; accessories: string; confirm: string;
  termsTitle: string; ourTerms: string; dataUsage: string; privacy: string;
}

const INTENT_COPY: Copy<IntentCopy> = {
  en: {
    name: "Collect purchase intent", joinTitle: "Join Now",
    pitch: "Get early access to our Mega Sales Day deals. Register now!",
    firstName: "Name", email: "Email", tos: "I agree to the terms.",
    marketing: "Keep me up to date about offers and promotions", continue_: "Continue",
    categoriesTitle: "Join now",
    categoriesPitch: "Let us know which category you are interested in?",
    selectCategories: "Select categories",
    phones: "Mobile phones", tvs: "Televisions", audio: "Home audio",
    headphones: "Headphones & earphones", readers: "eBook readers",
    cameras: "Cameras", accessories: "Accessories", confirm: "Confirm",
    termsTitle: "Terms and conditions", ourTerms: "Our Terms",
    dataUsage: "Data usage", privacy: "Privacy policy",
  },
  pt: {
    name: "Captar interesse de compra", joinTitle: "Participe",
    pitch: "Garanta acesso antecipado às ofertas do nosso Mega Dia de Vendas. Cadastre-se!",
    firstName: "Nome", email: "E-mail", tos: "Concordo com os termos.",
    marketing: "Quero receber novidades sobre ofertas e promoções", continue_: "Continuar",
    categoriesTitle: "Participe",
    categoriesPitch: "Em qual categoria você tem interesse?",
    selectCategories: "Selecione as categorias",
    phones: "Celulares", tvs: "Televisores", audio: "Áudio para casa",
    headphones: "Fones de ouvido", readers: "Leitores de eBook",
    cameras: "Câmeras", accessories: "Acessórios", confirm: "Confirmar",
    termsTitle: "Termos e condições", ourTerms: "Nossos termos",
    dataUsage: "Uso de dados", privacy: "Política de privacidade",
  },
};

// Placeholder body text, left as lorem ipsum exactly like Meta's source — it
// stands in for the business's real terms, so there is nothing to translate.
const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae odio dui. Praesent ut nulla tincidunt, scelerisque augue malesuada, volutpat lorem. Aliquam iaculis ex at diam posuere mollis. Suspendisse eget purus ac tellus interdum pharetra. In quis dolor turpis. Fusce in porttitor enim, vitae efficitur nunc. Fusce dapibus finibus volutpat. Fusce velit mi, ullamcorper ac gravida vitae, blandit quis ex. Fusce ultrices diam et justo blandit, quis consequat nisl euismod. Vestibulum pretium est sem, vitae convallis justo sollicitudin non. Morbi bibendum purus mattis quam condimentum, a scelerisque erat bibendum. Nullam sit amet bibendum lectus.";

function purchaseIntent(lang: TemplateLang): FlowJSON {
  const c = INTENT_COPY[lang];
  return {
    version: "7.3",
    screens: [
      {
        id: "JOIN_NOW",
        title: c.joinTitle,
        data: {},
        layout: {
          type: "SingleColumnLayout",
          children: [
            {
              type: "Form", name: "form",
              children: [
                { type: "TextSubheading", text: c.pitch },
                { type: "TextInput", name: "name", label: c.firstName, "input-type": "text", required: true },
                { type: "TextInput", name: "email", label: c.email, "input-type": "email", required: true },
                {
                  type: "OptIn", name: "tos_optin", label: c.tos, required: true,
                  "on-click-action": { name: "navigate", payload: {}, next: { type: "screen", name: "TERMS_AND_CONDITIONS" } },
                },
                { type: "OptIn", name: "marketing_optin", label: c.marketing },
                {
                  type: "Footer", label: c.continue_,
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
        title: c.categoriesTitle,
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
                { type: "TextSubheading", text: c.categoriesPitch },
                {
                  type: "CheckboxGroup", name: "categories", label: c.selectCategories, required: true,
                  "data-source": [
                    { id: "mobile_phones", title: c.phones },
                    { id: "televisions", title: c.tvs },
                    { id: "home_audio", title: c.audio },
                    { id: "headphones", title: c.headphones },
                    { id: "ebook_readers", title: c.readers },
                    { id: "cameras", title: c.cameras },
                    { id: "accessories", title: c.accessories },
                  ],
                },
                {
                  type: "Footer", label: c.confirm,
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
        title: c.termsTitle,
        data: {},
        layout: {
          type: "SingleColumnLayout",
          children: [
            { type: "TextHeading", text: c.ourTerms },
            { type: "TextSubheading", text: c.dataUsage },
            { type: "TextBody", text: LOREM },
            { type: "TextSubheading", text: c.privacy },
            { type: "TextBody", text: LOREM },
          ],
        },
      },
    ],
  };
}

// ---- The picker ----------------------------------------------------------

const SAMPLE_NAME: Copy<string> = { en: "Appointment booking", pt: "Agendamento" };

/** The template list, written in `lang`. Rebuilt whenever the language changes. */
export function templates(lang: TemplateLang): Template[] {
  return [
    { name: SAMPLE_NAME[lang], flow: sampleFlow(lang) },
    { name: FEEDBACK_COPY[lang].name, flow: feedback(lang) },
    { name: SIGNUP_COPY[lang].name, flow: signup(lang) },
    { name: INTENT_COPY[lang].name, flow: purchaseIntent(lang) },
  ];
}
