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
  searchComponent: { en: "Search components...", pt: "Buscar componente..." },
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
  // validation messages ({n} = params). Component type names stay in English.
  vMissingVersion: { en: 'Missing top-level "version" (e.g. "7.3").', pt: 'Falta o "version" no topo (ex.: "7.3").' },
  vNoScreens: { en: "Flow has no screens.", pt: "O flow não tem telas." },
  vDupScreenId: { en: 'Duplicate screen id "{0}".', pt: 'ID de tela duplicado "{0}".' },
  vReservedSuccess: { en: '"SUCCESS" is a reserved screen id.', pt: '"SUCCESS" é um ID de tela reservado.' },
  vNoTerminal: { en: "No terminal screen — a flow should end on a screen with terminal: true.", pt: "Nenhuma tela terminal — o flow deve terminar numa tela com terminal: true." },
  vLayoutType: { en: 'layout.type must be "SingleColumnLayout".', pt: 'layout.type deve ser "SingleColumnLayout".' },
  vMaxComponents: { en: "Screen has {0} components (max {1}).", pt: "A tela tem {0} componentes (máx {1})." },
  vOneFooter: { en: "Only one Footer is allowed per screen.", pt: "Só é permitido um Footer por tela." },
  vTerminalNoFooter: { en: "Terminal screen must contain a Footer.", pt: "Tela terminal precisa conter um Footer." },
  vNavNoTarget: { en: "{0} navigate action has no target screen.", pt: "A ação navigate do {0} não tem tela de destino." },
  vNavTargetMissing: { en: 'navigate target "{0}" does not exist.', pt: 'a tela de destino "{0}" do navigate não existe.' },
  vMaxLinks: { en: "Max 2 EmbeddedLink components per screen.", pt: "Máx 2 componentes EmbeddedLink por tela." },
  vMaxImages: { en: "Max 3 Image components per screen.", pt: "Máx 3 componentes Image por tela." },
  vMaxNavList: { en: "Max 2 NavigationList components per screen.", pt: "Máx 2 componentes NavigationList por tela." },
  vNavListCombine: { en: "NavigationList can't be combined with other components on a screen.", pt: "NavigationList não pode ser combinado com outros componentes na mesma tela." },
  vNavListTerminal: { en: "NavigationList can't be on a terminal screen.", pt: "NavigationList não pode ficar numa tela terminal." },
  vNavListItems: { en: "NavigationList needs at least one item.", pt: "NavigationList precisa de pelo menos um item." },
  vNavListNoAction: { en: "NavigationList needs a navigate action (on the list or on its items).", pt: "NavigationList precisa de uma ação navigate (na lista ou nos itens)." },
  vNavSelfLoop: { en: 'navigate can\'t target its own screen "{0}".', pt: 'navigate não pode apontar para a própria tela "{0}".' },
  vCompleteNonTerminal: { en: 'A "complete" action can only be on a terminal screen.', pt: 'A ação "complete" só pode ficar numa tela terminal.' },
  vLinkComplete: { en: 'EmbeddedLink can\'t use a "complete" action — only Footer can.', pt: 'EmbeddedLink não pode usar a ação "complete" — só o Footer pode.' },
  vSuccessNonTerminal: { en: '"success" can only be set on a terminal screen.', pt: '"success" só pode ser definido numa tela terminal.' },
  vCaptionDep: { en: "Footer needs a left-caption when right-caption is set.", pt: "O Footer precisa de left-caption quando right-caption está definido." },
  vImageNoSrc: { en: "Image has no src (base64) — it won't import.", pt: "Image sem src (base64) — não será importado." },
  vCarouselNoSrc: { en: "ImageCarousel has an image with no src (base64).", pt: "ImageCarousel tem uma imagem sem src (base64)." },
  vOnePhoto: { en: "Only one PhotoPicker per screen.", pt: "Só um PhotoPicker por tela." },
  vOneDoc: { en: "Only one DocumentPicker per screen.", pt: "Só um DocumentPicker por tela." },
  vPhotoDoc: { en: "PhotoPicker and DocumentPicker can't share a screen.", pt: "PhotoPicker e DocumentPicker não podem ficar na mesma tela." },
  vDupName: { en: 'Duplicate input name "{0}" on this screen.', pt: 'Nome de input duplicado "{0}" nesta tela.' },
  vFooterLen: { en: "Footer label exceeds {0} chars.", pt: "O label do Footer passa de {0} caracteres." },
  vHeadingLen: { en: "{0} text exceeds {1} chars.", pt: "O texto do {0} passa de {1} caracteres." },
  vLinkLen: { en: "EmbeddedLink text exceeds {0} chars.", pt: "O texto do EmbeddedLink passa de {0} caracteres." },
  vNeedsDataSource: { en: "{0} needs a non-empty data-source.", pt: "{0} precisa de um data-source não-vazio." },
  vNeedsName: { en: '{0} should have a unique "name".', pt: '{0} deveria ter um "name" único.' },
};

let lang: Lang = "en";

export function setLang(l: Lang): void { lang = l; }
export function getLang(): Lang { return lang; }

export function t(key: string, params?: (string | number)[]): string {
  const e = DICT[key];
  let s = e ? (e[lang] ?? e.en) : key;
  if (params) s = s.replace(/\{(\d+)\}/g, (_, i) => String(params[Number(i)] ?? ""));
  return s;
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
