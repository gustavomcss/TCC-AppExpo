# Insumos para os capítulos de desenvolvimento e resultados do TCC

Issue #43 (`[TCC] Insumos para os capítulos de desenvolvimento e resultados`). Este documento reúne o que os capítulos 5 e 6 vão precisar: onde estão as capturas de tela e os diagramas, o balanço do que foi implementado e do que ficou de fora (RF, RNF e RB) e o resumo dos resultados dos testes. Os números são de 10/11/2026 (os dos testes em aparelho, de 5 a 7/11). O balanço do processo, a ligação dos RF alterados ou reduzidos às issues e a auditoria dos critérios de aceite estão em [balanco-final.md](balanco-final.md).

## Como ler

- Os resumos dos RF abaixo foram conferidos com o documento **TRACE – Requisitos** (versão de 13/10/2026), que não fica no repositório. A redação completa de cada RF está nele; as correções que o documento deve receber estão em [balanco-final.md](balanco-final.md), parte 5.
- "Atendido" quer dizer que os critérios de aceite da issue foram marcados, a regra está no backend (RNF03) e a tela foi testada em aparelho. "Atendido com alteração" tem uma mudança de redação ou de comportamento em relação à versão 1.0, por decisão registrada, descrita na coluna de observação. "Reduzido" é o que a versão 1.0 pedia e foi entregue com menos, por decisão do autor (RF17, RF18, RF22 e RF23); nada ficou sem implementação. A comparação é sempre com a versão 1.0 dos Requisitos.
- O detalhe de cada issue (decisões, achados, o que foi e não foi visto no aparelho) está no [historico-de-desenvolvimento.md](../historico-de-desenvolvimento.md) (antes, a seção "Estado atual" do CLAUDE.md).

## 1. Capturas de tela

