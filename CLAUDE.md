# TRACE

App móvel (Android e iOS) de gestão operacional de frotas para pequenas e médias empresas. É o TCC do Gustavo (`gustavomcss`) e evolui um MVP anterior. Cobre cadastro de veículos e motoristas, rotas (saída/retorno), abastecimento, troca de óleo, manutenção em oficina, denúncia e correção de divergência de km, histórico e relatórios em PDF.

Documentos de origem (fora do repositório, versão de 13/10/2026): **TRACE – Requisitos** (23 RF, 8 RNF, 19 RB), **TRACE – Planejamento de Issues** (6 milestones, 43 issues I-01 a I-43), DCU e DER. Os IDs RFxx, RNFxx, RBxx e I-nn citados aqui vêm deles.

## Stack

- **App:** React Native + Expo, TypeScript, uma única base de código (RNF01).
- **Formulários:** React Hook Form + Zod; esquemas em `src/schemas` (RNF06).
- **Backend:** PocketBase v0.40.5 autogerenciado (Docker via Coolify, HTTPS via Cloudflare Tunnel) em `pb.wizecode.com.br` (RNF02). Use a API de migrações e de hooks JS da v0.23+ (`_superusers`, `e.next()`, `$app.save`). Os detalhes da instância estão em `backend/README.md`.
- **Regras de backend:** API Rules do PocketBase + hooks em JavaScript (`pb_hooks/`). Esquema e regras versionados em `pb_migrations/` (RNF07).

## Estrutura

```
frontend/                App Expo (package.json, .env e comandos npm ficam aqui)
  src/screens            telas
  src/services           acesso ao PocketBase (cliente único em src/services/pocketbase)
  src/components         componentes de UI reutilizáveis, no estilo ShadCN (I-09)
  src/contexts           estado global (sessão: AuthContext)
  src/schemas            esquemas Zod
  src/theme              tokens de design: paleta de cinzas, raios, espaçamentos, fontes
backend/
  pb_migrations/         migrações do PocketBase (coleções, campos, API Rules)
  pb_hooks/              hooks JS do PocketBase (autor, decimais, km do veículo, correção por denúncia)
  tests/                 testes de API do backend (Node, sem dependências); `npm test` em backend/
```

Em `backend/`, as pastas `pb_migrations` e `pb_hooks` deste checkout (`/home/gustavo/TCC-AppExpo/backend`) são montadas (bind mount) em `/app/pb_migrations` e `/app/pb_hooks` no container do PocketBase em produção. Tudo que estiver em `pb_migrations` roda no próximo restart, e os hooks recarregam assim que um arquivo muda. Trocar de branch muda o que a produção carrega. Não deixe migração incompleta ali.

## Princípios que valem para todo o código

- **O backend é a fonte da verdade.** Toda restrição de acesso e de integridade fica nas API Rules ou nos hooks. O app só valida antes, para dar feedback, e exibe o aviso do backend (RNF03, RNF06). Esconder um botão ou card nunca substitui a regra no servidor.
- **Sem credenciais no código.** A URL do PocketBase vem de variável de ambiente (`.env`, com `.env.example` commitado). O app guarda só o token de sessão, em armazenamento seguro, nunca a senha (RNF04).
- **`created` é do servidor** (autodate). Nunca enviar data de criação pelo app (RNF05).
- **O autor é definido pelo servidor** a partir do usuário autenticado (`@request.auth.id`), não pelo corpo da requisição.
- **Km e valores:** decimais 8,2 (até 999.999,99), duas casas, não negativos, validados no app e no servidor (RB16).
- **Erros do servidor** são traduzidos em mensagens no formulário, não em erro genérico (I-08). Em 401/403, o app encerra a sessão e avisa (I-07).
- **Interface simples:** poucas telas e poucos campos por registro (RNF08). Textos da UI em português.
- **Comentários no código:** só blocos `/* */`, em inglês, em JS, TS e demais código (app, hooks, migrações e testes). Use `/** */` para documentar, em uma ou duas linhas, o que cada arquivo, função, componente ou constante exportada faz, e `/* */` para notas dentro do código. Não use `//` (a diretiva `/// <reference ...>` é exceção). Todo o código é em inglês: nomes, comentários, nomes de teste e mensagens de erro internas. Tudo que o usuário final vê é em português e vive no app: textos da UI e a tradução dos erros do servidor. O servidor responde com `code` e mensagem em inglês; o app nunca exibe o texto em inglês, e sim a tradução pelo `code`, com uma mensagem genérica em português quando o código não for conhecido (I-08). Valores de enum do modelo (`motorista`, `aberta`...) são dados e ficam em português. A documentação em Markdown (README, CLAUDE.md) é em português.
- Qualquer mudança de esquema ou de regra gera migração commitada na mesma PR.

