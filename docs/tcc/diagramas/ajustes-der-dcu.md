# Ajustes do DER e do DCU

Lista exata do que alterar nos dois diagramas para eles ficarem iguais ao que foi entregue. Os valores do DER foram conferidos no esquema que as migrações aplicam (7/11/2026). A justificativa de cada item está em [balanco-final.md](../balanco-final.md), partes 5.3 e 5.4.

Depois de ajustar, exporte em alta resolução (PNG de pelo menos 2.000 px de largura, ou SVG) com os nomes `der-final.png` e `dcu-final.png`, nesta pasta.

## DER

### Alterar atributos (7 itens, os únicos que mudam)

| # | Entidade  | Atributo        | Está no DER           | Passa a ser                                    |
| - | --------- | --------------- | --------------------- | ---------------------------------------------- |
| 1 | USER      | `name`          | `VARCHAR (100)`       | `VARCHAR (255)`                                |
| 2 | USER      | `photo`         | `VARCHAR (255)`       | `FILE` (arquivo, até 5 MB)                     |
| 3 | ROUTE     | `itinerary`     | `VARCHAR (255)`       | `VARCHAR (500)`                                |
| 4 | ROUTE     | `obs_departure` | `TEXT`                | `VARCHAR (500)` (ou manter `TEXT` com "máx. 500") |
| 5 | ROUTE     | `obs_return`    | `TEXT`                | `VARCHAR (500)` (idem)                         |
| 6 | REPAIR    | `description`   | `TEXT`                | `VARCHAR (500)` (idem)                         |
| 7 | COMPLAINT | `photo`         | `VARCHAR (255)`       | `FILE` (arquivo, até 10 MB)                    |

### Acrescentar notas (rodapé ou legenda do diagrama)

8. "`created`, `date_departure`, `date_return`, `reviewed`, `route_previous` e `odometer` são preenchidos pelo servidor."
9. "`odometer` e `km_departure` são opcionais no esquema do PocketBase; os hooks exigem o valor na criação."
10. "Placa no formato `AAA-0A00`, única também contra a placa equivalente (Mercosul). Índices únicos parciais: uma rota aberta por veículo e uma por motorista."
11. (Opcional) Uma tabela de correspondência: USER = `users`, VEHICLE = `vehicles`, ROUTE = `routes`, COMPLAINT = `complaints`, FUEL = `fuels`, OIL = `oils`, REPAIR = `repairs`.
12. (Opcional) Um objeto tracejado `vehicle_availability` ligado a VEHICLE, com a nota "view com os ids dos veículos que têm rota aberta".

### O que não muda

Nenhuma entidade, relação, cardinalidade, enum, chave, decimal 8,2 ou campo é acrescentado, retirado ou renomeado.

## DCU

### 1. Acrescentar o Superadmin (recomendado)

O Superadmin não usa o aplicativo, mas a RB19 e o RF01 lhe dão papéis (criar supervisores e alterar o cargo de usuários).

1. Acrescente o ator **Superadmin** (boneco, igual aos outros) **fora** da moldura "TRACE", à direita, abaixo do Supervisor.
2. Acrescente, dentro da moldura, abaixo de "Emitir relatórios", o caso de uso **Gerenciar supervisores**.
3. Ligue o ator ao caso de uso com uma associação (linha contínua). **Sem generalização** com o Supervisor.
4. Acrescente uma nota (o mesmo retângulo de canto dobrado de "Pré-condição de todos os outros casos de uso") ligada ao caso de uso por linha tracejada: "Realizado no painel do PocketBase, fora do aplicativo: cria supervisores e altera o cargo de usuários (RB19)."
5. Não ligue o Superadmin a "Autenticar-se".

### 2. Corrigir o «extend» de "Editar registro próprio"

Hoje a seta sai de "Editar registro próprio" para os três casos "Registrar abastecimento", "Registrar troca de óleo" e "Registrar manutenção". No aplicativo, a edição parte do **Histórico** (lápis no card do próprio registro).

1. Apague as três setas «extend».
2. Ligue com uma seta tracejada «extend» de **Editar registro próprio** para **Consultar histórico**.
3. (Opcional) Anote o ponto de extensão: "card do próprio registro".

### 3. Condição de "Aplicar correção de km"

Na seta «extend» de "Aplicar correção de km" para "Revisar denúncia", escreva a condição `[denúncia aprovada]` e acrescente uma nota ligada ao caso: "Executada pelo sistema, em uma transação. Recusada por inteiro se gerar inconsistência (RB14)."

### 4. Notas de pré-condição (uma nota por caso, com linha tracejada)

| Caso de uso                              | Texto da nota                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Autenticar-se (nota já existente)         | Acrescentar: "Usuário desativado não autentica nem acessa dados (RB18)."                                |
| Registrar retorno da rota                | "Pré-condição: o usuário tem rota aberta. Com denúncia pendente, o retorno deve superar o km denunciado (RB13)." |
| Registrar denúncia de divergência de km  | "Pré-condição: o usuário tem rota aberta. Uma denúncia por rota (RB11)."                                 |
| Encerrar rota administrativamente        | "Pré-condição: a rota está aberta e não tem denúncia pendente (RB21)."                                   |
| Consultar histórico                      | "Motorista: só os próprios registros. Supervisor: os de todos. Rotas: só as finalizadas (RB10)."         |

### 5. Opcional

- Em "Emitir relatórios", liste no texto os três relatórios entregues: financeiro, km rodados e denúncias.
- Em "Gerenciar veículo" e "Gerenciar motorista", liste as operações: cadastrar, editar, ativar e inativar, excluir sem vínculos e (motorista) redefinir senha.

### O que não muda

Os 16 casos de uso existentes, os dois atores (Motorista e Supervisor) e a generalização do Supervisor para o Motorista continuam como estão. Nenhum caso de uso deixou de ser implementado.
