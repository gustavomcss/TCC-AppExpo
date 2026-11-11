# TRACE – Especificação de Requisitos de Software

| Campo                | Valor                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Produto              | TRACE, aplicativo móvel de gestão operacional de frotas                                       |
| Documento            | Especificação de Requisitos de Software (ERS), versão final conforme implementado             |
| Versão               | 2.0                                                                                           |
| Data                 | 10 de novembro de 2026                                                                         |
| Substitui            | TRACE – Requisitos, versão 1.0 de 13 de outubro de 2026                                        |
| Autor                | Gustavo Corrêa                                                                                |
| Situação             | Versão final, revisada pelo autor                                                             |

## Sumário

1. Introdução
2. Descrição geral
3. Requisitos funcionais
4. Requisitos não funcionais
5. Regras de negócio
6. Limitações conhecidas
7. Rastreabilidade
8. Apêndice A: alterações em relação à versão 1.0

## 1. Introdução

### 1.1 Finalidade

Este documento especifica os requisitos do TRACE na forma em que foram implementados. Ele substitui a versão 1.0, elaborada antes do desenvolvimento, e registra o que foi cumprido, o que foi alterado durante a codificação e o que ficou de fora. Cada requisito aponta as issues do repositório que o implementam, para que possa ser verificado até o critério de aceite. A versão 2.0 é retrospectiva: foi escrita depois da implementação e descreve o que foi entregue, e por isso a situação de cada requisito é medida em relação à versão 1.0, cujas diferenças estão no Apêndice A.

### 1.2 Escopo do produto

O TRACE é um aplicativo móvel multiplataforma (Android e iOS) para a gestão operacional de frotas de pequenas e médias empresas. Cobre o cadastro de veículos e motoristas, o registro de rotas (saída e retorno), de abastecimentos, de trocas de óleo e de manutenções em oficina, a denúncia e a correção de divergências de quilometragem, o histórico dos registros e a emissão de relatórios em PDF.

Ficam fora do escopo: rastreamento por GPS, integração com sistemas de terceiros, cadastro de supervisores pelo aplicativo e pagamento de qualquer natureza.

### 1.3 Definições e convenções

| Termo               | Significado                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Motorista           | Usuário que opera veículos e registra rotas e serviços.                                                                                  |
| Supervisor          | Usuário que, além do que o motorista faz, gerencia motoristas e veículos, revisa denúncias, encerra rotas e emite relatórios.             |
| Superadmin          | Administrador da instância do PocketBase, fora do aplicativo. Cria supervisores e altera o cargo de qualquer usuário.                     |
| Km atual            | Hodômetro do veículo (`odometer`), mantido pelo sistema (RB03).                                                                          |
| Rota aberta         | Rota com saída registrada e sem retorno nem encerramento.                                                                                |
| Rota finalizada     | Rota encerrada pelo retorno do próprio motorista, com km de retorno.                                                                     |
| Rota encerrada      | Rota encerrada administrativamente pelo supervisor, sem km de retorno (RB15).                                                            |
| Denúncia            | Registro de divergência entre o km exibido e o do hodômetro, com foto do painel, em uma rota aberta.                                      |
| Perfil "Sistema"    | Comportamento automático, sem ação direta do usuário.                                                                                    |
| API Rules e hooks   | Regras de acesso do PocketBase e código JavaScript executado no servidor, que sustentam a integridade dos dados.                          |

**Origem** de cada requisito: *MVP* (existia na primeira versão), *MVP (ampliado)* ou *Novo* (introduzido no TRACE).

**Situação** de cada requisito, em relação à versão 1.0:

- **Atendido:** implementado como especificado.
- **Atendido com alteração:** implementado com mudança de escopo ou de redação, por decisão registrada (Apêndice A).
- **Reduzido:** implementado com menos do que a versão 1.0 pedia, por decisão registrada do autor; o que ficou de fora consta no Apêndice A e nas limitações (seção 6). Nenhum requisito ficou sem implementação.

### 1.4 Referências

- TRACE – Planejamento de Issues, versão de 13/10/2026 (43 issues, I-01 a I-43). Número da issue no GitHub igual ao I-nn até a #43.
- DER e DCU do TRACE.
- Repositório `gustavomcss/TCC-AppExpo`: `CLAUDE.md` (decisões e estado) e `docs/historico-de-desenvolvimento.md` (histórico, issue por issue), `backend/README.md` (API Rules e hooks por coleção), `docs/roteiro-de-testes.md` e `docs/testes-android-ios.md` (resultados dos testes).

## 2. Descrição geral

### 2.1 Perspectiva do produto

O aplicativo (React Native com Expo, TypeScript) conversa com um backend PocketBase v0.40.5 autogerenciado, em contêiner Docker, acessado por HTTPS. O backend é a fonte da verdade: toda restrição de acesso e de integridade está nas API Rules e nos hooks, e o aplicativo apenas valida antes, para dar retorno imediato, e exibe o aviso do servidor (RNF03, RNF06).