As capturas ficam em [capturas/](capturas/), uma pasta por sistema (`android/` e `ios/`), com a lista das telas, o nome de cada arquivo e os dados a preparar em [capturas/README.md](capturas/README.md). As capturas foram feitas nos dois aparelhos: iPhone XS (iOS 18.7.11) e Galaxy S25 FE (Android 17). Os dados fictícios que as alimentam estão em [capturas/README.md](capturas/README.md#dados-de-demonstração).

**Situação:** as 28 capturas foram feitas nos dois aparelhos (iOS em `.png`, Android em `.jpg`), com os dados fictícios criados na produção em 9/11 (112 rotas, 13 denúncias, 47 abastecimentos, 25 trocas de óleo e 17 manutenções).

## 2. DER e DCU finais

O DER e o DCU vêm dos documentos de origem, que ficam fora do repositório. Os arquivos exportados estão em [diagramas/](diagramas/), em PNG, com o nome `der-final` e `dcu-final`. A comparação de cada diagrama com o entregue está em [balanco-final.md](balanco-final.md), partes 5.3 (DER) e 5.4 (DCU): o DER não muda de estrutura (só limites de tamanho e o tipo dos campos de arquivo; as notas e a view ficam descritas no balanço, não no diagrama), e o DCU ganhou o ator Superadmin com o caso de uso "Gerenciar supervisor" (17 casos de uso no total).

**Situação:** o autor ajustou os dois diagramas e os exportou em [diagramas/](diagramas/) (`der-final.png` e `dcu-final.png`); o que muda em relação aos originais está nas partes 5.3 e 5.4 de [balanco-final.md](balanco-final.md). O `der-final.png` foi conferido contra o esquema real das migrações em 10/11: entidades, campos, tipos, enums, chaves e relações são iguais. As diferenças conhecidas entre o DER e o banco são só de nomes e de implementação:

| Ponto                    | No banco                                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nomes das coleções       | `users`, `vehicles`, `routes`, `complaints`, `fuels`, `oils`, `repairs`; os campos têm os nomes do DER (`avatar` de `users` virou `photo`).              |
| `routes.date_departure`  | Autodate: é a data de criação da rota. `date_return` é gravada pelo servidor ao finalizar.                                                               |
| `complaints.reviewed`    | Data e hora da revisão, gravada pelo servidor. `route_previous` também é gravada pelo servidor.                                                          |
| `number` obrigatório     | O PocketBase rejeita 0 em número obrigatório, então `vehicles.odometer` e `routes.km_departure` não são `required` no esquema; os hooks exigem o valor. |
| Visão `vehicle_availability` | Não é tabela do DER: é uma view só com os ids dos veículos com rota aberta, para o motorista saber quais estão indisponíveis (#20).                  |
| Índices únicos           | Placa equivalente (`idx_vehicles_plate_canonical`, RB20) e rota aberta por veículo e por motorista (`idx_routes_open_vehicle`, `idx_routes_open_user`).  |

## 3. Atendimento aos requisitos

### 3.1 Requisitos funcionais

| RF   | Resumo                                                      | Issues         | Situação              | Observação                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------- | -------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF01 | Autenticação por e-mail e senha                             | #6             | Atendido              | Sessão persistente em armazenamento seguro; não existe auto-cadastro.                                                                                                                            |
| RF02 | Acesso por perfil                                           | #10            | Atendido              | O motorista não vê nenhum card administrativo; a restrição está também nas API Rules.                                                                                                            |
| RF03 | Gestão de motoristas                                        | #7, #11, #13 a #15 | Atendido          | Cadastro, edição, desativação, redefinição de senha e exclusão. A exclusão é bloqueada com registros vinculados. Usuário desativado perde o acesso mesmo com sessão aberta (RB18).               |
| RF04 | Perfil do usuário                                           | #11, #12       | Atendido              | Foto e senha, só as próprias (RB19).                                                                                                                                                             |
| RF05 | Cadastro de veículos                                        | #16            | Atendido              | Placa única, também contra a equivalente antiga/Mercosul (RB20, regra nova).                                                                                                                     |
| RF06 | Gestão de veículos                                          | #17            | Atendido              | Edição, inativação e exclusão; o km atual nunca é editável (RB09).                                                                                                                               |
| RF07 | Veículos disponíveis para a saída                           | #20            | Atendido              | Os com rota aberta aparecem "Indisponível". Foi preciso uma view no servidor, porque o motorista só lê as próprias rotas.                                                                        |
| RF08 | Registrar saída                                             | #18, #21       | Atendido              | Uma rota aberta por veículo e por motorista, garantida também por índice único (RB01, RB02).                                                                                                     |
| RF09 | Registrar retorno e finalizar a rota                        | #18, #22       | Atendido              | O servidor grava `date_return` e atualiza o km do veículo (RB03).                                                                                                                                |
| RF10 | Encerramento administrativo de rotas                        | #18, #23       | Atendido              | Só o supervisor, sem km (RB15). Acréscimo: recusado com denúncia pendente (RB21).                                                                                                                |
| RF11 | Registro de abastecimento                                   | #19, #24       | Atendido              | O km é só informativo (RB04).                                                                                                                                                                    |
| RF12 | Registro de troca de óleo                                   | #19, #25       | Atendido              |                                                                                                                                                                                                  |
| RF13 | Registro de manutenção em oficina                           | #19, #26       | Atendido              | O app chama de "Manutenção" o que a issue chama de "oficina".                                                                                                                                    |
| RF14 | Denúncia de divergência de km                               | #27, #28       | Atendido              | Uma por rota, com foto do painel (RB11). Acréscimo à RB13: o retorno precisa passar também do km denunciado enquanto a denúncia está pendente.                                                   |
| RF15 | Lista e revisão de denúncias                                | #29            | Atendido              | Aprovar e reprovar com confirmação; o supervisor pode revisar a própria (RB08). "Aprovar" fica inativo quando a RB14 recusaria.                                                                  |
| RF16 | Correção de km ao aprovar a denúncia                        | #30            | Atendido              | Uma transação no servidor corrige a saída, o retorno da rota anterior e o km do veículo, ou nada (RB06, RB07, RB14).                                                                             |
| RF17 | Histórico por módulo                                        | #33, #35       | Reduzido             | Cinco módulos em chips, com busca, tipo de veículo e período. Não há a visão "Todos" (cada módulo é uma coleção) nem período com datas livres, só atalhos.                                        |
| RF18 | Card da rota finalizada                                     | #34            | Reduzido             | Sem a faixa colorida da issue: decisão de manter o app em escala de cinzas, com cor só em avisos e botões destrutivos.                                                                           |
| RF19 | Indicador de denúncia no card da rota                       | #34            | Atendido com alteração | O rodapé "Denúncia pendente, aprovada ou reprovada" tem o ícone cinza em qualquer situação, decisão provisória do autor sobre a cor.                                                           |
| RF20 | Navegação em três abas                                      | #10            | Atendido              | Histórico, Serviços e Usuário para os dois perfis; o app abre em Serviços.                                                                                                                       |
| RF21 | Edição dos registros próprios de serviço                    | #31, #32       | Atendido              | Só o autor, e só valor, litros, tipo e descrição; veículo, km, autor e data ficam fixos (RB17).                                                                                                  |
| RF22 | Relatório financeiro em PDF                                 | #36, #37       | Reduzido             | O requisito original pedia filtro de veículo por placa, modelo e tipo; por decisão do autor (7/11) o filtro é só por tipo e o requisito foi reescrito. Além do pedido: dois gráficos (custo por veículo e por mês). A soma é feita no app, decisão do autor. |
| RF23 | Relatórios adicionais em PDF (opcional)                     | #38            | Reduzido (opcional)   | Feitos 2 dos 3 candidatos: km rodados por veículo e denúncias por situação, veículo e motorista. Ficaram fora a última troca de óleo por veículo e a "utilização" (dias em rota).               |

### 3.2 Requisitos não funcionais

| RNF   | Resumo                                       | Issues        | Situação              | Observação                                                                                                                                                                                                  |
| ----- | -------------------------------------------- | ------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF01 | Android e iOS com uma base de código         | #1, #40, #41  | Atendido com alteração | React Native com Expo, sem código por plataforma além de quatro arquivos com ramo por `Platform` (comportamento de sistema sem equivalente). O APK de Android sai do EAS Build. **O iOS roda pelo Expo Go (SDK 58); não há instalável**, porque exige o Apple Developer Program (US$ 99 por ano). |
| RNF02 | Backend autogerenciado em HTTPS              | #2, #41       | Atendido              | PocketBase v0.40.5 em Docker (Coolify), com HTTPS pelo Cloudflare Tunnel, em `pb.wizecode.com.br`.                                                                                                         |
| RNF03 | Regras de acesso e integridade no servidor   | #5 e as de backend | Atendido         | API Rules mais 8 hooks JS. Provado por 545 testes de API, sem passar pelo app.                                                                                                                             |
| RNF04 | Sem credenciais no código nem senha no app   | #6, #41       | Atendido              | A URL vem de variável de ambiente; o app guarda só o token. Conferido por busca no código e no `.gitignore` antes do build.                                                                                |
| RNF05 | Data de criação definida pelo servidor       | #3            | Atendido              | `created` é autodate; um `created` enviado no corpo é ignorado (testado nas três coleções de serviço).                                                                                                      |
| RNF06 | Validação no app e no servidor               | #8            | Atendido              | React Hook Form + Zod no app, o servidor como garantia; o `code` do erro vira mensagem em português por campo.                                                                                              |
| RNF07 | Esquema versionado e documentação técnica    | #4, #42       | Atendido com alteração | 11 migrações commitadas e testadas (uma instância vazia reproduz o esquema); os hooks e os índices também constam como estrutura versionada. O README foi escrito e os comandos do backend foram conferidos; **em 7/11 o cientista da computação Pedro Kourly, externo ao projeto, seguiu o README do começo ao fim, com o resultado esperado** (#42). |
| RNF08 | Interface simples                            | #9, #40       | Atendido              | Telas de poucos campos: o maior formulário (abastecimento) tem 5; a tabela está na parte 8 de [testes-android-ios.md](../testes-android-ios.md). Fonte no tamanho máximo corta textos longos com reticências (limitação). |

### 3.3 Regras de negócio

Cada regra tem cenário no [roteiro de testes](../roteiro-de-testes.md) (C01 a C21) com a prova na API e o resultado no app. As RB20 e RB21 nasceram durante o desenvolvimento: não existiam no documento de Requisitos de 13/10 e **constam da versão 2.0** ([requisitos-final.md](../requisitos-final.md)); a RB13 ganhou um acréscimo (piso do retorno com denúncia pendente), decidido na #28.

| RB   | Regra (resumo)                                                       | Issues         | API | App | Observação                                                                                                           |
| ---- | -------------------------------------------------------------------- | -------------- | --- | --- | -------------------------------------------------------------------------------------------------------------------- |
| RB01 | Uma rota aberta por veículo                                          | #18, #20, #21  | OK  | OK  | Índice único parcial no banco: vale com requisições simultâneas.                                                     |
| RB02 | Uma rota aberta por motorista                                        | #18, #21       | OK  | OK  | Idem.                                                                                                                |
| RB03 | Km do veículo = retorno da última rota finalizada                    | #18, #22       | OK  | OK  | Atualizado pelo servidor, na mesma transação da finalização.                                                         |
| RB04 | Km de abastecimento, óleo e oficina é só informativo                 | #19, #24 a #26 | OK  | OK  |                                                                                                                      |
| RB05 | Denúncia pendente não impede finalizar a rota                        | #28            | OK  | OK  |                                                                                                                      |
| RB06 | Aprovar corrige saída e retorno da rota anterior                     | #30            | OK  | OK  |                                                                                                                      |
| RB07 | Aprovar atualiza o km do veículo; reprovar não altera km             | #30            | OK  | OK  | Executado no app em 4/11 (C07).                                                                                      |
| RB08 | O supervisor pode revisar a própria denúncia                         | #27, #29       | OK  | OK  |                                                                                                                      |
| RB09 | O km do veículo nunca é editável pelo app                            | #17            | OK  | OK  | O servidor recusa com 404.                                                                                           |
| RB10 | Histórico só com rotas finalizadas                                   | #23, #33       | OK  | OK  |                                                                                                                      |
| RB11 | Uma denúncia por rota, com a rota aberta e km diferente              | #27, #28       | OK  | OK  |                                                                                                                      |
| RB12 | Veículo com registros é inativado, não excluído                      | #17, #19, #20  | OK  | OK  | Inativo sai das seleções e continua no histórico e nos relatórios.                                                   |
| RB13 | Retorno maior que a saída                                            | #18, #22, #28  | OK  | OK  | Acréscimo da #28: com denúncia pendente, também maior que o km denunciado.                                           |
| RB14 | Correção que gera inconsistência é recusada por inteiro              | #30            | OK  | OK  | O app antecipa a recusa pelo km de saída da rota anterior. A recusa por denúncia pendente da rota anterior aparece depois do toque (roteiro em [balanco-final.md](balanco-final.md), parte 3). |
| RB15 | Encerramento administrativo só do supervisor, sem km                 | #18, #23       | OK  | OK  |                                                                                                                      |
| RB16 | Decimais 8,2, não negativos, nos dois lados                          | #3, #8, #24    | OK  | OK  |                                                                                                                      |
| RB17 | Nada é excluído pelo app; só o autor edita campos não sensíveis      | #18, #31, #32  | OK  | OK  | O app exclui apenas motorista e veículo sem registros vinculados (RB12, RB18).                                       |
| RB18 | Usuário inativo não acessa; desativar e excluir têm bloqueios        | #7, #14, #15   | OK  | OK  | Token antigo de usuário desativado perde o acesso.                                                                   |
| RB19 | Quem altera o quê nos usuários                                       | #11 a #14      | OK  | OK  | O app só cria usuários com cargo `motorista`.                                                                        |
| RB20 | Placa antiga e Mercosul equivalente são a mesma placa                | #8, #16, #17   | OK  | OK  | Nova na versão 2.0 do documento de Requisitos.                                                                          |
| RB21 | Rota com denúncia pendente não é encerrada                           | #28, #30       | OK  | OK  | Nova na versão 2.0 do documento de Requisitos. Executado no app em 4/11 (C21).                                               |

### 3.4 O que ficou de fora e limitações

| Item                                                                                                                                                         | Origem   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Instalável para iOS: o iOS é entregue pelo Expo Go. Exige o Apple Developer Program.                                                                         | #41      |
| Relatórios: faltam "utilização" do veículo (dias em rota), última troca de óleo por veículo, custo por km e consumo (km/L). Os de km e de denúncias não têm gráficos. | #37, #38 |
| Histórico sem a visão "Todos" e sem período com datas livres (só atalhos); a busca por modelo e nome no servidor não ignora acento.                          | #33      |
| Listas de Motoristas e de Veículos leem tudo de uma vez e filtram no app, e os relatórios leem o período todo e somam no app. Servem ao porte de uma pequena empresa. (Encerramento de rotas e Revisão de denúncias paginam de 10 em 10 no servidor desde 10/11.) | #36, #39 |
| Máscara numérica de km e valores reescreve a cada tecla: nenhuma biblioteca nativa de máscara roda no Expo Go.                                               | #39      |
| Com a fonte do sistema no máximo, placeholders e títulos longos são abreviados com reticências. O app segue a fonte do sistema.                              | #40      |
| Só dois aparelhos testados (iPhone XS e Galaxy S25 FE, no Expo Go); sem telas mais estreitas, outras versões de sistema nem iPad. O app é só claro e em retrato. | #40      |
| Não há auto-cadastro nem criação de supervisor pelo app: supervisores e mudança de cargo são do superadmin, direto no PocketBase.                            | RB19     |
| Os dados de demonstração (contas, veículos, rotas e registros) foram criados na produção em 9/11 com `backend/seed`, porque não há auto-cadastro e só existe uma rota aberta por motorista e veículo. São fictícios (o script grava datas retroativas por um hook temporário) e as figuras devem ser legendadas como "dados de demonstração". | #41, #43 |

## 4. Resultados dos testes

Os detalhes estão em [roteiro-de-testes.md](../roteiro-de-testes.md) (regras de negócio e fluxo ponta a ponta, #39) e em [testes-android-ios.md](../testes-android-ios.md) (aparelhos e usabilidade, #40).

### 4.1 Testes de API do backend

`npm test` em `backend/`, rodado em 10/11/2026 contra instâncias descartáveis do PocketBase v0.40.5 (nunca a produção): **545 testes, 545 passaram, 0 falharam** (120 suítes, cerca de 21 s). Eram 510 em 4/11; 1 teste é da busca por pedaço da placa (#40), 19 são das consultas paginadas de Encerramento e Revisão e 9 são dos limites das fotos (todos de 10/11).

| Arquivo                             | Testes | O que prova                                                                           |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `api-rules.test.js`                 | 44     | API Rules base por perfil: quem lista, vê, cria, edita e exclui cada coleção          |
| `auth.test.js`                      | 6      | Contrato de login                                                                     |
| `collections.test.js`               | 19     | Coleções, campos e decimais 8,2                                                       |
| `migrations.test.js`                | 4      | Uma instância vazia reproduz o esquema                                                |
| `inactive-user.test.js`             | 14     | Usuário inativo não entra nem usa sessão aberta                                       |
| `user-rules.test.js`                | 62     | Quem edita quem, criação, desativação e exclusão de usuários                          |
| `vehicle-form.test.js`              | 48     | Cadastro de veículo, placa e placa equivalente                                        |
| `vehicle-management.test.js`        | 25     | Edição, inativação e exclusão de veículo                                              |
| `vehicle-availability.test.js`      | 9      | View de veículos com rota aberta                                                      |
| `route-rules.test.js`               | 40     | Saída (km de saída igual ao km atual), retorno, encerramento, km do veículo, uma rota aberta por veículo e motorista |
| `service-records.test.js`           | 57     | Criação de abastecimento, óleo e manutenção                                           |
| `service-record-edit.test.js`       | 56     | Edição só do autor e campos fixos                                                     |
| `complaint-rules.test.js`           | 47     | Criação e revisão de denúncia; piso do retorno                                        |
| `complaint-correction.test.js`      | 26     | Correção de km ao aprovar, RB14 e RB21                                                |
| `history-queries.test.js`           | 29     | Consultas do Histórico, filtros, páginas e permissões                                 |
| `report-queries.test.js`            | 12     | Consultas do relatório financeiro                                                     |
| `extra-report-queries.test.js`      | 19     | Consultas dos relatórios de km e de denúncias                                         |
| `admin-list-queries.test.js`        | 19     | Consultas paginadas de Encerramento de rotas e Revisão de denúncias                  |
| `photo-limits.test.js`              | 9      | Fotos: 10 MB na denúncia e 5 MB no perfil; só JPEG, PNG e WebP                       |
| **Total**                           | **545** |                                                                                      |

### 4.2 Regras de negócio e fluxo ponta a ponta (#39)

Os 21 cenários passaram na API e no app. O resultado do app vem dos testes manuais que o autor fez em produção a cada issue (`npm test`, requisições diretas com `curl` e verificação no app), e o C07 e o C21 foram executados no app em 4/11 e o C14, em 7/11.

| Grupo                          | Cenários     | API (10/11, 545 testes) | App                        |
| ------------------------------ | ------------ | ---------------------- | -------------------------- |
| Rotas e km do veículo          | C01 a C05, C13, C15 | OK              | OK                         |
| Denúncias e correção de km     | C06 a C08, C11, C14, C21 | OK         | OK (C14 visto no app em 7/11) |
| Veículos e registros           | C09, C10, C12, C16, C17, C20 | OK     | OK                         |
| Usuários                       | C18, C19     | OK                     | OK                         |
| Fluxo ponta a ponta            | E1 a E9      | n/a                    | OK (E9 no iPhone, os PDFs também no Android) |

Nenhuma falha de regra de negócio encontrada; nenhuma issue de bug aberta. Os defeitos de interface achados estão na parte 4.3.

### 4.3 Android e iOS (#40)

Passada de 5 a 7/11/2026, conduzida pelo autor, nos mesmos passos e ao mesmo tempo, no iPhone XS (iOS 18.7.11) e no Galaxy S25 FE (Android), os dois no Expo Go (SDK 58).

| Fases                                                                  | Testes     | iPhone XS          | S25 FE             |
| ---------------------------------------------------------------------- | ---------- | ------------------ | ------------------ |
| 1 e 2: login, abas, Serviços, saída, denúncia, rota para encerrar      | T01 a T06  | OK                 | OK                 |
| 3: supervisor (encerramento, revisão, motoristas, veículos)            | T07 a T10  | OK                 | OK                 |
| 4: retorno, registros, Histórico, edição, Usuário                      | T11 a T15  | OK                 | OK                 |
| 5: relatórios e PDF (financeiro, km e denúncias)                       | T16        | OK                 | OK                 |
| 6: botão de voltar do Android                                          | T17        | n/a                | OK                 |
| 6: fonte do sistema no tamanho máximo                                  | T18        | OK, com limitações | OK, com limitações |

Problemas achados na passada (parte 9 do roteiro): 9 corrigidos e conferidos no aparelho (teclado sobre o botão do login, aviso de busca sem resultado, indicador de denúncia no card de encerramento, desempate de motoristas pelo e-mail, busca por pedaço da placa, erro de data nos relatórios, aba inicial e botão de voltar, texto cortado nos badges com fonte grande, texto de ajuda do login) e 1 registrado como limitação (reticências com fonte grande); a barra de ação que piscava no Android e a barra de abas na busca do Histórico foram reverificadas pelo autor em 10/11 e não aparecem mais. Nenhum problema de impacto alto.

Também foram corrigidos na etapa de testes da #39 (4/11): o teclado cobrindo campos de baixo, a letra duplicada no campo Modelo e os ícones brancos da barra de status no Android.

## 5. Situação dos critérios da issue

- [x] As telas principais foram capturadas em Android e iOS (parte 1): 28 capturas em cada sistema.
- [x] O DER e o DCU finais estão exportados em alta resolução (parte 2): `docs/tcc/diagramas/der-final.png` e `dcu-final.png`.
- [x] Há uma tabela do que foi implementado e do que ficou de fora, por RF, RNF e RB, com as limitações (parte 3). A redação dos RF deve ser conferida com o documento de Requisitos.
- [x] Os resultados da I-39 estão resumidos em uma tabela (parte 4).
