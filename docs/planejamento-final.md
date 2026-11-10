# TRACE – Planejamento de Issues (versão final, conforme executado)

| Campo      | Valor                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------- |
| Produto    | TRACE, aplicativo móvel de gestão operacional de frotas                                       |
| Documento  | Planejamento de Issues, versão final, com o que foi executado                                 |
| Versão     | 2.0                                                                                           |
| Data       | 10 de novembro de 2026                                                                        |
| Substitui  | TRACE – Planejamento de Issues, versão 1.0 de 13 de outubro de 2026                           |
| Autor      | Gustavo Corrêa                                                                                |
| Repositório | `gustavomcss/TCC-AppExpo` (GitHub)                                                           |
| Situação   | Versão final, revisada pelo autor                                                             |

## Sumário

1. Convenções
2. Visão geral das milestones
3. Issues por milestone
4. Matriz de rastreabilidade
5. Riscos: o que aconteceu
6. Decisões
7. Ordem de corte
8. Apêndice A: alterações em relação à versão 1.0

## 1. Convenções

O plano tem 6 milestones e 43 issues (I-01 a I-43). Uma 44ª issue, a **#47** (infraestrutura de testes do backend), foi criada fora do plano. O GitHub numera issues e pull requests na mesma sequência (as #44 a #46 foram pull requests), então a coincidência entre o número da issue e o I-nn vale **até a #43**.

- **Título:** `[RF] Resumo`, por exemplo `[RF11] Registro de abastecimento`. As issues de infraestrutura usam o RNF; as de teste e de TCC usam `[Testes]` e `[TCC]`.
- **Corpo da issue:** um parágrafo de descrição, depois **Tarefas** (lista) e **Critérios de aceite** (lista de marcação). Os RF, RNF e RB que a issue trata aparecem no título e no texto.
- **Labels:** não são usadas. Prioridade e tamanho ficam neste planejamento.
- **Tamanho:** P até 3 h, M de 3 a 6 h, G acima de 6 h. São estimativas; as horas reais não foram medidas.
- **Definição de pronto**, válida para toda issue: todos os critérios de aceite marcados e as regras de negócio citadas verificadas no aplicativo e no backend; sem erros de lint e de tipos; testado em emulador, dispositivo ou Expo Go; migrações do PocketBase commitadas quando há mudança de esquema ou de regras (RNF07); um branch por issue, pull request com `Closes #n` e mesclagem na `main`.
- **Testes de backend:** cada regra é provada também por requisições diretas à API, sem passar pelo aplicativo, de forma automatizada em `backend/tests` (530 testes em 10/11/2026).

## 2. Visão geral das milestones

O plano previa 19 dias (13 a 31/10, contando os dois extremos). O repositório registra que o desenvolvimento **começou em 20/10**, sete dias depois do início planejado: o primeiro commit de trabalho e as primeiras issues fechadas são de 20/10, à noite. Por isso todos os marcos fecharam depois da data planejada. As milestones 1 a 5 tiveram durações próximas do plano; a 6 levou mais (7 dias contra 1), porque reuniu as capturas, os diagramas e a documentação final. Ao todo foram 22 dias corridos, de 20/10 a 10/11, contra 19 planejados.

| Milestone                          | Issues         | Esforço estimado | Planejado   | Realizado (primeira a última issue fechada) | Duração planejada / realizada |
| ---------------------------------- | -------------- | ---------------- | ----------- | ------------------------------------------- | ----------------------------- |
| M1 Fundação e Backend              | I-01 a I-09 (9)  | 40 h           | 13 a 16/10  | 20 a 21/10                                  | 4 dias / 2 dias               |
| M2 Usuários, Veículos e Navegação  | I-10 a I-17 (8)  | 34 h           | 17 a 20/10  | 22 a 25/10                                  | 4 dias / 4 dias               |
| M3 Rotas e Registros               | I-18 a I-26 (9)  | 32 h           | 21 a 24/10  | 26 a 27/10                                  | 4 dias / 2 dias               |
| M4 Denúncias e Edição de Registros | I-27 a I-32 (6)  | 34 h           | 25 a 28/10  | 28/10 a 1º/11                               | 4 dias / 5 dias               |
| M5 Histórico e Relatórios          | I-33 a I-38 (6)  | 38 h           | 29 a 30/10  | 2 a 4/11                                    | 2 dias / 3 dias               |
| M6 Fechamento e Documentação       | I-39 a I-43 (5)  | 24 h           | 31/10       | 4 a 10/11                                   | 1 dia / 7 dias                |