### 2.2 Perfis de usuário

| Perfil     | Funcionalidades                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motorista  | Rotas, denúncia de km, abastecimento, troca de óleo, manutenção, histórico (só os próprios registros), perfil.                                                    |
| Supervisor | Tudo o que o motorista faz, mais gestão de motoristas, gestão de veículos, revisão de denúncias, encerramento de rotas e relatórios. Vê os registros de todos.    |
| Superadmin | Fora do aplicativo, no painel do PocketBase: cria supervisores e altera o cargo de usuários (RB19).                                                              |

Não existe auto-cadastro.

### 2.3 Restrições, premissas e dependências

- Uma única base de código para Android e iOS (RNF01). No iOS, a execução é pelo Expo Go (SDK 58).
- Backend PocketBase v0.40.5, com migrações em `pb_migrations` e hooks em `pb_hooks` (RNF07).
- O aplicativo é usado em tema claro e em retrato, e depende de conexão com o servidor: não há modo offline.
- Km, litros e valores são decimais de duas casas, até 999.999,99 (RB16).
- Premissa de uso: uma empresa de pequeno ou médio porte, com dezenas de veículos e motoristas.

## 3. Requisitos funcionais

### 3.1 Acesso e usuários

| ID   | Requisito                                                                                                                                                                                                                                                                                                       | Perfil | Origem          | Situação | Issues             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------- | -------- | ------------------ |
| RF01 | O sistema deve autenticar o usuário por e-mail e senha e manter a sessão no aparelho até o logout. O aplicativo guarda somente o token de sessão, nunca a senha. Os usuários são cadastrados pelo supervisor (motoristas, RF03) ou pelo superadmin, diretamente no PocketBase (RB19). Não existe auto-cadastro. | Todos  | MVP             | Atendido | #6, #7             |
| RF02 | O sistema deve oferecer funcionalidades conforme o perfil: o motorista utiliza rotas, denúncia, abastecimento, troca de óleo, manutenção e histórico; o supervisor utiliza as mesmas, acrescidas de revisão de denúncias, gestão de veículos e de motoristas, encerramento administrativo de rotas e relatórios. | Todos  | MVP (ampliado)  | Atendido | #10                |
| RF03 | O sistema deve permitir que o supervisor cadastre motoristas (nome, e-mail e senha inicial de no mínimo 8 caracteres), edite nome e foto, desative e reative a conta, redefina a senha quando solicitado e exclua motoristas sem registros vinculados (RB18, RB19). A desativação preserva o usuário e seus registros e é recusada enquanto o motorista tem rota aberta. | Supervisor | Novo | Atendido | #7, #11, #13, #14, #15 |
| RF04 | O sistema deve exibir o perfil do usuário logado (foto, nome, cargo e e-mail), permitir que ele altere a própria foto, por câmera ou galeria, e a própria senha, informando a senha atual, e permitir o logout.                                                                                                | Todos  | MVP (ampliado)  | Atendido | #11, #12           |

### 3.2 Veículos

| ID   | Requisito                                                                                                                                                                                                                                                                                  | Perfil     | Origem         | Situação | Issues         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------- | -------- | -------------- |
| RF05 | O sistema deve permitir que o supervisor cadastre veículos informando placa (formato `AAA-0A00`), modelo, tipo (carro, moto, caminhão ou van) e km atual. O veículo nasce ativo. A placa é única, inclusive contra a placa equivalente do outro formato (RB20).                               | Supervisor | MVP (ampliado) | Atendido | #8, #16        |
| RF06 | O sistema deve permitir que o supervisor edite placa, modelo e tipo do veículo (o km atual é somente leitura, RB09), exclua veículos sem registros vinculados e inative e reative veículos com histórico (RB12). A inativação é recusada enquanto o veículo tem rota aberta.                  | Supervisor | Novo           | Atendido | #17            |

### 3.3 Rotas

| ID   | Requisito                                                                                                                                                                                                                                                                                                                                                                                                   | Perfil     | Origem         | Situação | Issues         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------- | -------- | -------------- |
| RF07 | O sistema deve listar, ao iniciar uma rota, os veículos ativos, marcando com o badge "Indisponível" os que têm rota aberta e impedindo sua seleção. A lista reflete o estado atual a cada abertura. O motorista só lê as próprias rotas, então a disponibilidade vem de uma consulta no servidor que expõe apenas o identificador dos veículos ocupados.                                                  | Todos      | MVP (ampliado) | Atendido | #20            |
| RF08 | O sistema deve permitir o registro de saída da rota: o usuário seleciona o veículo (seleção única), visualiza o km atual (somente leitura) e informa o itinerário e uma observação opcional, ambos de até 500 caracteres. Ao abrir a tela, o aplicativo verifica se o usuário já tem rota aberta (RB02). O envio pede confirmação.                                                                           | Todos      | MVP            | Atendido | #18, #21       |
| RF09 | O sistema deve permitir o registro de retorno, que finaliza a rota: o veículo é preenchido a partir da rota aberta do usuário, e o usuário informa o km de retorno (RB13) e uma observação opcional. O servidor grava a data de retorno e atualiza o km atual do veículo (RB03). O envio pede confirmação.                                                                                                  | Todos      | MVP            | Atendido | #18, #22       |
| RF10 | O sistema deve permitir que o supervisor encerre administrativamente uma rota aberta (esquecida ou travada por falha), por meio de um módulo em Serviços que lista as rotas abertas e as encerradas, com o contador de rotas abertas no card. A lista carrega de 10 em 10, com busca por motorista, placa ou modelo e filtro por situação. A rota recebe o status "encerrada", sem km de retorno (RB15). O encerramento é recusado se a rota tem denúncia pendente (RB21) e pede confirmação.        | Supervisor | Novo           | Atendido | #18, #23, #30  |