## Perfis e navegação

- **Motorista:** rotas, denúncia, abastecimento, troca de óleo, manutenção, histórico (só os próprios registros).
- **Supervisor:** tudo do motorista + gestão de motoristas, gestão de veículos, revisão de denúncias, encerramento administrativo de rotas, relatórios. Vê os registros de todos.
- **Superadmin:** superuser do PocketBase, fora do app. Cria e gerencia supervisores e muda o cargo de usuários.
- **Navegação (RF20):** três abas para ambos (Histórico, Serviços, Usuário). Os módulos administrativos são cards em Serviços, visíveis só ao supervisor.
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
- As API Rules base (I-05, migração `1792601121_set_base_api_rules.js`) abrem só listagem e visualização por perfil, a criação e, em `vehicles`, a edição e a exclusão do supervisor. Update e delete de `routes`, `complaints`, `fuels`, `oils` e `repairs`, e create, update e delete de `users`, seguem em `null` (só superuser) até as issues que os definem (I-11, I-18, I-27, I-31). As regras padrão de `users` permitiam auto-cadastro e a troca do próprio cargo.
- O autor (`user`) de rota, abastecimento, óleo e manutenção é gravado por `backend/pb_hooks/author.pb.js` a partir do usuário autenticado; o app não precisa enviar o campo. A denúncia não tem autor: a regra de criação exige que a `route_current` seja do usuário autenticado.

## Regras de negócio essenciais

As regras abaixo são as que mais afetam o código. A redação completa está no documento de Requisitos.

- **RB01 / RB02:** no máximo uma rota `aberta` por veículo e por motorista. O app verifica ao abrir "Registrar saída" e o backend rejeita.
- **RB03:** o `odometer` é informado no cadastro e depois é igual ao `km_return` da última rota `finalizada`. Quem atualiza é um hook no servidor.
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
- **RB13:** o `km_return` deve ser maior que o `km_departure`.
- **RB15:** o encerramento administrativo é feito só pelo supervisor:
  - não pede km;
  - não altera o `odometer`;
  - status `encerrada`;
  - libera o veículo e o motorista.
- **RB17:** nada é excluído pelo app. Rotas e denúncias só mudam pelos fluxos previstos: finalização pelo autor (uma vez), encerramento, revisão e correção de km. Em FUEL, OIL e REPAIR, só o autor edita, e só os campos não sensíveis (valor, litros, tipo, descrição). Veículo, km, autor e data ficam fixos.
- **RB18:** usuário inativo não autentica nem acessa dados, mesmo com sessão aberta. A desativação é bloqueada com rota aberta, e a exclusão é bloqueada com registros vinculados.
- **RB19:** o usuário altera só a própria foto e a própria senha. O supervisor cria motoristas (e-mail + senha inicial de no mínimo 8 caracteres) e edita só nome, foto, situação e senha deles. O supervisor nunca altera outro supervisor, e o app só cria usuários com cargo `motorista`.

## Fluxo de trabalho