Os dias de calendário são os horários de fechamento das issues no GitHub (fuso de Brasília). A #47 (fora do plano) foi fechada em 21/10, na M1. O fechamento da M6, e do projeto, foi em 10/11.

## 3. Issues por milestone

A coluna "Fechada" traz a data em que a issue foi fechada. "Tam." é o tamanho estimado no plano. A coluna "Como foi executada" registra só o que difere do plano ou o acrescenta; as demais seguiram o plano.

### M1 Fundação e Backend (planejado 13 a 16/10; realizado 20 a 21/10)

| Issue | Título                                                          | Requisitos                                        | Tam. | Fechada | Como foi executada                                                                                                                                |
| ----- | --------------------------------------------------------------- | ------------------------------------------------- | ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-01  | [RNF01] Configurar o projeto Expo e a estrutura do repositório  | RNF01, RNF04, RNF07                               | M    | 20/10   | Expo SDK 57; subiu para o SDK 58 em 23/10 (o Expo Go da App Store passou a abrir só o 58).                                                        |
| I-02  | [RNF02] Provisionar o PocketBase do TRACE                       | RNF02, RNF04                                      | P    | 20/10   | Conforme o plano.                                                                                                                                 |
| I-03  | [RNF05] Criar as coleções do PocketBase conforme o DER          | RB03, RB12, RB16, RB18; RNF05, RNF07              | G    | 20/10   | Decimais validados no servidor aqui e no aplicativo nas I-24 a I-26 (critério dividido). `odometer` e `km_departure` não são obrigatórios no esquema.  |
| I-04  | [RNF07] Versionar o esquema do PocketBase com migrações         | RNF07                                             | P    | 21/10   | Conforme o plano.                                                                                                                                 |
| I-05  | [RNF03] Definir as API Rules base por perfil                    | RF17; RB09, RB17; RNF03                           | G    | 21/10   | Conforme o plano.                                                                                                                                 |
| I-06  | [RF01] Autenticação por e-mail e senha no app                   | RF01; RB18, RB19; RNF04                           | P    | 21/10   | Conforme o plano.                                                                                                                                 |
| I-07  | [RF03] Bloquear usuário desativado no backend e no app          | RF03; RB18; RNF03                                 | M    | 21/10   | O aplicativo também confere a sessão ao voltar ao primeiro plano.                                                                                 |
| I-08  | [RNF06] Cliente PocketBase e validação em duas camadas          | RNF03, RNF04, RNF06                               | M    | 21/10   | Incluiu a **RB20** (placa equivalente: hook e índice único), não prevista.                                                                        |
| I-09  | [RNF08] Componentes de UI base, tema e avisos                   | RNF03, RNF08                                      | M    | 21/10   | Conforme o plano.                                                                                                                                 |
| #47   | [Testes] Infraestrutura de testes do backend                    | RNF03 (apoio)                                     | —    | 21/10   | **Fora do plano.** Testes de API com `node --test` contra um PocketBase descartável, base da prova das regras.                                    |

### M2 Usuários, Veículos e Navegação (planejado 17 a 20/10; realizado 22 a 25/10)