### 3.4 Registros de serviço

| ID   | Requisito                                                                                                                                              | Perfil | Origem         | Situação | Issues         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------- | -------- | -------------- |
| RF11 | O sistema deve permitir o registro de abastecimento informando veículo, km, tipo de combustível (gasolina, aditivada, etanol ou diesel), litros e valor total. | Todos  | MVP            | Atendido | #19, #24       |
| RF12 | O sistema deve permitir o registro de troca de óleo informando veículo, km, tipo de óleo e valor.                                                      | Todos  | MVP (ampliado) | Atendido | #19, #25       |
| RF13 | O sistema deve permitir o registro de manutenção em oficina informando veículo, km, descrição livre e valor.                                           | Todos  | Novo           | Atendido | #19, #26       |

Nos três registros, apenas veículos ativos são oferecidos (RB12), o km é informativo (RB04), e autor e data são definidos pelo servidor (RNF05).

### 3.5 Denúncia de divergência de km

| ID   | Requisito                                                                                                                                                                                                                                                                                                                                                                                                             | Perfil     | Origem | Situação | Issues         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | -------- | -------------- |
| RF14 | O sistema deve permitir que o usuário com rota aberta registre uma denúncia de divergência de km: o resumo da rota aberta (veículo, km de saída, itinerário e observação) é exibido, e o usuário informa o km correto do hodômetro e anexa uma foto do painel, por câmera ou galeria, de até 10 MB. Cada rota admite no máximo uma denúncia (RB11). A denúncia nasce pendente, e o envio pede confirmação.             | Todos      | Novo   | Atendido | #27, #28       |
| RF15 | O sistema deve permitir que o supervisor liste as denúncias, pendentes e já revisadas, e aprove ou reprove as pendentes, com confirmação. O card do módulo mostra o contador de pendentes. A lista carrega de 10 em 10, com busca e filtro por situação. Após a revisão, a lista e o card exibem "Revisado em DD/MM/AAAA", a partir de campo próprio de data da revisão. Quando a aprovação seria recusada por inconsistência (RB14), o botão "Aprovar" fica inativo com a explicação. | Supervisor | Novo   | Atendido | #27, #29       |
| RF16 | O sistema deve aplicar as correções de km previstas em RB06 e RB07 ao aprovar uma denúncia, em uma única transação (perfil Sistema).                                                                                                                                                                                                                                                                                  | Sistema    | Novo   | Atendido | #30            |

### 3.6 Histórico

| ID   | Requisito                                                                                                                                                                                                                                                                                                                                                                                                   | Perfil | Origem | Situação                | Issues         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----------------------- | -------------- |
| RF17 | O sistema deve exibir o histórico por módulo (rotas, denúncias, abastecimento, troca de óleo e manutenção), um módulo por vez, com busca por placa ou modelo (o supervisor também busca pelo nome do motorista), filtro por tipo de veículo e filtro por período por atalhos (este mês, mês anterior, últimos 3 meses e últimos 6 meses). Sem seleção nos filtros, vale tudo. A carga é incremental, de 10 em 10. O motorista vê apenas os próprios registros; o supervisor vê os de todos e o autor de cada registro. | Todos  | Novo   | Reduzido          | #33, #35       |
| RF18 | O sistema deve exibir, no histórico de rotas, cada rota finalizada em um card com ícone do tipo de veículo, placa, modelo, motorista, data e hora de saída e de retorno, km de saída, km de retorno, km rodados e itinerário.                                                                                                                                                                              | Todos  | MVP    | Reduzido          | #34            |
| RF19 | O sistema deve exibir, no card da rota, um indicador discreto quando houver denúncia registrada para ela: uma linha com ícone de alerta e o texto "Denúncia pendente", "Denúncia aprovada" ou "Denúncia reprovada". Sem denúncia, nada aparece.                                                                                                                                                           | Todos  | Novo   | Atendido com alteração  | #34, #35       |

### 3.7 Navegação

