# WhatsApp Flows Builder (Figma plugin)

**[Português](#português) · [English](#english)**

---

## Português

Transforma o [WhatsApp Flows Playground](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/playground)
em um plugin do Figma: monte as telas do flow a partir de uma palette de
componentes, edite o **Flow JSON** ao vivo (sincronizado nos dois sentidos),
exporte, e clique em **Gerar no Figma** para desenhar mockups navegáveis com a
cara do WhatsApp na canvas.

### O que ele faz

- **Palette** — adicione componentes do WhatsApp Flows a uma tela (texto,
  entradas, seleção, mídia, footer).
- **Telas** — adicione, remova e renomeie telas; marque as terminais.
- **Editor de propriedades** — edite as propriedades reais de cada componente
  (input-type, opções, destino das ações, captions…), não só o rótulo.
- **Prévia ao vivo** — um mockup de celular com uma aba por tela e uma aba de
  Resumo; as ações `navigate` do footer caminham entre as telas como no flow real.
- **Aba Flow JSON** — um editor ao vivo sincronizado com o construtor visual nos
  dois sentidos; JSON inválido é sinalizado, nunca aplicado.
- **Validação** — confere as restrições do WhatsApp Flows (tela terminal precisa
  de Footer, destinos de `navigate` existem, limites por componente…). Erros
  bloqueiam a geração e destacam a tela problemática.
- **Importação e templates** — carregue um Flow JSON de arquivo ou comece de um
  template embutido, **escrito no idioma do plugin** (português ou inglês);
  **Copiar JSON** exporta um flow pronto para o WhatsApp Manager.
- **Gerar no Figma** — desenha um frame do tamanho de um celular por tela (status
  bar, cabeçalho, corpo, footer) com os tokens visuais do WhatsApp e transforma as
  ações `navigate` em **reações de protótipo** (protótipo clicável, tela de
  entrada = ponto de partida). Cada execução é agrupada em uma **section com a
  data no nome**.
- **Volta da canvas** — toda section gerada carrega seu Flow JSON em uma camada
  de texto invisível e travada. Com o plugin aberto, clique naquela section no
  Figma e ele oferece carregar o flow de volta no construtor.
- **Editar atualiza a section de origem** — um flow carregado assim continua
  vinculado à sua section: a barra de cima mostra qual é, e **Gerar** vira
  **Atualizar**, reconstruindo aquela section no lugar em vez de deixar as telas
  antigas para trás. Desvincule (o x do chip) para gerar uma section separada.
- **A conversa atrás da folha** — um flow não abre num celular em branco: ele
  sobe como uma folha sobre a conversa em que foi enviado. As telas geradas
  desenham o cabeçalho do contato acima da folha, com **nome, foto e selo
  verificado** configuráveis no menu, e em dois estilos: **atual** (claro, o
  app desde 2021) ou **clássico** (a barra verde, medida da própria arte de
  Flows da Meta). Dá para desligar e voltar à folha sozinha.
- **Modo Chat** — monte uma conversa do WhatsApp (balões, mídia, respostas
  citadas, botões de resposta, menu de lista, botão de flow, templates) e gere-a
  como um frame.

### Componentes cobertos

Texto (`TextHeading`, `TextSubheading`, `TextBody`, `TextCaption`, `RichText`),
entradas (`TextInput`, `TextArea`, `DatePicker`, `CalendarPicker`, `PhotoPicker`,
`DocumentPicker`, `OptIn`), seleção (`RadioButtonsGroup`, `CheckboxGroup`,
`Dropdown`, `ChipsSelector`, `NavigationList`), mídia (`Image`, `ImageCarousel`,
`EmbeddedLink`), `Footer` e lógica (`If`, `Switch`).

> Comportamento vindo do servidor (`data_exchange`, `complete`, `If`/`Switch`,
> listas dinâmicas `${data}`) é desenhado como um estado estático representativo —
> protótipos do Figma não executam um endpoint. Só `navigate` vira link de
> protótipo de verdade.

### Desenvolvimento

```bash
npm install
npm run build      # -> plugin/code.js + plugin/ui.html
npm run watch      # reconstrói o bundle principal a cada mudança
npm run typecheck  # os dois projetos: typecheck:main + typecheck:ui
```

### Carregar no Figma

1. Rode `npm install && npm run build` antes — os dois bundles são gerados, então
   um clone novo tem um manifesto apontando para arquivos que não existem.
2. Figma desktop → **Plugins → Development → Import plugin from manifest…**
3. Selecione `plugin/manifest.json`.
4. Rode **WhatsApp Flows Builder** pelo menu de Plugins.

Prefere não buildar? Cada [release](https://github.com/lucasbatistaribeiro/whatsappflows-builder/releases)
traz um zip da pasta `plugin/` pronta: descompacte e importe o `manifest.json`
de dentro dela.

### Estrutura de pastas

`plugin/` é o plugin em si — depois de um build ela tem exatamente os três
arquivos que o Figma carrega, e mais nada. Tudo que serve para desenvolver ou
construir vive fora dela, então o entregável é aquele diretório sozinho.

```
whatsappflows-builder/
│
├─ plugin/                 O PLUGIN — é só esta pasta que o Figma carrega
│  ├─ manifest.json        o que você importa no Figma (nome, id, api, pontos de entrada, rede)
│  ├─ code.js              bundle do sandbox             (gerado — fora do git)
│  └─ ui.html              UI com o bundle embutido      (gerado — fora do git)
│
├─ src/                    código-fonte (TypeScript)
│  │
│  ├─ model/               puro: sem `figma`, sem DOM — importado pelos dois runtimes
│  │  ├─ CLAUDE.md         as regras desta camada (nunca importar de ui/ ou main/)
│  │  ├─ flowTypes.ts      tipos do Flow JSON + helpers (screenChildren, dataSourceOf, isBinding)
│  │  ├─ validate.ts       as regras da spec; devolve chaves de mensagem, não texto traduzido
│  │  ├─ palette.ts        catálogo "Adicionar componente" e a instância padrão de cada um
│  │  ├─ templates.ts      os quatro flows iniciais, um conjunto por idioma
│  │  ├─ sample.ts         o flow de exemplo que abre o editor, por idioma
│  │  ├─ lang.ts           o tipo do idioma do conteúdo autoral
│  │  ├─ chatTypes.ts      modelo da conversa (modo Chat) + os limites oficiais da Meta
│  │  └─ chatPalette.ts    catálogo "Adicionar mensagem"
│  │
│  ├─ shared/
│  │  └─ messages.ts       o contrato tipado UI <-> sandbox (só tipos, sem DOM nem `figma`)
│  │
│  ├─ main/                sandbox do Figma: API `figma`, sem DOM  ->  code.js
│  │  ├─ CLAUDE.md         as armadilhas daqui (auto-layout, paleta, SVG, dynamic-page)
│  │  ├─ index.ts          entrada: mensagens, preferências, section datada, JSON embutido, substituição
│  │  ├─ screen.ts         monta uma tela (chrome + corpo + footer) e reporta os destinos de navegação
│  │  ├─ components.ts     um renderizador por componente do Flow JSON
│  │  ├─ chrome.ts         status bar, cabeçalho do bottom sheet e barra de progresso
│  │  ├─ nodes.ts          helpers de nó + markFill/applyFills (o truque do auto-layout)
│  │  ├─ theme.ts          tokens visuais do WhatsApp, claro e escuro — fonte única
│  │  ├─ fonts.ts          carrega os pesos da Inter antes de escrever qualquer texto
│  │  ├─ routing.ts        transforma as ações `navigate` em reações de protótipo
│  │  └─ thread.ts         modo Chat: monta a conversa inteira como um frame
│  │
│  └─ ui/                  iframe do plugin: DOM, sem API `figma`  ->  ui.html
│     ├─ CLAUDE.md         as regras daqui (como verificar, 14px, wa-*, foco, i18n)
│     ├─ ui.html           markup + CSS (tokens --figma-color-*) e o ponto onde o bundle entra
│     ├─ ui.ts             orquestra tudo: telas, abas, menu, preferências, validação, Gerar
│     ├─ bridge.ts         o postMessage da UI para o sandbox
│     ├─ propEditor.ts     o editor de propriedades de cada componente
│     ├─ preview.ts        o mockup de celular ao vivo (modo Flows)
│     ├─ chat.ts           o mockup de celular ao vivo (modo Chat)
│     ├─ chatComposer.ts   o editor da conversa
│     ├─ dropdown.ts       combobox próprio (o `<select>` nativo não aceita tema)
│     ├─ drag.ts           reordenar cards arrastando
│     ├─ icons.ts          cópia local do Lucide (offline, sem pacote)
│     └─ i18n.ts           o dicionário en/pt da interface
│
├─ build/
│  ├─ esbuild.mjs          o bundler: src/ -> plugin/
│  ├─ tsconfig.base.json   as opções comuns aos dois projetos
│  ├─ tsconfig.main.json   projeto do sandbox — sem a lib DOM
│  └─ tsconfig.ui.json     projeto da UI — sem os tipos do `figma`
│
├─ knowledge/              documentação para ler antes de mexer
│  ├─ CLAUDE.md            o guia de trabalho: comandos, contextos, convenções
│  ├─ BUGFIXES.md          log de bugs não óbvios, com causa e correção
│  ├─ META_SYNC.md         playbook para reconciliar o projeto com a spec da Meta
│  ├─ BACKLOG.md           trabalho aceito e ainda não começado
│  ├─ CHAT_UI.md           a spec de design do modo Chat
│  └─ CHAT_PATTERNS.md     os tipos de mensagem interativa e seus limites oficiais
│
├─ .claude/
│  ├─ agents/
│  │  └─ plugin-ui-tester.md  subagente que exercita a UI no navegador (executável)
│  └─ skills/              procedimentos invocáveis
│     ├─ release/          cortar uma release e conferir o zip publicado
│     └─ meta-sync/        reconciliar o projeto com a spec da Meta
│
├─ README.md               este arquivo
├─ CLAUDE.md               ponteiro para knowledge/CLAUDE.md (é onde o tooling procura)
├─ AGENTS.md               o mesmo ponteiro, para outras ferramentas
├─ package.json            scripts npm + dependências de desenvolvimento
├─ package-lock.json       as versões exatas das dependências
├─ .gitignore              ignora node_modules/ e os dois bundles gerados
└─ LICENSE                 MIT
```

Os dois contextos de execução não se misturam, e isso é garantido pelo
compilador: `tsconfig.main.json` não inclui a lib `DOM`, então `document.*` em
`src/main` não compila; `tsconfig.ui.json` não inclui os tipos do Figma, então
`figma.*` em `src/ui` não compila. Os dois incluem `src/model` e `src/shared`,
que é o que mantém essas duas camadas puras.

### Compartilhar o plugin

Rode `npm run build` e entregue a pasta `plugin/` (zipada). Quem receber importa
o `manifest.json` dela — sem instalar nada, sem código-fonte, sem documentação.
Nada mais do repositório é necessário para rodar. Para compartilhar sem passar
arquivos, publique na Figma Community (público ou restrito à organização).

Veja [knowledge/CLAUDE.md](knowledge/CLAUDE.md) para o guia de quem contribui (ou
do agente de IA): comandos, contextos de execução, como verificar mudanças e as
convenções que importam. E [knowledge/BUGFIXES.md](knowledge/BUGFIXES.md) para o
log de bugs encontrados endurecendo a UI, cada um com causa raiz e correção.

---

## English

Turns the [WhatsApp Flows Playground](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/playground)
into a Figma plugin: compose flow screens from a component palette, edit the
**Flow JSON** live (two-way sync), export it, and click **Generate in Figma** to
render navigable, WhatsApp-styled mockups on the canvas.

### What it does

- **Palette** — add WhatsApp Flows components to a screen (text, inputs,
  selection, media, footer).
- **Screens** — add / remove / rename screens, mark terminal screens.
- **Property editor** — edit each component's real props (input-type, options,
  action targets, captions…), not just the label.
- **Live preview** — a WhatsApp phone mockup with a tab per screen + a Summary
  tab; footer `navigate` actions walk between screens like the real flow.
- **Flow JSON tab** — a live editor kept in sync with the visual builder in both
  directions; invalid JSON is flagged, never applied.
- **Validation** — lints WhatsApp Flows constraints (terminal needs a Footer,
  navigate targets exist, per-component limits…). Errors block generation and
  highlight the offending screen.
- **Import & templates** — load a Flow JSON from file or start from a built-in
  template, **written in the plugin's language** (English or Portuguese);
  **Copy JSON** exports a flow ready for WhatsApp Manager.
- **Generate in Figma** — draws one phone-sized frame per screen (status bar,
  header, body, footer) with WhatsApp visual tokens and wires `navigate` actions
  into **prototype reactions** (clickable prototype, entry screen = starting
  point). Each run is grouped in a **section named with the date**.
- **Round-trip from the canvas** — every generated section carries its Flow JSON
  in an invisible, locked text layer. With the plugin open, click that section in
  Figma and it offers to load the flow back into the builder.
- **Edit updates the section it came from** — a flow loaded that way stays linked
  to its section: the top bar shows which one, and **Generate** becomes **Update**,
  rebuilding that section in place instead of leaving the old screens behind.
  Unlink (the x on the chip) to generate a separate section instead.
- **The conversation behind the sheet** — a flow never opens on a blank phone:
  it slides up over the chat it was sent in. Generated screens draw the
  business's chat header above the sheet, with **name, photo and verified
  badge** set from the menu, in two eras: **current** (the light header, the
  app since 2021) or **classic** (the green bar, measured off Meta's own Flows
  artwork). Turn it off for the bare sheet.
- **Chat mode** — compose a WhatsApp conversation (bubbles, media, quoted
  replies, reply buttons, list menu, flow button, templates) and generate it as a
  frame.

### Component coverage

Text (`TextHeading`, `TextSubheading`, `TextBody`, `TextCaption`, `RichText`),
inputs (`TextInput`, `TextArea`, `DatePicker`, `CalendarPicker`, `PhotoPicker`,
`DocumentPicker`, `OptIn`), selection (`RadioButtonsGroup`, `CheckboxGroup`,
`Dropdown`, `ChipsSelector`, `NavigationList`), media (`Image`, `ImageCarousel`,
`EmbeddedLink`), `Footer`, and logic (`If`, `Switch`).

> Server-driven behavior (`data_exchange`, `complete`, `If`/`Switch`, dynamic
> `${data}` lists) renders as a representative static state — Figma prototypes
> can't execute an endpoint. Only `navigate` becomes a real prototype link.

### Develop

```bash
npm install
npm run build      # -> plugin/code.js + plugin/ui.html
npm run watch      # rebuild main on change
npm run typecheck  # both projects: typecheck:main + typecheck:ui
```

### Load in Figma

1. Run `npm install && npm run build` first — the two bundles are generated, so a
   fresh clone has a manifest with nothing to point at.
2. Figma desktop → **Plugins → Development → Import plugin from manifest…**
3. Select `plugin/manifest.json`.
4. Run **WhatsApp Flows Builder** from the Plugins menu.

Rather not build it? Every [release](https://github.com/lucasbatistaribeiro/whatsappflows-builder/releases)
ships a zip of the built `plugin/` folder: unzip it and import the `manifest.json`
inside.

### Repo layout

`plugin/` is the plugin itself — after a build it holds exactly the three files
Figma loads, and nothing else. Everything used to develop or build it lives
outside that folder, so the shippable plugin is just that one directory.

```
whatsappflows-builder/
│
├─ plugin/                 THE PLUGIN — this folder is all Figma loads
│  ├─ manifest.json        what you import in Figma (name, id, api, entry points, network)
│  ├─ code.js              sandbox bundle               (generated — gitignored)
│  └─ ui.html              UI with its bundle inlined   (generated — gitignored)
│
├─ src/                    source (TypeScript)
│  │
│  ├─ model/               pure: no `figma`, no DOM — imported by both runtimes
│  │  ├─ CLAUDE.md         this layer's rules (never import from ui/ or main/)
│  │  ├─ flowTypes.ts      Flow JSON types + helpers (screenChildren, dataSourceOf, isBinding)
│  │  ├─ validate.ts       the spec's rules; returns message keys, not translated text
│  │  ├─ palette.ts        the "Add component" catalogue and each one's default instance
│  │  ├─ templates.ts      the four starter flows, one set per language
│  │  ├─ sample.ts         the sample flow the editor opens with, per language
│  │  ├─ lang.ts           the locale type for authored content
│  │  ├─ chatTypes.ts      the conversation model (chat mode) + Meta's official limits
│  │  └─ chatPalette.ts    the "Add message" catalogue
│  │
│  ├─ shared/
│  │  └─ messages.ts       the typed UI <-> sandbox contract (types only, no DOM, no `figma`)
│  │
│  ├─ main/                the Figma sandbox: `figma` API, no DOM  ->  code.js
│  │  ├─ CLAUDE.md         the traps here (auto-layout, palette, SVG, dynamic-page)
│  │  ├─ index.ts          entry: messages, prefs, the dated section, embedded JSON, replacement
│  │  ├─ screen.ts         assembles one screen (chrome + body + footer) and reports nav targets
│  │  ├─ components.ts     one renderer per Flow JSON component
│  │  ├─ chrome.ts         status bar, bottom-sheet header and the step progress bar
│  │  ├─ nodes.ts          node helpers + markFill/applyFills (the auto-layout trick)
│  │  ├─ theme.ts          WhatsApp visual tokens, light and dark — single source
│  │  ├─ fonts.ts          loads the Inter weights before any text is written
│  │  ├─ routing.ts        turns `navigate` actions into prototype reactions
│  │  └─ thread.ts         chat mode: builds the whole conversation as one frame
│  │
│  └─ ui/                  the plugin iframe: DOM, no `figma` API  ->  ui.html
│     ├─ CLAUDE.md         the rules here (how to verify, 14px, wa-*, focus, i18n)
│     ├─ ui.html           markup + CSS (--figma-color-* tokens) and where the bundle lands
│     ├─ ui.ts             orchestrates everything: screens, tabs, menu, prefs, validation, Generate
│     ├─ bridge.ts         the UI's postMessage to the sandbox
│     ├─ propEditor.ts     the per-component property editor
│     ├─ preview.ts        the live phone mockup (Flows mode)
│     ├─ chat.ts           the live phone mockup (chat mode)
│     ├─ chatComposer.ts   the conversation editor
│     ├─ dropdown.ts       our own combobox (the native `<select>` can't be themed)
│     ├─ drag.ts           drag-to-reorder for cards
│     ├─ icons.ts          local copy of Lucide (offline, no package)
│     └─ i18n.ts           the interface's en/pt dictionary
│
├─ build/
│  ├─ esbuild.mjs          the bundler: src/ -> plugin/
│  ├─ tsconfig.base.json   the options both projects share
│  ├─ tsconfig.main.json   the sandbox project — no DOM lib
│  └─ tsconfig.ui.json     the UI project — no `figma` typings
│
├─ knowledge/              docs to read before changing anything
│  ├─ CLAUDE.md            the working guide: commands, runtime contexts, conventions
│  ├─ BUGFIXES.md          a log of non-obvious bugs, with root cause and fix
│  ├─ META_SYNC.md         the playbook for reconciling the project with Meta's spec
│  ├─ BACKLOG.md           work accepted but not started
│  ├─ CHAT_UI.md           chat mode's design spec
│  └─ CHAT_PATTERNS.md     the interactive message types and their official limits
│
├─ .claude/
│  ├─ agents/
│  │  └─ plugin-ui-tester.md  subagent that drives the UI in a browser (runnable)
│  └─ skills/              invocable procedures
│     ├─ release/          cut a tagged release and verify the published zip
│     └─ meta-sync/        reconcile the project with Meta's spec
│
├─ README.md               this file
├─ CLAUDE.md               pointer to knowledge/CLAUDE.md (where agent tooling looks)
├─ AGENTS.md               the same pointer, for other tools
├─ package.json            npm scripts + dev dependencies
├─ package-lock.json       the exact dependency versions
├─ .gitignore              ignores node_modules/ and the two generated bundles
└─ LICENSE                 MIT
```

The two runtime contexts never mix, and the compiler enforces it:
`tsconfig.main.json` omits the `DOM` lib, so `document.*` in `src/main` doesn't
compile; `tsconfig.ui.json` omits the Figma typings, so `figma.*` in `src/ui`
doesn't compile. Both include `src/model` and `src/shared`, which is what keeps
those two layers pure.

### Sharing the plugin

Run `npm run build`, then hand over the `plugin/` folder (zipped). The recipient
imports its `manifest.json` — no install, no source, no docs. Nothing else in the
repo is needed to run it. To share without passing files around at all, publish to
the Figma Community (public, or unlisted/org-only).

See [knowledge/CLAUDE.md](knowledge/CLAUDE.md) for the contributor / AI-agent guide (commands,
runtime contexts, how to verify changes, and the key conventions), and
[knowledge/BUGFIXES.md](knowledge/BUGFIXES.md) for a log of bugs found while hardening the
UI, each with its root cause and fix.