| Issue | Título                                                                    | Requisitos                       | Tam. | Fechada | Como foi executada                                                                                  |
| ----- | ------------------------------------------------------------------------- | -------------------------------- | ---- | ------- | --------------------------------------------------------------------------------------------------- |
| I-10  | [RF02, RF20] Navegação por abas e acesso por perfil                       | RF02, RF20; RNF03, RNF08         | M    | 22/10   | Conforme o plano.                                                                                   |
| I-11  | [RF03, RF04] Regras de edição de usuários no PocketBase                   | RF03, RF04; RB18, RB19; RNF03    | M    | 22/10   | Teste completo da desativação com rota aberta feito pelo aplicativo em 7/11.                        |
| I-12  | [RF04] Tela de perfil do usuário                                          | RF04; RB19; RNF06                | M    | 22/10   | Conforme o plano.                                                                                   |
| I-13  | [RF03] Gestão de motoristas: listagem e cadastro                          | RF01, RF03; RB19; RNF06          | M    | 23/10   | Conforme o plano.                                                                                   |
| I-14  | [RF03] Gestão de motoristas: edição, desativação e redefinição de senha   | RF03, RF10; RB18, RB19           | M    | 23/10   | Conforme o plano.                                                                                   |
| I-15  | [RF03] Exclusão de motoristas sem registros vinculados                    | RF03; RB18, RB19                 | P    | 25/10   | Conforme o plano.                                                                                   |
| I-16  | [RF05] Cadastro de veículos                                               | RF05; RB03, RB09, RB16           | M    | 25/10   | Acrescentou a RB20 à placa. Busca e filtros viraram o componente `ListFilters`.                     |
| I-17  | [RF06] Gestão de veículos: edição, exclusão e inativação                  | RF06; RB03, RB09, RB12           | M    | 25/10   | Conversão para a placa equivalente é editar a placa (RB20). Inativar com rota aberta é recusado.     |

### M3 Rotas e Registros (planejado 21 a 24/10; realizado 26 a 27/10)

| Issue | Título                                                                    | Requisitos                                                          | Tam. | Fechada | Como foi executada                                                                                                                                  |
| ----- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-18  | [RF08, RF09, RF10] Regras de integridade das rotas no PocketBase          | RF08, RF09, RF10; RB01, RB02, RB03, RB05, RB09, RB13, RB15, RB16, RB17; RNF03 | G | 26/10 | Dois índices únicos parciais garantem a RB01 e a RB02 no banco. O hook de finalização usa transação.                                                |
| I-19  | [RF11, RF12, RF13] Regras de criação dos registros de serviço no PocketBase | RF11, RF12, RF13; RB04, RB09, RB12, RB17; RNF03, RNF05            | M    | 26/10   | Conforme o plano.                                                                                                                                   |
| I-20  | [RF07] Registrar saída: listagem de veículos disponíveis                  | RF07; RB01, RB12                                                    | P    | 26/10   | Migração não prevista: a **view** `vehicle_availability` (o motorista só lê as próprias rotas). O seletor com badge "Indisponível" no lugar de cards. |
| I-21  | [RF08] Registrar saída: formulário e criação da rota                      | RF08; RB02, RB03, RB16; RNF06                                       | P    | 27/10   | Diálogo de confirmação antes de enviar (não previsto).                                                                                              |
| I-22  | [RF09] Registrar retorno e finalizar a rota                               | RF09; RB03, RB05, RB13, RB16                                        | M    | 27/10   | Diálogo de confirmação. O piso do retorno com denúncia pendente veio depois, na I-28.                                                               |
| I-23  | [RF10] Encerramento administrativo de rotas                               | RF10, RF20; RB01, RB02, RB03, RB10, RB15                            | M    | 27/10   | Contadores nos cards de Serviços. A recusa com denúncia pendente (RB21) entrou na I-30. Em 10/11, a lista passou a carregar de 10 em 10.            |
| I-24  | [RF11] Registro de abastecimento                                          | RF11; RB04, RB12, RB16; RNF05                                       | P    | 27/10   | Máscara decimal que vale para todo campo de km e de valor.                                                                                          |
| I-25  | [RF12] Registro de troca de óleo                                          | RF12; RB04, RB12, RB16; RNF05                                       | P    | 27/10   | Conforme o plano.                                                                                                                                   |
| I-26  | [RF13] Registro de manutenção em oficina                                  | RF13; RB04, RB12, RB16; RNF05                                       | P    | 27/10   | O aplicativo chama o serviço de "Manutenção".                                                                                                       |