| ID   | Requisito                                                                                                                                                                                                                                                                                                                                                              | Perfil | Origem | Situação | Issues         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- | -------------- |
| RF20 | O sistema deve organizar a navegação em três abas (Histórico, Serviços e Usuário) para ambos os perfis. O aplicativo abre em Serviços, e o voltar das outras abas leva a Serviços antes de sair. Os módulos administrativos (gestão de motoristas e de veículos, revisão de denúncias, encerramento administrativo e relatórios) aparecem como cards em Serviços, apenas para o supervisor. | Todos  | Novo   | Atendido | #10, #40       |

### 3.8 Edição de registros

| ID   | Requisito                                                                                                                                                                                                                                                                                          | Perfil | Origem | Situação | Issues         |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- | -------------- |
| RF21 | O sistema deve permitir que o usuário edite os campos não sensíveis dos próprios registros de abastecimento, troca de óleo e manutenção (valor, litros, tipo de combustível, tipo de óleo e descrição), mantendo fixos veículo, km, autor e data de registro (RB17). A ação aparece só nos registros do próprio usuário, inclusive para o supervisor. | Todos  | Novo   | Atendido | #31, #32       |

### 3.9 Relatórios

| ID   | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Perfil     | Origem | Situação               | Issues         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ---------------------- | -------------- |
| RF22 | O sistema deve permitir que o supervisor gere e compartilhe em PDF o relatório financeiro, agrupado por veículo e consolidando abastecimento, troca de óleo e manutenção, com atalhos de período (este mês, mês anterior, últimos 3 e 6 meses), período personalizado por datas ou sem período, e filtros por tipo de veículo e por tipo de serviço. Veículos inativos aparecem quando têm registros no período (RB12). O relatório traz o total geral, o total de cada serviço por veículo e dois gráficos (custo por veículo e custo por mês, quando há dados suficientes). O PDF mostra período, filtros, data de emissão e numeração de páginas. | Supervisor | Novo   | Reduzido         | #36, #37       |
| RF23 | O sistema deve permitir que o supervisor gere e compartilhe em PDF relatórios adicionais, escolhidos durante a issue de relatórios: **km rodados por veículo e período** e **denúncias por situação, veículo e motorista**, ambos acessíveis no mesmo módulo, por um seletor de relatório, com os mesmos filtros de período e de tipo de veículo.                                                                                                                                                                                                               | Supervisor | Novo   | Reduzido (opcional)     | #38            |

O requisito listava três relatórios como candidatos, "se houver tempo"; o autor escolheu dois na issue #38, como o plano permitia (de um a três). Os outros dois candidatos (utilização do veículo em dias de rota e última troca de óleo por veículo) não foram feitos e constam nas limitações (L02).

## 4. Requisitos não funcionais

| ID    | Requisito                                                                                                                                                                                                                                                       | Categoria         | Situação              | Issues           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------- | ---------------- |
| RNF01 | O aplicativo deve funcionar em Android e iOS a partir de uma única base de código (React Native com Expo). O instalável do Android é gerado pelo EAS Build; o iOS é executado pelo Expo Go, porque o instalável exige o Apple Developer Program (L01).             | Portabilidade     | Atendido com alteração | #1, #40, #41     |
| RNF02 | O backend deve ser o PocketBase, autogerenciado em contêiner Docker (via Coolify), com acesso por HTTPS por meio de Cloudflare Tunnel.                                                                                                                         | Implantação       | Atendido              | #2, #41          |
| RNF03 | O controle de acesso e as restrições de integridade devem ser aplicados no backend, por API Rules e hooks JavaScript do PocketBase, com o aplicativo exibindo os avisos correspondentes.                                                                       | Segurança         | Atendido              | #5 e as de backend |
| RNF04 | A autenticação e o armazenamento de senhas devem ser delegados ao PocketBase; nenhuma credencial deve ser mantida no código do aplicativo nem no repositório. O aplicativo guarda apenas o token de sessão, em armazenamento seguro.                            | Segurança         | Atendido              | #6, #41          |
| RNF05 | A data e hora de criação de todos os registros (`created`) devem ser geradas pelo servidor; um valor enviado pelo aplicativo é ignorado.                                                                                                                        | Integridade       | Atendido              | #3, #19          |
| RNF06 | Os dados devem ser validados em duas camadas: no cliente, antes do envio (React Hook Form e Zod), e no servidor, por restrições do esquema, API Rules e hooks. O servidor responde com um código de erro, e o aplicativo o traduz em mensagem em português, por campo ou do formulário. | Confiabilidade    | Atendido              | #8               |
| RNF07 | A estrutura do banco (coleções, campos, índices e regras) e os hooks devem ser versionados no repositório; as migrações recriam o esquema numa instância vazia. A documentação técnica descreve como subir o backend.                                          | Manutenibilidade  | Atendido com alteração | #4, #42          |
| RNF08 | A interface deve priorizar clareza, simplicidade e facilidade de uso, com poucas telas e campos por registro. O maior formulário (abastecimento) tem cinco campos.                                                                                            | Usabilidade       | Atendido              | #9, #40          |

