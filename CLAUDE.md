# TRACE

App móvel (Android e iOS) de gestão operacional de frotas para pequenas e médias empresas. É o TCC do autor (`gustavomcss`) e evolui um MVP anterior. Cobre cadastro de veículos e motoristas, rotas (saída/retorno), abastecimento, troca de óleo, manutenção em oficina, denúncia e correção de divergência de km, histórico e relatórios em PDF.

Documentos de origem (fora do repositório, versão de 13/10/2026): **TRACE – Requisitos** (23 RF, 8 RNF, 19 RB), **TRACE – Planejamento de Issues** (6 milestones, 43 issues I-01 a I-43), DCU e DER. Os IDs RFxx, RNFxx, RBxx e I-nn citados aqui vêm deles.

## Stack

- **App:** React Native + Expo, TypeScript, uma única base de código (RNF01).
- **Formulários:** React Hook Form + Zod; esquemas em `src/schemas` (RNF06).
- **Referência visual:** o protótipo navegável das 13 telas (artifact em `https://claude.ai/artifact/2z3mH9J8ev3n44G3x1j3M5`, com medidas em dp) é a referência de layout. Valores fora da escala viraram `sizes` em `src/theme` (botão 40, campo 44, ícone 24, ícone das abas 24, caixa do ícone 44, botão só de ícone 32, avatar 64). Onde o protótipo e o app divergem, vale o que está decidido aqui.
    - **Como consultar:** use a ferramenta `Artifact` com `action: "read"` e essa URL (a conta é a do autor). O HTML fica salvo em arquivo local e as telas estão em funções `b<Tela>` (`bServicos`, `bHistorico`, `bUsuario`, `bLogin`, `bMotoristas`, `bVeiculos`, `bRevisao`, `bEncerramento`, `bRelatorios`), os formulários em `FORMS` (`login`, `senha`, `rotaSaida`, `rotaRetorno`, `denuncia`, `abastecimento`, `oleo`...) e os textos dos cards em `OPS`/`ADM`/`TITLES`. Antes de fazer uma tela, leia a parte dela.
    - **Decisões de UI já tomadas pelo autor (valem sobre o protótipo):** títulos com só a primeira palavra em maiúscula ("Troca de óleo"); ícone do card de Serviços no topo, à esquerda, sem seta à direita; ícone da aba com 24 dp, como no protótipo; cabeçalho só com texto; botão com 40 dp e área de toque estendida; só ícones Lucide; filtros que se combinam ficam em linhas de chips separadas (situação numa, tipo de veículo noutra), e nenhum chip selecionado significa tudo; cards com 12 dp de padding interno (`Card`), em todo o app; badges de situação seguem um padrão: em andamento ou ativo é `outline` ("Ativo", "Aberta") e terminado ou inativo é `secondary`, esmaecido ("Inativo", "Encerrada"), e a exceção são os badges de notificação da tela de Serviços, sobrepostos ao canto do card, que ficam pretos com texto branco (`default`): o "Aberta" do card "Rota" e o contador do card "Encerramento de rotas". Padrão dos badges da denúncia de km (aplicado na #28): "Pendente" é notificação (preto, `default`) e "Aprovada" e "Reprovada" são desfechos (`secondary`), distinguidos só pelo texto; dentro das telas, "Pendente" é `outline`.
    - **Já trazidos do protótipo:** o diálogo de confirmação com duas ações (`ConfirmDialog`, usado em aprovar, reprovar, encerrar, excluir e nos envios), a barra fixa de ação no rodapé dos formulários (`ActionBar`) e os badges de situação nos cards de Serviços (`ServicesScreen`).
- **Ícones:** só `lucide-react-native` (o mesmo conjunto do ShadCN, sobre `react-native-svg`, que o Expo Go já traz). Não misturar com outra biblioteca de ícones.
- **Backend:** PocketBase v0.40.5 autogerenciado (Docker via Coolify, HTTPS via Cloudflare Tunnel) em `pb.wizecode.com.br` (RNF02). Use a API de migrações e de hooks JS da v0.23+ (`_superusers`, `e.next()`, `$app.save`). Os detalhes da instância estão em `backend/README.md`.
- **Regras de backend:** API Rules do PocketBase + hooks em JavaScript (`pb_hooks/`). Esquema e regras versionados em `pb_migrations/` (RNF07).

## Estrutura

```
frontend/                App Expo (package.json, .env e comandos npm ficam aqui)
  src/screens            telas
  src/services           acesso ao PocketBase (cliente único em src/services/pocketbase)
  src/components         componentes de UI reutilizáveis, no estilo ShadCN (I-09)
  src/contexts           estado global (sessão: AuthContext)
  src/navigation         navegação: abas, pilha e lista de módulos por perfil (modules.ts)
  src/schemas            esquemas Zod
  src/theme              tokens de design: paleta de cinzas, raios, espaçamentos, fontes
backend/
  pb_migrations/         migrações do PocketBase (coleções, campos, API Rules)
  pb_hooks/              hooks JS do PocketBase, um arquivo por assunto (`author`, `decimal_fields`, `vehicles`, `vehicle_plate`, `users`, `routes`, `complaints`, `service_records`: autor, decimais, criação e inativação de veículo, placa equivalente, edição de usuários, regras de rotas e km do veículo, regras e correção de km das denúncias, registros de serviço)
  tests/                 testes de API do backend (Node, sem dependências); `npm test` em backend/
```

Em `backend/`, as pastas `pb_migrations` e `pb_hooks` do checkout no servidor são montadas (bind mount) em `/app/pb_migrations` e `/app/pb_hooks` no container do PocketBase em produção. Tudo que estiver em `pb_migrations` roda no próximo restart, e os hooks recarregam assim que um arquivo muda. Trocar de branch muda o que a produção carrega. Não deixe migração incompleta ali.

## Princípios que valem para todo o código

- **O backend é a fonte da verdade.** Toda restrição de acesso e de integridade fica nas API Rules ou nos hooks. O app só valida antes, para dar feedback, e exibe o aviso do backend (RNF03, RNF06). Esconder um botão ou card nunca substitui a regra no servidor.
- **Sem credenciais no código.** A URL do PocketBase vem de variável de ambiente (`.env`, com `.env.example` commitado). O app guarda só o token de sessão, em armazenamento seguro, nunca a senha (RNF04).
- **`created` é do servidor** (autodate). Nunca enviar data de criação pelo app (RNF05).
- **O autor é definido pelo servidor** a partir do usuário autenticado (`@request.auth.id`), não pelo corpo da requisição.
- **Km e valores:** decimais 8,2 (até 999.999,99), duas casas, não negativos, validados no app e no servidor (RB16).
- **Erros do servidor** são traduzidos em mensagens no formulário, não em erro genérico (I-08). Em 401/403, o app encerra a sessão e avisa (I-07).
- **Interface simples:** poucas telas e poucos campos por registro (RNF08). Textos da UI em português.
- **Android e iOS iguais (RNF01):** o comportamento de sistema é o mesmo nas duas plataformas, sem ramo por `Platform` quando o resultado pode ser um só. Dois padrões, nascidos do teste no Android em 4/11: (1) o app é só claro (`userInterfaceStyle: light`), então a `StatusBar` é sempre `dark`, em `App.tsx`; com `auto` os ícones ficavam brancos sobre o cabeçalho branco no tema escuro do celular. (2) **Teclado: tudo passa pela `react-native-keyboard-controller`** (`KeyboardProvider` em `App.tsx`, `KeyboardAwareScrollView` no `FormScrollView` e no login). Toda tela com campo de texto abaixo da dobra usa `FormScrollView` e `ActionBar` para a ação principal; não crie `ScrollView` solto com formulário. A biblioteca é nativa, igual em iOS e Android, rola o campo em foco para cima do teclado em sincronia com ele e já vem no Expo Go (`bundledNativeModules` do SDK 58: `react-native-keyboard-controller` 1.22.7, com `react-native-reanimated` 4.7.1 e `react-native-worklets` 0.13.0, que ela exige). Regra do autor: só mecanismo nativo ou de biblioteca, sem medição nem cálculo de posição à mão (as tentativas com `KeyboardAvoidingView`, com medição própria e com `automaticallyAdjustKeyboardInsets` foram substituídas por ela). A `ActionBar` continua parada com o teclado: no iOS o teclado a cobre e no Android ela some enquanto ele está aberto. **Reverificado em 10/11 (autor, Android):** a barra de abas na busca do Histórico e a `ActionBar` que piscava se comportam normalmente, então não são mais limitações (as tentativas descritas nas #39 e #40 ficam como histórico).
- **Folhas e diálogos em `Modal` respeitam a barra do sistema:** no app instalado (não no Expo Go) o Android desenha o `Modal` de borda a borda, então o que fica ancorado embaixo, como a `BottomSheet`, soma a margem inferior da área segura (`useSafeAreaInsets`) ao próprio padding, senão cai atrás dos botões de voltar, início e recentes (achado na #41). Ao testar uma tela nova com `Modal`, teste também no APK.
- **Texto digitado não é reescrito a cada tecla, e a capitalização é uma só:** reescrever a letra que está sendo digitada (por exemplo, `capitalizeWords` no `onChangeText`) duplicou a letra com o teclado compondo o texto ("Moto" virava "Mm", "Teste" virava "Tt" no campo Modelo, achado do autor em 4/11). Todo campo de texto livre usa a propriedade `capitalize` do `Input`/`TextField`: `words` (Nome e Modelo do veículo) ou `sentences` (Itinerário, Tipo do óleo, Observação e Descrição). Ela pede a capitalização ao teclado (`autoCapitalize`), desliga o corretor em `words` e aplica `applyTextCase` (`src/schemas/masks.ts`) quando o campo perde o foco; `words` e `sentences` **normalizam o resto em minúsculas** ("gustavo Martins CORRÊA" vira "Gustavo Martins Corrêa"; "kkkkkk ROTA. teste" vira "Kkkkkk rota. Teste"),; o esquema Zod do campo repete o `applyTextCase` no envio, porque tocar no botão de enviar não tira o foco do campo (`keyboardShouldPersistTaps="handled"`). Campo de texto novo declara `capitalize` e põe o mesmo `transform` no esquema. Só as máscaras numéricas (km, valor, data) reescrevem a cada tecla, porque o teclado numérico não compõe texto, e a placa (`formatPlate`), que já chega em maiúsculas pelo teclado.
- **Comentários no código:** só blocos `/* */`, em inglês, em JS, TS e demais código (app, hooks, migrações e testes). Use `/** */` para documentar, em uma ou duas linhas, o que cada arquivo, função, componente ou constante exportada faz, e `/* */` para notas dentro do código. Não use `//` (a diretiva `/// <reference ...>` é exceção). Todo o código é em inglês: nomes, comentários, nomes de teste e mensagens de erro internas. Tudo que o usuário final vê é em português e vive no app: textos da UI e a tradução dos erros do servidor. O servidor responde com `code` e mensagem em inglês; o app nunca exibe o texto em inglês, e sim a tradução pelo `code`, com uma mensagem genérica em português quando o código não for conhecido (I-08). Valores de enum do modelo (`motorista`, `aberta`...) são dados e ficam em português. A documentação em Markdown (README, CLAUDE.md) é em português.
- Qualquer mudança de esquema ou de regra gera migração commitada na mesma PR.

## Perfis e navegação

- **Motorista:** rotas, denúncia, abastecimento, troca de óleo, manutenção, histórico (só os próprios registros).
- **Supervisor:** tudo do motorista + gestão de motoristas, gestão de veículos, revisão de denúncias, encerramento administrativo de rotas, relatórios. Vê os registros de todos.
- **Superadmin:** superuser do PocketBase, fora do app. Cria e gerencia supervisores e muda o cargo de usuários.
- **Navegação (RF20):** três abas para ambos (Histórico, Serviços, Usuário). O app abre em Serviços e o voltar das outras abas leva a Serviços antes de sair (decidido na #40). Os módulos administrativos são cards em Serviços, visíveis só ao supervisor.
- Não existe auto-cadastro.

## Modelo de dados (DER)

Todos os `id` são `CHAR(15)` (padrão do PocketBase). Nenhuma relação tem exclusão em cascata: a exclusão é bloqueada quando há vínculo (RB12, RB18).

| Coleção     | Campos                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| USER (auth) | email (UK), created, active, role `motorista\|supervisor`, name, photo                                                                                         |
| VEHICLE     | plate (UK, 8), created, active, type `carro\|moto\|caminhao\|van`, model, odometer                                                                             |
| ROUTE       | user→USER, vehicle→VEHICLE, status `aberta\|finalizada\|encerrada`, itinerary, date_departure, km_departure, obs_departure, date_return, km_return, obs_return |
| COMPLAINT   | route_current→ROUTE (UK), route_previous→ROUTE, created, km_complaint, status `pendente\|aprovada\|reprovada`, photo, reviewed                                 |
| FUEL        | user, vehicle, created, km_fuel, type `gasolina\|aditivada\|etanol\|diesel`, liters, cost                                                                      |
| OIL         | user, vehicle, created, km_oil, type (texto), cost                                                                                                             |
| REPAIR      | user, vehicle, created, km_repair, description, cost                                                                                                           |

- `VEHICLE.odometer` é o "km atual" do veículo.
- COMPLAINT não tem campo de autor: o denunciante é o `user` da `route_current`.
- Nomes no PocketBase (I-03, migração `backend/pb_migrations/1792539204_create_trace_collections.js`): `users` (auth padrão, com `avatar` renomeado para `photo`), `vehicles`, `routes`, `complaints`, `fuels`, `oils`, `repairs`. Os nomes dos campos são os do DER.
- `routes.date_departure` é autodate (data de criação da rota); `routes.date_return` é preenchida pelo servidor ao finalizar (I-19). `complaints.reviewed` é a data e hora da revisão.
- `number` obrigatório rejeita 0 no PocketBase, por isso `vehicles.odometer` e `routes.km_departure` não são `required`. `users.active` ausente vale `false`: quem cria o usuário envia `active = true`.
- As duas casas decimais (RB16) são validadas em `backend/pb_hooks/decimal_fields.pb.js`; o intervalo 0 a 999.999,99 é do próprio campo.
- As API Rules base (I-05, migração `1792601121_set_base_api_rules.js`) abrem só listagem e visualização por perfil, a criação e, em `vehicles`, a edição e a exclusão do supervisor. O delete de `fuels`, `oils`, `repairs`, `complaints` e `routes` segue em `null` (só superuser) para sempre (RB17). O update de `fuels`, `oils` e `repairs` é da I-31 (migração `1793388044_set_service_record_edit_rules.js`, testes em `backend/tests/service-record-edit.test.js`). Create e update de `complaints` são da I-27 (migração `1793196483_set_complaint_rules.js`, hook `pb_hooks/complaints.pb.js`, testes em `backend/tests/complaint-rules.test.js`); a correção de km na aprovação é da I-30, no mesmo hook (testes em `backend/tests/complaint-correction.test.js`). Create e update de `routes` são da I-18 (migração `1793049600_set_route_rules.js`, hook `pb_hooks/routes.pb.js`, testes em `backend/tests/route-rules.test.js`). Create, update e manage de `users` são da I-11 (migração `1792705420_set_user_edit_rules.js`, hook `pb_hooks/users.pb.js`, testes em `backend/tests/user-rules.test.js`), e o delete de `users` é da I-15 (migração `1792957049_set_user_delete_rule.js`, mesmo hook e mesmos testes). As regras padrão de `users` permitiam auto-cadastro e a troca do próprio cargo.
- A placa segue `AAA-0A00` (maiúsculas, 8 caracteres com o hífen), por `pattern` na migração `1792617392_restrict_vehicle_plate_format.js`. O hook `backend/pb_hooks/vehicles.pb.js` exige o `odometer` enviado e numérico na criação e grava veículo criado por usuário como ativo (testes em `backend/tests/vehicle-form.test.js`); recusa também a inativação com rota `aberta` (`vehicle_has_open_route` em `active`) e a exclusão com rota, abastecimento, óleo ou manutenção (`vehicle_has_records` em `id`), RB12 (testes em `backend/tests/vehicle-management.test.js`).
- **RB20 (nova na versão 2.0 do documento de Requisitos, junto com a RB21):** placa antiga e Mercosul equivalente são a mesma placa. O 5º caractere é dígito no formato antigo e a letra de A a J na mesma posição no Mercosul (0=A ... 9=J), então `ABC-1323` equivale a `ABC-1D23`, e uma letra depois de J não tem equivalente antiga. O hook `backend/pb_hooks/vehicle_plate.pb.js` recusa o cadastro ou a edição para a placa equivalente de outro veículo (`validation_not_unique` em `plate`), e o índice único `idx_vehicles_plate_canonical` (migração `1792622079_restrict_plate_equivalence.js`) garante isso no banco mesmo com requisições simultâneas. Converter a placa de um veículo é editar a placa dele (#17), sem criar outro. O app confere antes de enviar (`findVehicleByPlate`, `equivalentPlate` em `src/schemas/plates.ts`).
- O autor (`user`) de rota, abastecimento, óleo e manutenção é gravado por `backend/pb_hooks/author.pb.js` a partir do usuário autenticado; o app não precisa enviar o campo. A denúncia não tem autor: a regra de criação exige que a `route_current` seja do usuário autenticado.

## Regras de negócio essenciais

As regras abaixo são as que mais afetam o código. A redação completa está no documento de Requisitos.

- **RB01 / RB02:** no máximo uma rota `aberta` por veículo e por motorista. O app verifica ao abrir "Registrar saída" e o backend rejeita.
- **RB03:** o `odometer` é informado no cadastro e depois é igual ao `km_return` da última rota `finalizada`. Quem atualiza é um hook no servidor. Ao abrir a rota, o `km_departure` tem de ser igual ao `odometer` do veículo (`km_departure_not_odometer`, `routes.pb.js`): sem isso, uma requisição direta poderia abrir a rota num km qualquer e rebaixar o `odometer` ao finalizar. O app já envia o km atual.
- **RB04:** o km de abastecimento, óleo e oficina é só informativo e não altera o `odometer`.
- **RB05:** uma denúncia pendente não impede finalizar a rota.
- **RB06 / RB07 / RB14:** ao aprovar uma denúncia, uma única transação no servidor:
  - corrige o `km_departure` da rota do denunciante;
  - se a rota anterior do veículo estiver `finalizada`, corrige também o `km_return` dela;
  - se essa rota for a última finalizada, atualiza o `odometer`.

  Se alguma correção gerar inconsistência, tudo é rejeitado. A reprovação não altera nenhum km.

- **RB08:** o supervisor pode revisar a própria denúncia.
- **RB09:** o `odometer` nunca é editável pelo app.
- **RB10:** o histórico de rotas mostra só rotas `finalizada`. As `encerrada` aparecem só no módulo de encerramento.
- **RB11:** no máximo uma denúncia por rota, criada só com a rota aberta e com km diferente do `km_departure`.
- **RB12:** veículo com registros vinculados não é excluído, é inativado. Veículo inativo sai das seleções, mas continua no histórico e nos relatórios.
- **RB13:** o `km_return` deve ser maior que o `km_departure`. **Acréscimo, decidido na #28:** enquanto a rota tem denúncia `pendente`, o retorno também precisa ser maior que o km da denúncia, para a rota ficar coerente qualquer que seja a revisão (aprovar leva a saída ao km denunciado; reprovar a deixa onde está). `pb_hooks/routes.pb.js` aplica o piso, que é o maior entre a saída e a denúncia pendente. Se a saída estiver errada para mais (denúncia menor que a saída), o motorista só finaliza depois da revisão: a RB13 nunca é afrouxada.
- **RB15:** o encerramento administrativo é feito só pelo supervisor:
  - não pede km;
  - não altera o `odometer`;
  - status `encerrada`;
  - libera o veículo e o motorista;
  - **RB21 (nova na versão 2.0):** é recusado enquanto a rota tem denúncia `pendente` (`route_has_pending_complaint`, `pb_hooks/routes.pb.js`), para a denúncia não ficar sem destino.
- **RB17:** nada é excluído pelo app. Rotas e denúncias só mudam pelos fluxos previstos: finalização pelo autor (uma vez), encerramento, revisão e correção de km. Em FUEL, OIL e REPAIR, só o autor edita, e só os campos não sensíveis (valor, litros, tipo, descrição). Veículo, km, autor e data ficam fixos.
- **RB18:** usuário inativo não autentica nem acessa dados, mesmo com sessão aberta. A desativação é bloqueada com rota aberta, e a exclusão é bloqueada com registros vinculados.
- **RB19:** o usuário altera só a própria foto e a própria senha. O supervisor cria motoristas (e-mail + senha inicial de no mínimo 8 caracteres) e edita só nome, foto, situação e senha deles. O supervisor nunca altera outro supervisor, e o app só cria usuários com cargo `motorista`.

## Fluxo de trabalho

- **Fonte de tarefas:** issues e milestones do GitHub em `gustavomcss/TCC-AppExpo`, acessadas pelo `gh` CLI autenticado como `gustavomcss`. Use só o `gh` CLI, não o conector MCP do GitHub.
- **Numeração:** a issue I-nn do plano corresponde à `#nn` do GitHub. Antes de começar, leia a issue (`gh issue view <n>`) e confira as dependências.
- **Branches e PRs:**
  - um branch por issue (ex.: `issue-6-autenticacao`);
  - PR com `Closes #n` e merge na `main`;
  - commit e push só quando o usuário pedir;
  - o histórico em `docs/historico-de-desenvolvimento.md` é atualizado a cada merge (data e uma linha por issue), de preferência na própria PR da issue, antes do merge; a seção "Estado atual" deste arquivo só muda quando o estado geral muda.
- **Definição de pronto:**
  - todos os critérios de aceite marcados;
  - as RBs citadas na issue verificadas no app **e** no backend;
  - sem erros de lint e de tipos;
  - testado em emulador, dispositivo ou Expo Go;
  - migrações commitadas quando houver mudança de esquema ou de regras.
- **Testes de backend:** valide cada regra também com requisições diretas à API, sem passar pelo app, para provar que o backend sustenta a regra sozinho. Isso é automatizado em `backend/tests` (`node --test` contra um PocketBase descartável, nunca contra a produção; veja `backend/README.md`). Cada issue de backend traz os testes dos seus critérios de aceite e RBs, e `npm test` em `backend/` precisa estar verde antes da PR.
- **Título das issues:** `[RFxx] Resumo`. As de infraestrutura usam o RNF; as de teste e de TCC usam `[Testes]` e `[TCC]`.
- **Corpo das issues:** um parágrafo de descrição, depois **Tarefas** (lista de bullets) e **Critérios de aceite** (checklist `- [ ]`). Não usamos labels.
- **Tamanho das issues:** P até 3 h, M de 3 a 6 h, G acima de 6 h.

## Milestones

| #   | Milestone                       | Prazo | Issues      | Foco                                                                                                      |
| --- | ------------------------------- | ----- | ----------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Fundação e Backend              | 16/10 | I-01 a I-09 | Expo, PocketBase, coleções, migrações, API Rules base, login, bloqueio de inativo, cliente + Zod, UI base |
| 2   | Usuários, Veículos e Navegação  | 20/10 | I-10 a I-17 | Abas por perfil, regras de usuários, perfil, gestão de motoristas e veículos                              |
| 3   | Rotas e Registros               | 24/10 | I-18 a I-26 | Regras de rotas e registros, saída, retorno, encerramento, abastecimento, óleo, oficina                   |
| 4   | Denúncias e Edição de Registros | 28/10 | I-27 a I-32 | Regras de denúncia, denúncia, revisão, correção de km (I-30), edição de registros                         |
| 5   | Histórico e Relatórios          | 30/10 | I-33 a I-38 | Histórico por módulo, card de rota, relatório financeiro em PDF, relatórios extras (opcional)             |
| 6   | Fechamento e Documentação       | 31/10 | I-39 a I-43 | Testes das RBs, Android/iOS, build, README, insumos do TCC                                                |

**Ordem dentro de cada milestone:** as issues de backend vêm antes das telas que dependem delas (I-11, I-18, I-19, I-27, I-31).

- **M1:** I-01 e I-02 em paralelo, depois I-03 a I-05, depois I-06 a I-09.
- **M4:** a I-30 começa cedo, porque é a de maior risco.
- **M5:** a I-33 pode ser antecipada já na M3.

**Ordem de corte se faltar tempo:** I-38, depois I-43, depois I-42 e I-40.

## Decisões e pontos em aberto

- **Senha:** mínimo de 8 caracteres, o padrão do PocketBase.
- **Chaves:** a placa é UK e a PK é o `id`.
- **Expo SDK 58:** é o SDK do Expo Go instalado no iPhone de teste (a App Store só abre o SDK que o Expo Go dela suporta; em 23/10 ela passou do 57 para o 58 e o projeto subiu junto, com `expo install expo@~58 --fix`). Ao subir de SDK, confira antes a versão do Expo Go no iPhone e no Android; se faltar, use build de desenvolvimento (exige conta Apple no iOS).
- **iOS:** os testes e a entrega são pelo Expo Go (SDK 58). O instalável para iOS fica como trabalho futuro (exige o Apple Developer Program, decidido na #41).
- **iPad:** `ios.supportsTablet` está `false` desde 10/11, porque o suporte a tablet nunca foi testado (só iPhone XS e Galaxy S25 FE).
- **Indentação:** 4 espaços em todos os arquivos (`.editorconfig` e `frontend/.prettierrc`).
- **Migrações:** o arquivo se chama `<timestamp Unix>_<nome>.js`, gerado por `migrate create`. Uma migração já aplicada na produção nunca é renomeada nem editada: o PocketBase registra o nome do arquivo, e um nome novo roda de novo e quebra o restart. Cada mudança é uma migração nova, de preferência uma por issue.
- **Relatório financeiro (I-36):** a soma é feita no app, decidido pelo autor na #36: o servidor só filtra (`created`, placa, modelo e tipo do veículo) e devolve o `cost` e o veículo de cada registro. Sem endpoint nem migração.
- **Riscos técnicos:**
  - hooks JS do PocketBase (começar pelo da I-18 antes do da I-30);
  - upload da foto da denúncia (testar cedo em aparelho real);
  - PDF em Android e iOS (fazer uma prova rápida antes da M5).

## Estado atual (10/11/2026)

- **Todas as 44 issues** (I-01 a I-43 e a #47, fora do plano) **e as 6 milestones estão fechadas** desde 10/11/2026; a #43 foi a última. O desenvolvimento começou em 20/10. Issues e PRs dividem a numeração no GitHub (#44 a #46 foram PRs), então "I-nn = #nn" só vale até a #43.
- **Histórico completo, issue por issue** (decisões, achados, o que foi visto no aparelho): [docs/historico-de-desenvolvimento.md](docs/historico-de-desenvolvimento.md). É onde se registra cada merge novo. O mapa de todos os documentos é [docs/README.md](docs/README.md).
- **Testes:** `npm test` em `backend/` dá 545 de 545 (19 arquivos, 120 suítes). Requisitos finais, limitações e rastreabilidade: [docs/requisitos-final.md](docs/requisitos-final.md).
- **Produção:** `pb.wizecode.com.br` tem os **dados de demonstração** do TCC (7 usuários `nome.sobrenome@trace.com`, 8 veículos, cerca de 110 rotas, denúncias e registros de seis meses). Para apagar, recriar ou renovar as datas: `cd backend && npm run seed:clean`, `npm run seed` ou `npm run seed:reset`; o plano e a receita estão em [docs/tcc/capturas/README.md](docs/tcc/capturas/README.md). O script só apaga os endereços exatos que cria.
- **Expo:** o `expo install` reescreve o `package.json` com 2 espaços; depois dele rode `prettier --write package.json` para voltar aos 4.