### M4 Denúncias e Edição de Registros (planejado 25 a 28/10; realizado 28/10 a 1º/11)

| Issue | Título                                                                    | Requisitos                                                | Tam. | Fechada | Como foi executada                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-27  | [RF14] Regras de integridade das denúncias no PocketBase                  | RF14; RB05, RB08, RB11, RB17; RNF03, RNF05                | M    | 28/10   | O servidor grava `route_previous` e `reviewed`; o pedido não os envia.                                                                                                        |
| I-28  | [RF14] Registrar denúncia de divergência de km                            | RF14; RB05, RB11, RB16; RNF06                             | G    | 28/10   | Foto de até 10 MB e confirmação antes de enviar. **Piso do retorno com denúncia pendente (acréscimo à RB13)** e decisão da **RB21**.                                          |
| I-29  | [RF15] Lista e revisão de denúncias pelo supervisor                       | RF15, RF20; RB06, RB07, RB08                              | M    | 30/10   | "Aprovar" fica inativo com explicação quando a RB14 recusaria. A lista inclui as revisadas. Em 10/11, passou a carregar de 10 em 10.                                         |
| I-30  | [RF16] Aplicar as correções de km ao aprovar uma denúncia                 | RF16; RB03, RB06, RB07, RB09, RB14, RB16                  | G    | 30/10   | Transação única, 26 testes. RB14 em um código só. **RB21** (encerramento recusado com denúncia pendente).                                                                    |
| I-31  | [RF21] Regras de edição dos registros no PocketBase                       | RF21; RB04, RB17; RNF03                                   | M    | 30/10   | O `created` enviado é **ignorado** (200, data intacta), em vez de recusado.                                                                                                  |
| I-32  | [RF21] Edição de registros próprios de abastecimento, óleo e manutenção   | RF21; RB04, RB16, RB17                                    | M    | 1º/11   | Tela própria, com os dados fixos em um card de leitura.                                                                                                                      |

### M5 Histórico e Relatórios (planejado 29 a 30/10; realizado 2 a 4/11)

| Issue | Título                                                                          | Requisitos                              | Tam. | Fechada | Como foi executada                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------- | --------------------------------------- | ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-33  | [RF17] Histórico por módulo: estrutura, filtros e permissões                    | RF17, RF20; RB10; RNF08                 | G    | 2/11    | Carga de 10 em 10 no servidor. Sem visão "Todos". Período por atalhos. Tipo de veículo e período em dois seletores.                                                       |
| I-34  | [RF18, RF19] Histórico de rotas: card da rota finalizada e indicador de denúncia | RF18, RF19; RB06, RB10                  | M    | 2/11    | **Sem a borda verde** (decisão do autor: app monocromático). Indicador com ícone e texto.                                                                                  |
| I-35  | [RF17] Histórico de denúncias, abastecimentos, trocas de óleo e manutenções     | RF15, RF17, RF21; RB17                  | M    | 3/11    | Peças comuns dos cards em `HistoryCardParts`. O lápis de edição só nos registros do próprio usuário.                                                                      |
| I-36  | [RF22] Relatório financeiro: consulta, agrupamento e filtros                    | RF17, RF22; RB12, RB16                  | G    | 3/11    | Soma **no aplicativo** (decisão aberta no plano). Filtros por tipo de veículo e de serviço; sem busca por placa e modelo (decisão do autor, 7/11).                         |
| I-37  | [RF22] Relatório financeiro: geração e exportação em PDF                        | RF22; RNF08                             | G    | 3/11    | Acrescentou dois gráficos, fonte embutida e numeração "Página N de M".                                                                                                    |
| I-38  | [RF23] Relatórios adicionais em PDF (opcional)                                  | RF17, RF22, RF23                        | M    | 4/11    | Dois dos três relatórios candidatos (km rodados; denúncias), como o plano permitia. Não foram feitos a utilização e a última troca de óleo. RF23 atendido (opcional).                                                             |

### M6 Fechamento e Documentação (planejado 31/10; realizado 4 a 10/11)