- **Fonte de tarefas:** issues e milestones do GitHub em `gustavomcss/TCC-AppExpo`, acessadas pelo `gh` CLI autenticado como `gustavomcss`. Não use o conector MCP do GitHub, que está em outra conta.
- **Numeração:** a issue I-nn do plano corresponde à `#nn` do GitHub. Antes de começar, leia a issue (`gh issue view <n>`) e confira as dependências.
- **Branches e PRs:**
  - um branch por issue (ex.: `issue-6-autenticacao`);
  - PR com `Closes #n` e merge na `main`;
  - commit e push só quando o usuário pedir;
  - a seção "Estado atual" deste arquivo é atualizada a cada merge (data e uma linha por issue), de preferência na própria PR da issue, antes do merge.
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
- **Expo SDK 57:** é o SDK do Expo Go instalado no iPhone de teste (a App Store só abre o SDK que o Expo Go dela suporta). Ao subir de SDK, confira antes a versão do Expo Go no iPhone e no Android; se faltar, use build de desenvolvimento (exige conta Apple no iOS).
- **iOS:** os testes são feitos pelo Expo Go (SDK 57). O instalável para iOS segue em aberto (exige conta Apple).
- **Indentação:** 4 espaços em todos os arquivos (`.editorconfig` e `frontend/.prettierrc`).
- **Migrações:** o arquivo se chama `<timestamp Unix>_<nome>.js`, gerado por `migrate create`. Uma migração já aplicada na produção nunca é renomeada nem editada: o PocketBase registra o nome do arquivo, e um nome novo roda de novo e quebra o restart. Cada mudança é uma migração nova, de preferência uma por issue.
- **Relatório financeiro (I-36):** ainda não está decidido onde agregar. A recomendação é agregar no app, mas precisa ser confirmada.
- **Riscos técnicos:**
  - hooks JS do PocketBase (começar pelo da I-18 antes do da I-30);
  - upload da foto da denúncia (testar cedo em aparelho real);
  - PDF em Android e iOS (fazer uma prova rápida antes da M5).

## Estado atual (21/10/2026)

- #6 (autenticação no app) concluída: login com e-mail e senha (React Hook Form + Zod), sessão no `expo-secure-store` (só token e registro do usuário, nunca a senha), renovação da sessão ao abrir o app, logout e troca de tela por sessão (`AuthContext`, sem biblioteca de navegação até a #10). O e-mail é convertido para minúsculas no login, porque o PocketBase o compara com diferenciação de maiúsculas: os formulários que criam usuários (#14) devem fazer o mesmo. Fonte Geom e tema em escala de cinzas de passo 0x20 em `src/theme`; componentes base (Button, Input, Label, TextField, Card, Alert, Badge) já existem, faltam o diálogo de aviso de regra, o seletor e os estados de vazio e erro (#9). O cliente em `src/services/pocketbase` já existe; o mapeamento de erros do servidor e o formulário de exemplo seguem na #8. Testes do contrato de login em `backend/tests/auth.test.js`. O bloqueio de usuário inativo continua na #7.
- Contas de teste na produção (senha só com o Gustavo): `motorista.a@trace.com.br`, `motorista.b@trace.com.br`, `supervisor.a@trace.com.br` e `supervisor.b@trace.com.br`.
- #1 (projeto Expo e estrutura) concluída. #2 (provisionar o PocketBase) verificada: HTTPS, superadmin, persistência após restart e bind mounts de `pb_hooks`/`pb_migrations` ok.
- #3 (coleções do DER) concluída e aplicada na produção; o critério dos decimais segue aberto até existir a validação com Zod no app. As API Rules estavam fechadas até a #5.
- #4 (migrações) concluída (PR #49): o fluxo de gerar, aplicar e reverter está no `backend/README.md` e `backend/tests/migrations.test.js` prova que uma instância vazia reproduz o esquema. Não houve mudança de esquema.
- #5 (API Rules base por perfil) concluída: migração `1792601121_set_base_api_rules.js` e hook `author.pb.js`, com os testes em `backend/tests/api-rules.test.js`. Na produção a migração roda no próximo restart. O `@request.auth.active` de todas as regras fica para a #7.
- #47 (infraestrutura de testes do backend) foi criada fora do plano. Issues e PRs dividem a numeração no GitHub (#44 a #46 foram PRs), então a partir daqui "I-nn = #nn" só vale até a #43.
- As 6 milestones e as 43 issues (#1 a #43) estão criadas no GitHub, cada uma na sua milestone.
- Não usamos labels nas issues. A prioridade e o tamanho ficam só no plano.
- A M1 já passou do prazo (16/10).
