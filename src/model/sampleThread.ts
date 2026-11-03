// The sample conversation chat mode boots on — the counterpart of sample.ts,
// and separate from chatTypes.ts for the same reason sample.ts is separate
// from flowTypes.ts: the Figma sandbox imports the *types* and the run helpers,
// and must not carry two languages of sample copy it never renders.
import type { Thread } from "./chatTypes";
import type { TemplateLang } from "./lang";

/**
 * The copy of the sample thread, per language. Only what a reader sees is in
 * here: message ids, button `type`s and row ids are references, so they stay
 * put — the same rule the sample flow follows. The business name is a proper
 * noun and is deliberately the same in both.
 */
const THREAD_COPY: Record<TemplateLang, Record<string, string>> = {
  en: {
    presence: "Business account", today: "TODAY",
    m1: "Your order #4127 is ready for pickup. Collect it until 19:00 today.",
    m1Header: "Order ready", onMyWay: "On my way", track: "Track order", call: "Call the store",
    m2: "Want us to hold it for another day?", hold: "Yes, hold it", noThanks: "No, thanks",
    m3: "No, thanks — I'll come by after work.",
    m4: "Anything else while you're here?", menuCta: "View menu",
    coffee: "Coffee", espresso: "Espresso", espressoSub: "Single origin, rotating",
    filter: "Filter", filterSub: "V60, 300ml", pastry: "Pastry", croissant: "Butter croissant",
    m5: "You can also book a table for later.", bookCta: "Book a table",
    m7: "Here it is, wrapped and ready.", receipt: "receipt-4127.pdf",
    m9: "Perfect 👍",
  },
  pt: {
    presence: "Conta comercial", today: "HOJE",
    m1: "Seu pedido #4127 está pronto para retirada. Retire até as 19:00 de hoje.",
    m1Header: "Pedido pronto", onMyWay: "Estou a caminho", track: "Acompanhar pedido", call: "Ligar para a loja",
    m2: "Quer que a gente guarde por mais um dia?", hold: "Sim, pode guardar", noThanks: "Não, obrigado",
    m3: "Não, obrigado — passo aí depois do trabalho.",
    m4: "Mais alguma coisa enquanto você está por aqui?", menuCta: "Ver cardápio",
    coffee: "Café", espresso: "Espresso", espressoSub: "Grão único, em rodízio",
    filter: "Coado", filterSub: "V60, 300ml", pastry: "Padaria", croissant: "Croissant de manteiga",
    m5: "Você também pode reservar uma mesa para depois.", bookCta: "Reservar uma mesa",
    m7: "Aqui está, embalado e pronto.", receipt: "recibo-4127.pdf",
    m9: "Perfeito 👍",
  },
};

/**
 * A short, representative thread — the chat-mode counterpart of sample.ts, and
 * language-aware for the same reason: it is authored content the reader sees,
 * not Flow JSON anyone refers to by name.
 */
export function sampleThread(lang: TemplateLang): Thread {
  const c = THREAD_COPY[lang];
  return {
    contact: { name: "Aurora Books", presence: c.presence, verified: true },
    dateLabel: c.today,
    showEncryptionNotice: true,
    messages: [
      // A template message: how a business opens a conversation.
      { id: "m1", direction: "in", type: "text", time: "09:36",
        text: c.m1,
        interactive: { kind: "template", header: c.m1Header, footer: "Aurora Books",
          buttons: [
            { type: "QUICK_REPLY", text: c.onMyWay },
            { type: "URL", text: c.track },
            { type: "PHONE_NUMBER", text: c.call },
          ] } },
      // Reply buttons: the "pick one" pattern.
      { id: "m2", direction: "in", type: "text", time: "09:37",
        text: c.m2,
        interactive: { kind: "buttons", buttons: [
          { id: "hold", title: c.hold },
          { id: "no", title: c.noThanks },
        ] } },
      { id: "m3", direction: "out", type: "text", time: "09:40", status: "read",
        text: c.m3 },
      // The list menu.
      { id: "m4", direction: "in", type: "text", time: "09:41",
        text: c.m4,
        interactive: { kind: "list", cta: c.menuCta, sections: [
          { title: c.coffee, rows: [
            { id: "espresso", title: c.espresso, description: c.espressoSub },
            { id: "filter", title: c.filter, description: c.filterSub },
          ] },
          { title: c.pastry, rows: [{ id: "croissant", title: c.croissant }] },
        ] } },
      // A flow CTA — the bridge to what Flows mode builds.
      { id: "m5", direction: "in", type: "text", time: "09:41",
        text: c.m5,
        interactive: { kind: "flow", cta: c.bookCta } },
      // Media: a voice note, a photo with a caption, and a quoted reply.
      { id: "m6", direction: "out", type: "audio", time: "09:42", status: "read",
        media: { duration: "0:14" } },
      { id: "m7", direction: "in", type: "image", time: "09:43",
        text: c.m7, media: { size: "412 KB" } },
      { id: "m8", direction: "in", type: "document", time: "09:43",
        media: { name: c.receipt, size: "88 KB" } },
      { id: "m9", direction: "out", type: "text", time: "09:44", status: "delivered",
        text: c.m9, replyTo: { author: "Aurora Books", text: c.m7 } },
    ],
  };
}

/** The English thread the editor boots on, before the saved language arrives. */
export const SAMPLE_THREAD: Thread = sampleThread("en");
