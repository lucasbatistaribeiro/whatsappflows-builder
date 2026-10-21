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
  modeFlows: { en: "Flows", pt: "Fluxos" },
  modeChat: { en: "Chat", pt: "Conversa" },
  // chat composer
  chatCompose: { en: "Compose", pt: "Montar" },
  chatPreviewTab: { en: "Preview", pt: "Prévia" },
  chatContact: { en: "Contact", pt: "Contato" },
  chatName: { en: "Name", pt: "Nome" },
  chatPresence: { en: "Presence line", pt: "Linha de presença" },
  chatVerified: { en: "Verified badge", pt: "Selo verificado" },
  chatThread: { en: "Conversation", pt: "Conversa" },
  chatDateLabel: { en: "Date divider", pt: "Divisor de data" },
  chatEncryption: { en: "Encryption notice", pt: "Aviso de criptografia" },
  chatMessages: { en: "Messages", pt: "Mensagens" },
  chatNoMessages: { en: "No messages yet. Add one below.", pt: "Nenhuma mensagem ainda. Adicione uma abaixo." },
  chatEmptyMessage: { en: "(empty)", pt: "(vazia)" },
  chatAddPlaceholder: { en: "Add a message...", pt: "Adicionar mensagem..." },
  chatSearchMessage: { en: "Search messages...", pt: "Buscar mensagem..." },
  chatIn: { en: "Incoming", pt: "Recebida" },
  chatOut: { en: "Outgoing", pt: "Enviada" },
  chatDirection: { en: "Direction", pt: "Direção" },
  chatText: { en: "Text", pt: "Texto" },
  chatTime: { en: "Time", pt: "Hora" },
  chatStatus: { en: "Status", pt: "Status" },
  chatSent: { en: "Sent", pt: "Enviada" },
  chatDelivered: { en: "Delivered", pt: "Entregue" },
  chatRead: { en: "Read", pt: "Lida" },
  chatInteractive: { en: "Interactive", pt: "Interação" },
  chatNone: { en: "None", pt: "Nenhuma" },
  chatButtonLabel: { en: "Button label", pt: "Rótulo do botão" },
  chatAddButton: { en: "Button", pt: "Botão" },
  chatListCta: { en: "Menu button label", pt: "Rótulo do botão do menu" },
  chatSectionTitle: { en: "Section title", pt: "Título da seção" },
  chatRowTitle: { en: "Row title", pt: "Título da linha" },
  chatRowDesc: { en: "Description", pt: "Descrição" },
  chatAddRow: { en: "Row", pt: "Linha" },
  chatSheetOpen: { en: "Show the menu open", pt: "Mostrar o menu aberto" },
  chatFlowCta: { en: "Flow button label", pt: "Rótulo do botão do fluxo" },
  chatTplHeader: { en: "Template header", pt: "Cabeçalho do template" },
  chatTplFooter: { en: "Template footer", pt: "Rodapé do template" },
  chatAtLimit: { en: "Official limit reached", pt: "Limite oficial atingido" },
  chatType: { en: "Type", pt: "Tipo" },
  chatType_text: { en: "Text", pt: "Texto" },
  chatType_image: { en: "Image", pt: "Imagem" },
  chatType_video: { en: "Video", pt: "Vídeo" },
  chatType_document: { en: "Document", pt: "Documento" },
  chatType_audio: { en: "Voice note", pt: "Áudio" },
  chatCaption: { en: "Caption", pt: "Legenda" },
  chatMediaSrc: { en: "Image data (base64)", pt: "Dados da imagem (base64)" },
  chatFileName: { en: "File name", pt: "Nome do arquivo" },
  chatFileSize: { en: "File size", pt: "Tamanho" },
  chatDuration: { en: "Duration", pt: "Duração" },
  chatQuoted: { en: "Quoted reply", pt: "Resposta citada" },
  chatReplyAuthor: { en: "Quoted author", pt: "Autor citado" },
  chatReplyText: { en: "Quoted text", pt: "Texto citado" },
  // top bar
  generate: { en: "Generate", pt: "Gerar" },
  generating: { en: "Generating…", pt: "Gerando…" },
  genDone: { en: "Generated!", pt: "Gerado!" },
  // Linked to a generated section: Generate updates it in place.
  update: { en: "Update", pt: "Atualizar" },
  linkedTitle: { en: "Generate updates this section in Figma", pt: "Gerar atualiza esta section no Figma" },
  unlink: { en: "Unlink — generate a new section instead", pt: "Desvincular — gerar uma nova section" },
  // menu
  menuTitle: { en: "Menu", pt: "Menu" },
  groupPreview: { en: "Preview", pt: "Prévia" },
  groupFigma: { en: "Figma", pt: "Figma" },
  groupSystem: { en: "System", pt: "Sistema" },
  language: { en: "Language", pt: "Idioma" },
  interactive: { en: "Interactive mode", pt: "Modo interativo" },
  businessName: { en: "Business name", pt: "Nome da empresa" },
  businessNamePh: { en: "Business name", pt: "Nome da empresa" },
  // The conversation the flow sheet opens over.
  showChat: { en: "Show the conversation", pt: "Mostrar a conversa" },
  headerStyle: { en: "Header style", pt: "Estilo do cabeçalho" },
  headerCurrent: { en: "Current (light)", pt: "Atual (claro)" },
  headerClassic: { en: "Classic (green)", pt: "Clássico (verde)" },
  contactName: { en: "Contact name", pt: "Nome do contato" },
  contactNamePh: { en: "Business name", pt: "Nome da empresa" },
  contactPhoto: { en: "Contact photo", pt: "Foto do contato" },
  choosePhoto: { en: "Choose…", pt: "Escolher…" },
  removePhoto: { en: "Remove the photo", pt: "Remover a foto" },
  contactVerified: { en: "Verified badge", pt: "Selo verificado" },
  sectionName: { en: "Section name", pt: "Nome da section" },
  sectionNamePh: { en: "Optional — date is always added", pt: "Opcional — a data é sempre incluída" },
  sectionColor: { en: "Background", pt: "Fundo" },
  sectionRadius: { en: "Radius", pt: "Raio" },
  screenSize: { en: "Screen size", pt: "Tamanho da tela" },
  sizeSm: { en: "Small", pt: "Pequeno" },
  sizeMd: { en: "Medium", pt: "Médio" },
  sizeLg: { en: "Large", pt: "Grande" },
  groupFlow: { en: "Flow", pt: "Fluxo" },
  groupAppearance: { en: "Appearance", pt: "Aparência" },
  groupLanguage: { en: "Language", pt: "Idioma" },
  theme: { en: "Theme", pt: "Tema" },
  waTheme: { en: "WhatsApp theme", pt: "Tema do WhatsApp" },
  appTheme: { en: "Plugin theme", pt: "Tema do plugin" },
  themeSystem: { en: "System", pt: "Sistema" },
  themeLight: { en: "Light", pt: "Claro" },
  themeDark: { en: "Dark", pt: "Escuro" },
  langEn: { en: "English", pt: "English" },
  langPt: { en: "Português", pt: "Português" },
  templateLabel: { en: "Start from a template", pt: "Começar de um modelo" },
  import: { en: "Import JSON", pt: "Importar JSON" },
  offerTitle: { en: 'Import the flow from "{0}"?', pt: 'Importar o fluxo de "{0}"?' },
  offerBody: { en: "This replaces the flow you are editing.", pt: "Isso substitui o fluxo que você está editando." },
  offerImport: { en: "Import", pt: "Importar" },
  offerCancel: { en: "Cancel", pt: "Cancelar" },
  copy: { en: "Copy JSON", pt: "Copiar JSON" },
  // build panel
  addComponent: { en: "Add component", pt: "Adicionar componente" },
  componentsOnScreen: { en: "Components on this screen", pt: "Componentes desta tela" },
  dragToReorder: { en: "Drag to reorder", pt: "Arraste para reordenar" },
  collapseAll: { en: "Collapse all", pt: "Fechar todos" },
  expandAll: { en: "Expand all", pt: "Abrir todos" },
  duplicate: { en: "Duplicate", pt: "Duplicar" },
  remove: { en: "Remove", pt: "Remover" },
  screenId: { en: "Screen id", pt: "ID da tela" },
  title: { en: "Title", pt: "Título" },
  terminal: { en: "Terminal", pt: "Terminal" },
  addScreen: { en: "Screen", pt: "Tela" },
  palettePlaceholder: { en: "Add a component...", pt: "Adicionar componente..." },
  searchComponent: { en: "Search components...", pt: "Buscar componente..." },
  templatePlaceholder: { en: "Template...", pt: "Modelo..." },
  noComponents: { en: "No components yet. Add one above.", pt: "Nenhum componente ainda. Adicione um acima." },
  // preview / json
  optional: { en: "(optional)", pt: "(opcional)" },
  managedByBusiness: { en: "Managed by the business.", pt: "Gerenciada pela empresa." },
  learnMore: { en: "Learn more", pt: "Saiba mais" },
  livePreview: { en: "Live preview", pt: "Prévia ao vivo" },
  summary: { en: "Summary", pt: "Resumo" },
  valid: { en: "Valid", pt: "Válido" },
  jsonHint: { en: "Edits here sync back to the Build tab when valid.", pt: "As edições aqui sincronizam com a aba Montar quando válidas." },
  jsonScope: { en: "Showing", pt: "Exibindo" },
  jsonWholeFlow: { en: "Whole flow", pt: "Fluxo completo" },
  jsonNeedsScreen: { en: "Expected a single screen object.", pt: "Esperava um objeto de tela." },
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
  vMaxScreens: { en: "Flow has {0} screens (max {1}).", pt: "O flow tem {0} telas (máx {1})." },
  vMaxComponents: { en: "Screen has {0} components (max {1}).", pt: "A tela tem {0} componentes (máx {1})." },
  vOneFooter: { en: "Only one Footer is allowed per screen.", pt: "Só é permitido um Footer por tela." },
  vTerminalNoFooter: { en: "Terminal screen must contain a Footer.", pt: "Tela terminal precisa conter um Footer." },
  vNavNoTarget: { en: "{0} navigate action has no target screen.", pt: "A ação navigate do {0} não tem tela de destino." },
  vNavTargetMissing: { en: 'navigate target "{0}" does not exist.', pt: 'a tela de destino "{0}" do navigate não existe.' },
  vMaxLinks: { en: "Max 2 EmbeddedLink components per screen.", pt: "Máx 2 componentes EmbeddedLink por tela." },
  vMaxImages: { en: "Max 3 Image components per screen.", pt: "Máx 3 componentes Image por tela." },
  vMaxOptIn: { en: "Screen has {0} OptIn components (max {1}).", pt: "A tela tem {0} componentes OptIn (máx {1})." },
  vMaxCarouselScreen: { en: "Screen has {0} ImageCarousel components (max {1}).", pt: "A tela tem {0} componentes ImageCarousel (máx {1})." },
  vMaxCarouselFlow: { en: "Flow has {0} ImageCarousel components (max {1}).", pt: "O flow tem {0} componentes ImageCarousel (máx {1})." },
  vMaxNavList: { en: "Max 2 NavigationList components per screen.", pt: "Máx 2 componentes NavigationList por tela." },
  vNavListCombine: { en: "NavigationList can't be combined with other components on a screen.", pt: "NavigationList não pode ser combinado com outros componentes na mesma tela." },
  vNavListTerminal: { en: "NavigationList can't be on a terminal screen.", pt: "NavigationList não pode ficar numa tela terminal." },
  vNavListItems: { en: "NavigationList needs at least one item.", pt: "NavigationList precisa de pelo menos um item." },
  vMaxNavItems: { en: "NavigationList has {0} items (max {1}).", pt: "NavigationList tem {0} itens (máx {1})." },
  vNavListNoAction: { en: "NavigationList needs a navigate action (on the list or on its items).", pt: "NavigationList precisa de uma ação navigate (na lista ou nos itens)." },
  vNavListActionBoth: { en: "NavigationList can't set on-click-action on both the list and its items.", pt: "NavigationList não pode definir on-click-action na lista e nos itens ao mesmo tempo." },
  vNavSelfLoop: { en: 'navigate can\'t target its own screen "{0}".', pt: 'navigate não pode apontar para a própria tela "{0}".' },
  vCompleteNonTerminal: { en: 'A "complete" action can only be on a terminal screen.', pt: 'A ação "complete" só pode ficar numa tela terminal.' },
  vLinkComplete: { en: 'EmbeddedLink can\'t use a "complete" action — only Footer can.', pt: 'EmbeddedLink não pode usar a ação "complete" — só o Footer pode.' },
  vSuccessNonTerminal: { en: '"success" can only be set on a terminal screen.', pt: '"success" só pode ser definido numa tela terminal.' },
  vCaptionDep: { en: "Footer needs a left-caption when right-caption is set.", pt: "O Footer precisa de left-caption quando right-caption está definido." },
  vCaptionMix: { en: "Footer captions must be left + right, or center on its own.", pt: "As legendas do Footer devem ser left + right, ou center sozinho." },
  vTextBlank: { en: "{0} text can't be empty or blank.", pt: "O texto do {0} não pode ficar vazio ou em branco." },
  vImageNoSrc: { en: "Image has no src (base64) — it won't import.", pt: "Image sem src (base64) — não será importado." },
  vCarouselNoSrc: { en: "ImageCarousel has an image with no src (base64).", pt: "ImageCarousel tem uma imagem sem src (base64)." },
  vCarouselCount: { en: "ImageCarousel has {0} images ({1}–{2} allowed).", pt: "ImageCarousel tem {0} imagens ({1}–{2} permitidas)." },
  vOnePhoto: { en: "Only one PhotoPicker per screen.", pt: "Só um PhotoPicker por tela." },
  vOneDoc: { en: "Only one DocumentPicker per screen.", pt: "Só um DocumentPicker por tela." },
  vPhotoDoc: { en: "PhotoPicker and DocumentPicker can't share a screen.", pt: "PhotoPicker e DocumentPicker não podem ficar na mesma tela." },
  vDupName: { en: 'Duplicate input name "{0}" on this screen.', pt: 'Nome de input duplicado "{0}" nesta tela.' },
  vFooterLen: { en: "Footer label exceeds {0} chars.", pt: "O label do Footer passa de {0} caracteres." },
  vHeadingLen: { en: "{0} text exceeds {1} chars.", pt: "O texto do {0} passa de {1} caracteres." },
  vLinkLen: { en: "EmbeddedLink text exceeds {0} chars.", pt: "O texto do EmbeddedLink passa de {0} caracteres." },
  vPropLen: { en: "{0} {1} exceeds {2} chars.", pt: "O {1} do {0} passa de {2} caracteres." },
  vNeedsDataSource: { en: "{0} needs a non-empty data-source.", pt: "{0} precisa de um data-source não-vazio." },
  vMinOptions: { en: "{0} needs at least {1} options.", pt: "{0} precisa de pelo menos {1} opções." },
  vMaxOptions: { en: "{0} has {1} options (max {2}).", pt: "{0} tem {1} opções (máx {2})." },
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

// Fill [data-i18n] textContent, [data-i18n-ph] placeholders and [data-i18n-title]
// tooltips from the dictionary.
export function applyI18n(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (k) el.textContent = t(k);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-ph]").forEach((el) => {
    const k = el.dataset.i18nPh;
    if (k) (el as HTMLInputElement).placeholder = t(k);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const k = el.dataset.i18nTitle;
    if (k) el.title = t(k);
  });
}