| Issue | Título                                                               | Requisitos                       | Tam. | Fechada       | Como foi executada                                                                                                           |
| ----- | -------------------------------------------------------------------- | -------------------------------- | ---- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| I-39  | [Testes] Testes das regras de negócio e dos fluxos críticos          | RB01 a RB21; RNF03, RNF05, RNF06 | G    | 4/11          | 21 cenários (RB01 a RB21), fluxo ponta a ponta (E1 a E9) e 510 testes de API na época (530 em 10/11). Nenhuma falha encontrada. |
| I-40  | [RNF01, RNF08] Testes em Android e iOS e ajustes de usabilidade      | RF20; RNF01, RNF08               | M    | 7/11          | iPhone XS e Galaxy S25 FE (Android 17), 18 testes, todos aprovados. Teclado, capitalização e barra de status corrigidos.      |
| I-41  | [RNF01, RNF02] Build de distribuição e configuração de produção     | RNF01, RNF02, RNF04              | M    | 7/11          | APK pelo EAS Build. iOS pelo Expo Go (decisão registrada).                                                                   |
| I-42  | [RNF07] Documentação técnica e README                                | RNF02, RNF03, RNF07              | M    | 7/11          | README, `backend/README.md` e resumo de regras e hooks. Uma pessoa nova seguiu o README sem problemas.                       |
| I-43  | [TCC] Insumos para os capítulos de desenvolvimento e resultados      | RNF01, RNF08                     | P    | 10/11         | Balanço, requisitos finais, este planejamento, script de dados de demonstração, 56 capturas (iOS e Android) e DER e DCU finais.  |

## 4. Matriz de rastreabilidade

Os **52 requisitos** (23 RF, 8 RNF e 21 RB; eram 50 na versão 1.0, antes da RB20 e da RB21) têm ao menos uma issue que os resolve. "Resolvido por" lista as issues cujo objetivo principal é o requisito; "Considerado em" lista as que o respeitam sem serem a responsável por ele. Os acréscimos em relação à versão 1.0 estão em **negrito**.

### Requisitos funcionais

| Requisito | Resolvido por     | Considerado em                       |
| --------- | ----------------- | ------------------------------------ |
| RF01      | I-06              | I-13                                 |
| RF02      | I-10              | —                                    |
| RF03      | I-13, I-14, I-15  | I-07, I-11                           |
| RF04      | I-12              | I-11                                 |
| RF05      | I-16              | —                                    |
| RF06      | I-17              | —                                    |
| RF07      | I-20              | —                                    |
| RF08      | I-21              | I-18                                 |
| RF09      | I-22              | I-18                                 |
| RF10      | I-23              | I-14, I-18, **I-30**                 |
| RF11      | I-24              | I-19                                 |
| RF12      | I-25              | I-19                                 |
| RF13      | I-26              | I-19                                 |
| RF14      | I-28              | I-27                                 |
| RF15      | I-29              | I-35                                 |
| RF16      | I-30              | —                                    |
| RF17      | I-33, I-35        | I-05, I-36, I-38                     |
| RF18      | I-34              | —                                    |
| RF19      | I-34              | I-35                                 |
| RF20      | I-10              | I-23, I-29, I-33, I-40               |
| RF21      | I-32              | I-31, I-35                           |
| RF22      | I-36, I-37        | I-38                                 |
| RF23      | I-38              | —                                    |

### Requisitos não funcionais

| Requisito | Resolvido por     | Considerado em                                                                         |
| --------- | ----------------- | -------------------------------------------------------------------------------------- |
| RNF01     | I-01, I-40, I-41  | I-43                                                                                   |
| RNF02     | I-02, I-41        | I-42                                                                                   |
| RNF03     | I-05              | I-07, I-08, I-09, I-10, I-11, I-18, I-19, I-27, I-31, I-39, I-42, **#47**              |
| RNF04     | I-06              | I-01, I-02, I-08, I-41                                                                 |
| RNF05     | I-03, I-19        | I-24, I-25, I-26, I-27, I-39                                                           |
| RNF06     | I-08              | I-12, I-13, I-21, I-28, I-39                                                           |
| RNF07     | I-04, I-42        | I-01, I-03, **#47**                                                                    |
| RNF08     | I-09, I-40        | I-10, I-33, I-37, I-43                                                                 |