Nota sobre o RNF07: a conferência por uma pessoa que não participou do projeto, seguindo apenas o README, é a última tarefa da issue #42.

## 5. Regras de negócio

Cada regra tem um cenário no roteiro de testes (`docs/roteiro-de-testes.md`) com o mesmo número (C01 a C21), provado por requisições diretas à API, sem passar pelo aplicativo, e por teste no aplicativo.

| ID   | Regra                                                                                                                                                                                                                                                                                                                                                              | Issues           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| RB01 | Um veículo não pode ter duas rotas abertas simultaneamente. Pode ser usado por vários motoristas, mas não ao mesmo tempo. Garantida por índice único parcial no banco.                                                                                                                                                                                             | #18, #20, #21    |
| RB02 | Um motorista não pode ter duas rotas abertas simultaneamente. O aplicativo verifica ao abrir "Registrar saída" e, se houver rota aberta, exibe aviso e volta à tela inicial sem mostrar o formulário. O backend rejeita a criação como garantia final, também por índice único parcial.                                                                              | #18, #21         |
| RB03 | O km atual é um campo do veículo. É informado no cadastro e, depois, mantido igual ao km de retorno da última rota finalizada do veículo, pelo servidor, na mesma transação da finalização. Rotas encerradas não contam, pois não têm km de retorno. Ao abrir uma rota, o km de saída deve ser igual ao km atual do veículo: o servidor recusa outro valor (`km_departure_not_odometer`). Assim o km atual só muda pela finalização de uma rota ou pela correção de uma denúncia aprovada.                                                                                                                 | #18, #22         |
| RB04 | O km informado em abastecimento, troca de óleo e manutenção é apenas informativo e não altera o km atual do veículo.                                                                                                                                                                                                                                                | #19, #24 a #26   |
| RB05 | A existência de denúncia pendente não impede a finalização da rota. O km de retorno, porém, deve respeitar o piso descrito na RB13.                                                                                                                                                                                                                                 | #22, #28         |
| RB06 | Ao aprovar uma denúncia, o sistema corrige o km de saída da rota do denunciante. Se a rota imediatamente anterior do veículo estiver finalizada, corrige também o seu km de retorno. Se não houver rota anterior ou ela estiver encerrada, nenhuma outra rota é alterada.                                                                                            | #30              |
| RB07 | Sempre que uma correção da RB06 alterar o km de retorno da última rota finalizada do veículo, o km atual do veículo é atualizado para o novo valor, mantendo a RB03. A reprovação não altera nenhum km.                                                                                                                                                            | #30              |
| RB08 | O supervisor pode revisar uma denúncia aberta por ele mesmo.                                                                                                                                                                                                                                                                                                        | #27, #29         |
| RB09 | O km atual do veículo não pode ser editado manualmente após o cadastro, nem pelo aplicativo nem por requisição direta de usuário. (O superusuário, fora do aplicativo, pode corrigir o valor no painel do PocketBase: ver L12.)                                                                                                                                                                                                                                              | #5, #17          |
| RB10 | O histórico de rotas exibe apenas rotas finalizadas. As rotas encerradas administrativamente são consultadas pelo supervisor no módulo de encerramento (RF10).                                                                                                                                                                                                       | #23, #33         |
| RB11 | Cada rota admite no máximo uma denúncia, criada somente enquanto a rota estiver aberta. O km informado deve ser diferente do km de saída da rota, e a foto é obrigatória.                                                                                                                                                                                           | #27, #28         |
| RB12 | Um veículo com registros vinculados (rotas, abastecimentos, trocas de óleo, manutenções, denúncias) não pode ser excluído; nesse caso, é inativado. O veículo inativo deixa de ser listado para novas rotas e registros, mas permanece no histórico e nos relatórios. A inativação é recusada com rota aberta.                                                      | #17, #19, #20    |
| RB13 | Ao finalizar uma rota, o km de retorno deve ser maior que o km de saída da mesma rota. **Enquanto a rota tem denúncia pendente, deve ser maior também que o km informado na denúncia**, para que a rota fique coerente qualquer que seja a revisão (aprovar leva a saída ao km denunciado; reprovar a deixa onde está). Se a saída estiver errada para mais, o motorista finaliza depois da revisão: a regra nunca é afrouxada. | #18, #22, #28    |
| RB14 | A correção feita pela aprovação de denúncia não pode gerar inconsistência: o km de retorno da rota anterior deve permanecer maior que o seu km de saída e maior que o km de uma denúncia pendente dessa rota. Se gerar, a aprovação é recusada por inteiro, sem salvar a revisão nem alterar km. O aplicativo antecipa a recusa pelo km de saída da rota anterior, mas o servidor é a garantia. | #29, #30         |
| RB15 | O encerramento administrativo é feito só pelo supervisor, não exige km de retorno, não altera o km atual do veículo e marca a rota com o status "encerrada", distinto de "finalizada". A rota encerrada libera o veículo e o motorista (RB01 e RB02 consideram apenas rotas abertas).                                                                               | #18, #23         |
| RB16 | Km, litros e valores em dinheiro são numéricos, com duas casas decimais, não negativos e de até 999.999,99, validados no aplicativo e no servidor. Em km, litros e valores de registro, o valor deve ser maior que zero.                                                                                                                                              | #3, #8, #24 a #26 |
| RB17 | Nenhum registro pode ser excluído pelo aplicativo, exceto motorista e veículo sem registros vinculados (RB12, RB18). Rotas e denúncias não podem ser editadas, salvo: a finalização da rota pelo autor (uma vez), o encerramento administrativo (RF10), a revisão da denúncia (RF15) e as correções de km das RB06 e RB07. Os registros de abastecimento, troca de óleo e manutenção podem ter seus campos não sensíveis editados apenas pelo autor; veículo, km, autor e data de registro não são editáveis. Inconsistências de km nas rotas são corrigidas apenas pelo fluxo de denúncia. | #18, #31, #32    |
| RB18 | O usuário desativado não pode autenticar nem acessar dados, inclusive com sessão já iniciada. A desativação é bloqueada enquanto o usuário tiver rota aberta (o supervisor deve encerrá-la antes). A exclusão de usuário é bloqueada quando houver registros vinculados; nesse caso, usa-se a desativação.                                                           | #7, #14, #15     |
| RB19 | O usuário altera a própria foto e a própria senha. O supervisor cadastra o motorista com e-mail e senha inicial, edita apenas nome, foto e situação (ativo ou inativo) e redefine a senha quando solicitado; e-mail e cargo não são alterados por ele. O aplicativo só cria usuários com cargo motorista. A troca da senha inicial no primeiro acesso é uma orientação informal, não imposta pelo sistema. Supervisores são criados e geridos apenas pelo superadmin, que também altera o cargo de qualquer usuário; o supervisor não altera outro supervisor. | #11 a #15        |
| RB20 | **(Nova.)** A placa no formato antigo e a placa Mercosul equivalente são a mesma placa. O 5º caractere é um dígito no formato antigo e a letra de A a J, na mesma posição, no Mercosul (0 = A, ..., 9 = J): `ABC-1323` equivale a `ABC-1D23`. Cadastrar ou editar um veículo para a placa equivalente de outro é recusado. Converter a placa de um veículo é editar a placa dele. Garantida por índice único no banco. | #8, #16, #17     |
| RB21 | **(Nova.)** O encerramento administrativo de uma rota com denúncia pendente é recusado. O supervisor deve revisar a denúncia (aprovar ou reprovar) antes de encerrar a rota. A denúncia nunca é excluída (RB17).                                                                                                                                                     | #28, #30         |

