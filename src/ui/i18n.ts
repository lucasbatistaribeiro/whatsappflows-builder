// Minimal i18n for the plugin chrome. English is the default; Portuguese is the
// second locale. Technical field labels and component type names stay in English
// (they mirror the WhatsApp Flow JSON spec).
export type Lang = "en" | "pt";

type Entry = Record<Lang, string>;

const DICT: Record<string, Entry> = {
  // tabs
  build: { en: "Build", pt: "Montar" },
  preview: { en: "Preview", pt: "Prévia" },
  flowJson: { en: "Flow JSON", pt: "Flow JSON" },
  // top bar
  generate: { en: "Generate", pt: "Gerar" },
  // menu
  menuTitle: { en: "Menu", pt: "Menu" },
  groupFlow: { en: "Flow", pt: "Fluxo" },
  groupAppearance: { en: "Appearance", pt: "Aparência" },
  groupLanguage: { en: "Language", pt: "Idioma" },
  theme: { en: "Theme", pt: "Tema" },
  themeSystem: { en: "System", pt: "Sistema" },
  themeLight: { en: "Light", pt: "Claro" },
  themeDark: { en: "Dark", pt: "Escuro" },
  langEn: { en: "English", pt: "English" },
  langPt: { en: "Português", pt: "Português" },
  templateLabel: { en: "Start from a template", pt: "Começar de um modelo" },
  import: { en: "Import JSON", pt: "Importar JSON" },
  copy: { en: "Copy JSON", pt: "Copiar JSON" },
  // build panel
  addComponent: { en: "Add component", pt: "Adicionar componente" },
  componentsOnScreen: { en: "Components on this screen", pt: "Componentes desta tela" },
  screenId: { en: "Screen id", pt: "ID da tela" },
  title: { en: "Title", pt: "Título" },
  terminal: { en: "Terminal", pt: "Terminal" },
  addScreen: { en: "Screen", pt: "Tela" },
  palettePlaceholder: { en: "Add a component...", pt: "Adicionar componente..." },
  templatePlaceholder: { en: "Template...", pt: "Modelo..." },
  noComponents: { en: "No components yet. Add one above.", pt: "Nenhum componente ainda. Adicione um acima." },
  // preview / json
  livePreview: { en: "Live preview", pt: "Prévia ao vivo" },
  summary: { en: "Summary", pt: "Resumo" },
  valid: { en: "Valid", pt: "Válido" },
  jsonHint: { en: "Edits here sync back to the Build tab when valid.", pt: "As edições aqui sincronizam com a aba Montar quando válidas." },
  // counts
  error: { en: "error", pt: "erro" },
  errors: { en: "errors", pt: "erros" },
  warning: { en: "warning", pt: "aviso" },
  warnings: { en: "warnings", pt: "avisos" },
};

let lang: Lang = "en";

export function setLang(l: Lang): void { lang = l; }
export function getLang(): Lang { return lang; }

export function t(key: string): string {
  const e = DICT[key];
  return e ? (e[lang] ?? e.en) : key;
}

// Fill [data-i18n] textContent and [data-i18n-ph] placeholders from the dictionary.
export function applyI18n(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (k) el.textContent = t(k);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-ph]").forEach((el) => {
    const k = el.dataset.i18nPh;
    if (k) (el as HTMLInputElement).placeholder = t(k);
  });
}