### Regras de negócio

| Requisito | Resolvido por     | Considerado em                                                          |
| --------- | ----------------- | ----------------------------------------------------------------------- |
| RB01      | I-18              | I-20, I-23                                                              |
| RB02      | I-18              | I-21, I-23                                                              |
| RB03      | I-18              | I-03, I-16, I-17, I-21, I-22, I-23, I-30                                |
| RB04      | I-19              | I-24, I-25, I-26, I-31, I-32                                            |
| RB05      | I-22              | I-18, I-27, I-28, **I-30**                                              |
| RB06      | I-30              | I-29, I-34                                                              |
| RB07      | I-30              | I-29                                                                    |
| RB08      | I-29              | I-27                                                                    |
| RB09      | I-17              | I-05, I-16, I-18, I-19, I-30                                            |
| RB10      | I-33              | I-23, I-34                                                              |
| RB11      | I-27              | I-28                                                                    |
| RB12      | I-17              | I-03, I-19, I-20, I-24, I-25, I-26, I-36                                |
| RB13      | I-18              | I-22, **I-28**                                                          |
| RB14      | I-30              | **I-29**                                                                |
| RB15      | I-18              | I-23                                                                    |
| RB16      | I-03              | I-16, I-18, I-21, I-22, I-24, I-25, I-26, I-28, I-30, I-32, I-36        |
| RB17      | I-31              | I-05, I-18, I-19, I-27, I-32, I-35                                      |
| RB18      | I-07, I-14, I-15  | I-03, I-06, I-11                                                        |
| RB19      | I-11              | I-06, I-12, I-13, I-14, I-15                                            |
| **RB20**  | **I-08**          | **I-16, I-17**                                                          |
| **RB21**  | **I-30**          | **I-23, I-28**                                                          |

## 5. Riscos: o que aconteceu

| Risco do plano                                       | Onde        | Aconteceu?        | Resultado                                                                                                                                                              |
| ---------------------------------------------------- | ----------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correção de km em transação, regra mais complexa     | I-30        | Mitigado          | Hook simples (I-18) antes do da I-30, tabela de cenários e 26 testes. A atomicidade foi provada forçando a falha do último passo. Sem defeito encontrado depois.        |
| M5 com só 2 dias                                     | M5          | Sim               | A M5 levou 3 dias. A I-33 foi antecipada, como o plano sugeria, e a I-38 entregou dois dos três relatórios candidatos.                                                                                  |
| Foto da denúncia depende de câmera e envio de arquivo | I-28       | Sim, resolvido    | No Expo Go o `FormData` não lia `{ uri, name, type }`: a foto sobe como `File` de `expo-file-system`. No iOS a câmera só abre depois que a folha some.                  |
| PDF diferente em Android e iOS                       | I-37        | Sim, resolvido    | Margem pelo `@page`, fonte embutida e numeração de páginas com `pdf-lib`. Os três PDFs foram exportados nos dois aparelhos.                                              |
| Hooks JavaScript do PocketBase são novidade          | I-18, I-30  | Mitigado          | Oito hooks, todos com testes de API.                                                                                                                                   |
| Build para iOS exige conta de desenvolvedor Apple    | I-41        | Sim               | Decidido: iOS pelo Expo Go (limitação L01 do documento de requisitos).                                                                                                  |

Riscos **não previstos** que apareceram: teclado cobrindo campos nos dois sistemas (resolvido com `react-native-keyboard-controller`), letra duplicada com o teclado compondo texto (propriedade `capitalize` dos campos), barra de status ilegível no tema escuro (`StatusBar` sempre `dark`) e o início do desenvolvimento sete dias depois do planejado.

## 6. Decisões