## 6. Limitações conhecidas

| ID  | Limitação                                                                                                                                                                                                                      | Requisitos         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| L01 | Não há instalável para iOS: o iOS é executado pelo Expo Go (SDK 58), com o servidor de desenvolvimento ligado. O instalável exige o Apple Developer Program.                                                                    | RNF01              |
| L02 | Relatórios: não foram feitos a utilização do veículo (dias em rota), a última troca de óleo por veículo, o custo por km nem o consumo (km/L). Os relatórios de km e de denúncias não têm gráficos.                              | RF22, RF23         |
| L03 | O Histórico não tem visão "Todos" (cada módulo é uma lista) nem período por datas livres, só atalhos. A busca por modelo e por nome, feita no servidor, não ignora acento.                                                     | RF17               |
| L04 | As listas de motoristas e de veículos leem todos os registros e filtram no aplicativo, e os relatórios leem todo o período e somam no aplicativo. Adequado ao porte previsto: o app foi exercitado com mais de 10 veículos durante o desenvolvimento e com 8 veículos, 7 usuários e cerca de 110 rotas no conjunto de demonstração; não houve teste de carga com volumes maiores. O Histórico, o Encerramento de rotas e a Revisão de denúncias carregam do servidor, de 10 em 10. | RF03, RF06, RF22   |
| L05 | Testado em dois aparelhos (iPhone XS e Galaxy S25 FE), só em tema claro e em retrato. Sem telas mais estreitas, outras versões de sistema nem iPad (o `supportsTablet` do iOS está desligado, pois o suporte a tablet nunca foi confirmado em aparelho).                                                                             | RNF01              |
| L06 | Com a fonte do sistema no tamanho máximo, placeholders e títulos longos são abreviados com reticências.                                                                                                                         | RNF08              |
| L07 | Os campos de km e de valor reescrevem o texto a cada tecla (máscara numérica), porque nenhuma biblioteca nativa de máscara roda no Expo Go.                                                                                    | RF08 a RF13        |
| L08 | Supervisores e a mudança de cargo são do superadmin, no painel do PocketBase: o aplicativo não os oferece.                                                                                                                      | RF03, RB19         |
| L09 | Não há modo offline: toda operação exige conexão com o servidor.                                                                                                                                                                | Todos              |
| L10 | Não há testes automatizados do aplicativo: a validação feita no app (esquemas Zod, máscaras, regras antecipadas) foi verificada manualmente nos aparelhos. A prova automatizada está no servidor, que é a garantia das regras (545 testes de API). | RNF06 |
| L11 | A recusa de desativar motorista com rota aberta (RB18), de inativar veículo com rota aberta (RB12) e de encerrar rota com denúncia pendente (RB21) é feita no servidor contando antes de salvar, sem índice único no banco. Duas requisições simultâneas, uma de cada lado da regra, podem passar pela contagem ao mesmo tempo. Já a RB01 e a RB02 têm índice único parcial e valem mesmo com requisições simultâneas. O risco é baixo no porte previsto. | RB12, RB18, RB21 |
| L12 | O servidor impede que um usuário altere o km atual do veículo, mas o superusuário, no painel do PocketBase, pode editá-lo (e qualquer outro campo). É o acesso do superadmin, fora do aplicativo. | RB09 |
| L13 | A RB10 (o histórico mostra só rotas finalizadas) é uma regra de exibição: está no filtro do aplicativo, e a API devolve as rotas encerradas a quem pode listá-las, porque o módulo de encerramento precisa delas. | RB10 |
| L14 | As fotos de perfil e de denúncia são servidas por URL sem token (o campo de arquivo do PocketBase não é protegido). O nome do arquivo é aleatório, então a URL não é adivinhável, mas quem a tiver vê a imagem. Proteger exigiria marcar os campos como protegidos, pedir um token de arquivo em três pontos do aplicativo e gerar um novo APK. | RF04, RF14 |
| L15 | Privacidade e acesso: o app mostra um aviso de privacidade (folha "Privacidade dos dados", no login e na aba Usuário), mas não registra aceite, porque os usuários são cadastrados pelo supervisor da empresa. Não há limite de tentativas de login configurado no PocketBase, e a política de senha é o padrão de 8 caracteres. | RNF04, RB19 |

## 7. Rastreabilidade

Casos de uso do DCU: UC01 Autenticar-se; UC02 Gerenciar perfil; UC03 Registrar saída da rota; UC04 Registrar retorno da rota; UC05 Registrar denúncia de divergência de km; UC06 Registrar abastecimento; UC07 Registrar troca de óleo; UC08 Registrar manutenção; UC09 Consultar histórico; UC10 Editar registro próprio; UC11 Gerenciar veículo; UC12 Gerenciar motorista; UC13 Encerrar rota administrativamente; UC14 Revisar denúncia; UC15 Aplicar correção de km; UC16 Emitir relatórios; UC17 Gerenciar supervisor (ator Superadmin, no painel do PocketBase, fora do aplicativo). O RF02 e o RF20 são transversais e não correspondem a um caso de uso.

| Requisito | Caso de uso | Regras de negócio e requisitos relacionados          |
| --------- | ----------- | ---------------------------------------------------- |
| RF01      | UC01        | RB18, RB19, RNF04                                    |
| RF03      | UC12        | RB18, RB19                                           |
| RF04      | UC02        | RB19                                                 |
| RF05      | UC11        | RB03, RB16, RB20                                     |
| RF06      | UC11        | RB09, RB12, RB20                                     |
| RF07      | UC03        | RB01, RB12                                           |
| RF08      | UC03        | RB02, RB03, RB16                                     |
| RF09      | UC04        | RB03, RB05, RB13, RB16                               |
| RF10      | UC13        | RB01, RB02, RB10, RB15, RB21                         |
| RF11 a RF13 | UC06 a UC08 | RB04, RB12, RB16, RNF05                            |
| RF14      | UC05        | RB05, RB11, RB16                                     |
| RF15      | UC14        | RB08, RB14                                           |
| RF16      | UC15        | RB06, RB07, RB14                                     |
| RF17 a RF19 | UC09      | RB10, RB17                                           |
| RF21      | UC10        | RB04, RB17                                           |
| RF22, RF23 | UC16       | RB12, RB16                                           |
| RB19 (superadmin) | UC17 | RF01, L08                                            |

## 8. Apêndice A: alterações em relação à versão 1.0

### A.1 Regras novas e acréscimos