| Decisão do plano                                                        | Situação final                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1. Instância do PocketBase em `pb.wizecode.com.br`                      | Mantida.                                                                                                            |
| 2. Política de senha: mínimo de 8 caracteres                            | Mantida.                                                                                                            |
| 3. Placa única (UK); a chave primária é o `id`                          | Mantida e ampliada pela RB20 (placa equivalente).                                                                    |
| 4. Campos decimais 8,2 (até 999.999,99)                                 | Mantida, no aplicativo e no servidor.                                                                               |
| 5. Entrega no iOS: parcial, testes pelo Expo Go                         | Confirmada: sem instalável para iOS. O APK do Android foi gerado no EAS Build (I-41).                                |
| 6. Onde agregar o relatório financeiro (em aberto)                      | **Decidida:** no aplicativo (I-36). Sem endpoint nem migração.                                                      |
| 7. Tamanhos e datas como estão                                          | Os tamanhos ficaram como referência. As datas não se mantiveram: ver a seção 2.                                      |

## 7. Ordem de corte

O plano previa, faltando tempo, cortar nesta ordem: I-38 (opcional, cerca de 4,5 h), depois a I-43 (cerca de 2 h, que poderia ser feita em novembro), depois a I-42 e a I-40 (cerca de 9 h, também em novembro). **Resultado:** a I-38 foi executada, de forma parcial; a I-40, a I-41 e a I-42 foram feitas entre 5 e 7/11, e a I-43 foi fechada em 10/11. Nenhuma issue foi abandonada.

## 8. Apêndice A: alterações em relação à versão 1.0

| Item                          | Versão 1.0                                              | Versão 2.0                                                                                          |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Número de issues              | 43 (I-01 a I-43)                                        | 43 mais a #47, fora do plano                                                                        |
| Labels e campos do Project    | Grupos tipo, área e prioridade; campos Status etc.      | Não usados; prioridade e tamanho ficam neste documento                                              |
| Modelo do corpo da issue      | Descrição, Requisitos, Critérios, Tarefas, Dependências | Descrição, Tarefas e Critérios de aceite                                                            |
| Período                       | 13 a 31/10 (19 dias)                                    | 20/10 a 10/11 (22 dias)                                                                             |
| Requisitos cobertos           | 50 (23 RF, 8 RNF e 19 RB)                               | 52 (23 RF, 8 RNF e 21 RB)                                                                           |
| I-03                          | Decimais validados no aplicativo e no servidor          | Servidor na I-03; aplicativo nas I-24 a I-26                                                        |
| I-08                          | Cliente e formulário de exemplo                         | Incluiu a RB20                                                                                      |
| I-20                          | Consulta de veículos e rotas abertas no aplicativo       | View `vehicle_availability` (migração) e seletor com badge                                          |
| I-21, I-22, I-28              | Formulários                                             | Diálogos de confirmação; piso do retorno com denúncia pendente (RB13); foto de até 10 MB            |
| I-29                          | App mostra o motivo se o backend recusar a aprovação     | App antecipa a recusa pelo km de saída; a recusa por denúncia pendente da rota anterior aparece depois do toque |
| I-30                          | Correção de km em transação                             | Mais a RB21                                                                                         |
| I-31                          | Alteração da data é rejeitada                           | A data não muda (o `created` enviado é ignorado)                                                    |
| I-33                          | Filtros por placa, modelo, tipo e período               | Busca, tipo e período por atalhos; sem "Todos"; carga de 10 em 10                                   |
| I-34                          | Borda verde à esquerda                                  | Sem borda (decisão do autor)                                                                        |
| I-36                          | Filtros de veículo por placa, modelo e tipo; agregar onde: em aberto | Filtros por tipo de veículo e de serviço; agregação no aplicativo                              |
| I-37                          | PDF com período, filtros, data e totais                 | Mais gráficos, fonte embutida e numeração de páginas                                                |
| I-38                          | De um a três relatórios                                 | Dois relatórios; a utilização e a última troca de óleo ficaram de fora                              |
| I-39                          | RB01 a RB19                                             | RB01 a RB21 e 530 testes de API                                                                     |
| I-41                          | "O instalável para Android existe desde o MVP"          | O APK foi gerado de novo no EAS Build                                                               |
| I-23, I-29 (10/11)            | Listas lidas por inteiro                                | Carregam de 10 em 10, com busca e filtros no servidor                                                |