| Item  | Alteração                                                                                                                                                                                   | Motivo                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| RB20  | Nova: placa antiga e Mercosul equivalente são a mesma placa.                                                                                                                                | Descoberta no cadastro de veículos (#8): sem ela, o mesmo veículo poderia ser cadastrado duas vezes.                                           |
| RB21  | Nova: encerramento recusado com denúncia pendente.                                                                                                                                          | Descoberta na #28: encerrar a rota deixava a denúncia pendente sem destino.                                                                    |
| RB13  | Acréscimo: com denúncia pendente, o retorno deve superar também o km denunciado.                                                                                                            | Uma primeira versão baixava o piso e criava rotas finalizadas com retorno menor que a saída (#28).                                             |
| RB05  | Acréscimo: remissão ao piso da RB13.                                                                                                                                                        | Coerência com a RB13.                                                                                                                          |
| RB14  | Redação: passa a considerar a denúncia pendente da rota anterior; deixa de ser só "salvaguarda" (o aplicativo também a antecipa).                                                          | Implementação na #29 e na #30.                                                                                                                 |
| RB16  | Alcance ampliado de km para km, litros e valores em dinheiro; valores de registro maiores que zero.                                                                                         | O PocketBase trata 0 em número obrigatório como ausente.                                                                                       |
| RB19  | Acréscimo: o aplicativo só cria usuários com cargo motorista.                                                                                                                               | Explicitação do que já valia.                                                                                                                  |
| RB17  | Explicitação: o aplicativo exclui apenas motorista e veículo sem registros vinculados (RB12, RB18).                                                                                         | A frase "nenhum registro pode ser excluído" convivia com o RF03 e o RF06, que preveem essas exclusões.                                         |

### A.2 Requisitos alterados

| ID    | Versão 1.0                                                                          | Versão 2.0                                                                                                                                            | Motivo                                                                                                                                      |
| ----- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| RF03  | "e-mail empresarial"                                                                | Nome, e-mail e senha inicial de no mínimo 8 caracteres; sem regra de domínio.                                                                         | O sistema não valida o domínio do e-mail.                                                                                                   |
| RF14  | "O veículo vem pré-selecionado, o km atual é exibido"                               | Resumo da rota aberta, com o km de saída.                                                                                                             | O que importa para a denúncia é o km de saída da rota.                                                                                      |
| RF15  | Listar, aprovar ou reprovar denúncias pendentes                                     | Lista com pendentes e revisadas; confirmação; "Aprovar" inativo quando a RB14 recusaria.                                                              | Evita enviar ao servidor uma aprovação que será recusada.                                                                                   |
| RF17  | Filtros por placa, modelo, tipo e período                                           | Busca por placa ou modelo, tipo e período por atalhos; sem visão "Todos" e sem datas livres.                                                          | Cada módulo é uma coleção; intercalar cinco fontes exigiria carga incremental própria. Decisão do autor (#33).                              |
| RF18  | Card com "borda colorida à esquerda (verde)"                                        | Card sem borda colorida, com os dados listados no requisito.                                                                                          | Decisão do autor (#34): o aplicativo é monocromático, com cor só em avisos, toasts e botões destrutivos.                                    |
| RF19  | "Indicador discreto"                                                                | Linha com ícone de alerta e a situação da denúncia, em cinza.                                                                                         | Formato adotado no card (#34, #35).                                                                                                         |
| RF22  | Filtros por veículo (todos, placa, modelo, tipo)                                    | Filtros por tipo de veículo e por tipo de serviço; períodos incluindo personalizado; dois gráficos.                                                  | Decisão do autor em 7/11: a busca por placa e modelo é desnecessária, pois o relatório já é agrupado por veículo.                            |
| RF23  | "Candidatos: km rodados e utilização; denúncias; última troca de óleo"              | Entregues km rodados e denúncias.                                                                                                                     | Escolha do autor na #38; a issue previa fechar o que faltasse como limitação.                                                               |
| RNF01 | Android e iOS com uma base de código                                                | Idem, com a limitação do instalável iOS (L01).                                                                                                        | Exige conta paga da Apple (#41).                                                                                                            |
| RNF03 | "API Rules do PocketBase"                                                           | API Rules e hooks JavaScript.                                                                                                                         | Várias regras exigem hook (transação, integridade entre coleções).                                                                          |
| RNF07 | Coleções, campos e regras versionados                                               | Inclui índices e hooks.                                                                                                                               | Os hooks e os índices também fazem parte da estrutura.                                                                                      |

### A.3 Itens que não mudaram

RF01, RF02, RF04 a RF13, RF16, RF20 e RF21, RNF02, RNF04 a RNF06 e RNF08, e as regras RB01 a RB04, RB06 a RB12, RB15, RB17 e RB18 foram implementados como especificados na versão 1.0 (com pequenas explicitações de redação, sem mudança de comportamento).

### A.4 Totais

| Grupo                      | Versão 1.0 | Versão 2.0 | Atendido | Atendido com alteração | Reduzido                         |
| -------------------------- | ---------- | ---------- | -------- | ---------------------- | -------------------------------- |
| Requisitos funcionais      | 23         | 23         | 18       | 1 (RF19)               | 4 (RF17, RF18, RF22, RF23)       |
| Requisitos não funcionais  | 8          | 8          | 6        | 2 (RNF01, RNF07)       | 0                                |
| Regras de negócio          | 19         | 21         | 21       | 0                      | 0                                |
