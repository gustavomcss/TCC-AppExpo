# Backend do TRACE (PocketBase)

O backend é um PocketBase autogerenciado. Toda regra de acesso e de integridade fica aqui, nas API Rules e nos hooks, e não no app.

## Instância

| Item              | Valor                                                          |
| ----------------- | -------------------------------------------------------------- |
| URL pública       | `https://pb.wizecode.com.br` (painel em `/_/`)                 |
| Versão            | PocketBase v0.40.5                                             |
| Onde roda         | Contêiner Docker gerenciado pelo Coolify, no servidor `wcs-01` |
| HTTPS             | Cloudflare Tunnel até o contêiner                              |
| Dados (`pb_data`) | Volume Docker `pocketbase-data`, montado em `/app/pb_data`     |
| Coolify           | Recurso "TCC PocketBase", ambiente `production`                |
| Migrações         | Bind mount de `backend/pb_migrations` em `/app/pb_migrations`  |
| Hooks             | Bind mount de `backend/pb_hooks` em `/app/pb_hooks`            |

A origem dos bind mounts é este checkout no servidor (`/home/gustavo/TCC-AppExpo/backend`). Isso tem duas consequências:

- Tudo que estiver em `pb_migrations` roda no próximo restart do contêiner. Não deixe migração incompleta ali.
- Os hooks recarregam sozinhos quando um arquivo de `pb_hooks` muda. Trocar de branch muda o que a produção carrega na hora.

## Superadmin

O superadmin é o superuser do PocketBase. Ele entra só pelo painel `/_/`, fora do app, e cria e gerencia os supervisores. As credenciais ficam no gerenciador de senhas do responsável e **nunca** entram no repositório, no `.env` ou em issues.

## Verificações

Saúde da API pelo domínio público:

```bash
curl -i https://pb.wizecode.com.br/api/health
```

A resposta esperada é `200` com `{"message":"API is healthy."}`.

Persistência: depois de reiniciar o contêiner pelo Coolify, o login do superadmin no `/_/` precisa continuar funcionando. Se o painel pedir para criar o primeiro superuser, o `pb_data` não foi persistido.

## Migrações

O esquema (coleções, campos, índices) e as API Rules são versionados como arquivos em `backend/pb_migrations/`, commitados no repositório (RNF07). Qualquer mudança de esquema ou de regra entra como uma nova migração na mesma PR da issue. Uma instância vazia reproduz o esquema inteiro aplicando esses arquivos em ordem; hoje o arquivo inicial é `1792539204_create_trace_collections.js` (I-03).

Cada arquivo tem uma função de subida e uma de descida (`migrate((app) => {...}, (app) => {...})`). Nunca edite nem renomeie uma migração já aplicada na produção: o PocketBase registra o nome do arquivo, então um arquivo renomeado roda de novo e falha (por exemplo, "Collection name must be unique"). Crie outra.

### Gerar uma migração

Como `pb_migrations/` deste checkout é a pasta que a produção carrega (veja [Instância](#instância)), **escreva e teste a migração numa cópia** e só depois copie o arquivo completo para o repositório. O binário baixado pelos testes serve para isso (rode `npm test` uma vez para baixá-lo). Os comandos abaixo partem de `backend/`:

```bash
SCRATCH=$(mktemp -d) && cp -r pb_migrations pb_hooks "$SCRATCH" && echo "$SCRATCH"
```

```bash
.pocketbase/0.40.5/pocketbase migrate create nome_da_mudanca --dir="$SCRATCH/pb_data" --migrationsDir="$SCRATCH/pb_migrations"
```

O comando mostra o caminho do arquivo e pergunta `(y/N)`: digite `y` e Enter. Em caso de êxito, aparece `Successfully created file ".../pb_migrations/<timestamp>_nome_da_mudanca.js"`, e o arquivo novo está na cópia, ao lado do inicial. O prefixo é o horário Unix em segundos; ele define a ordem de aplicação. O modelo gerado usa `//` e 2 espaços: reescreva com os padrões do projeto (4 espaços, comentários `/* */` em inglês, `/** */` para documentar). Use a API de migrações da v0.23+ (`app.findCollectionByNameOrId`, `app.save`, `Collection`, `fields.add`).

Também é possível alterar o esquema pelo painel `/_/` de uma instância **local** (nunca da produção) e usar o arquivo que o PocketBase grava sozinho (`--automigrate`, ligado por padrão) como ponto de partida, ou `migrate collections` para um retrato do esquema atual. Revise o arquivo antes de commitar, porque ele precisa funcionar também em uma instância vazia.

### Aplicar e reverter

```bash
.pocketbase/0.40.5/pocketbase migrate up --dir="$SCRATCH/pb_data" --migrationsDir="$SCRATCH/pb_migrations"
```

- `migrate up` aplica só as migrações novas; rodar de novo responde "No new migrations to apply". O `serve` já aplica as pendentes ao iniciar.
- `migrate down 1` reverte a última migração aplicada (pede confirmação). A reversão falha se houver registros nas coleções que seriam apagadas.
- Na produção não há comando manual: copie o arquivo para `backend/pb_migrations/` neste checkout, faça merge e reinicie o contêiner pelo Coolify. A migração roda no restart.

Alterar coleções pelo painel da **produção** grava um arquivo novo direto em `backend/pb_migrations/` por causa do bind mount, fora de qualquer branch. Evite; se acontecer, revise e commite o arquivo, ou apague-o.

### Testar em uma instância vazia

`tests/migrations.test.js` (parte do `npm test`) cria uma pasta de dados vazia, aplica todas as migrações versionadas, confirma que uma segunda aplicação não faz nada e que a última migração pode ser revertida e reaplicada. `tests/collections.test.js` confere o esquema resultante (campos, enums, relações). Para ver à mão, use os comandos acima numa cópia nova.

## API Rules

A migração `1792601121_set_base_api_rules.js` (I-05) é a linha de base de acesso por perfil. Uma regra `null` significa "só superuser".

| Coleção                                | Listar e ver                      | Criar                                    | Editar                                    | Excluir     |
| -------------------------------------- | --------------------------------- | ---------------------------------------- | ----------------------------------------- | ----------- |
| `users`                                | o próprio usuário; supervisor: todos | `null` (I-11)                         | `null` (I-11)                             | `null`      |
| `vehicles`                             | qualquer usuário autenticado      | supervisor                               | supervisor, sem alterar o `odometer` (RB09) | supervisor |
| `routes`, `fuels`, `oils`, `repairs`   | o autor; supervisor: todos        | autenticado, autor definido pelo servidor | `null` (I-18, I-31)                      | `null` (RB17) |
| `complaints`                           | o autor da `route_current`; supervisor: todos | só quem é o usuário da `route_current` | `null` (I-27)                      | `null` (RB17) |

- O autor de `routes`, `fuels`, `oils` e `repairs` é gravado por `pb_hooks/author.pb.js` a partir do usuário autenticado. O `user` enviado no corpo é descartado.
- Uma listagem sem permissão responde `200` com a lista vazia, e uma visualização, `404`. Regra `null` responde `403`.
- Um motorista só enxerga as próprias rotas, então a checagem de "veículo já em rota aberta" feita pelo app (RB01) não vê rotas de outros motoristas. Quem garante a regra é o servidor (I-18).

### Usuário inativo (RB18)

A migração `1792611533_block_inactive_users.js` (I-07) bloqueia o usuário desativado em duas frentes:

- A `authRule` de `users` é `active = true`: o login de quem está inativo responde `403`, e só depois de a senha estar correta (com senha errada continua `400`, igual a um e-mail desconhecido). O `auth-refresh` também responde `403`.
- Toda regra não nula das tabelas acima ganha o prefixo `@request.auth.active = true && (...)`. É isso que corta uma sessão aberta antes da desativação: o token continua válido, mas nenhuma regra o aceita mais.

Com a regra falhando, a resposta depende da operação: listagem `200` com a lista vazia, visualização `404`, criação `400` e edição ou exclusão `403` ou `404`. Só o login e o `auth-refresh` respondem `403` de forma confiável, por isso o app confere a sessão com `auth-refresh` quando volta ao primeiro plano. Reativar o usuário devolve o acesso com o mesmo token. Testes em `tests/inactive-user.test.js`.

Antes de aplicar na produção, confira que os usuários existentes têm `active = true`: a migração tranca quem estiver como `false`.

## Atualizar a versão

Antes de subir a versão do PocketBase, leia as notas de release (<https://github.com/pocketbase/pocketbase/releases>). Mudanças na API de migrações ou de hooks quebram o que está em `pb_migrations` e `pb_hooks`. Depois de atualizar, atualize também a versão neste arquivo e no `CLAUDE.md`.

## Testes

Os testes de API ficam em `backend/tests` e rodam com Node (22 ou superior), sem instalar dependências:

```bash
cd backend && npm test
```

A cada execução, cada arquivo de teste sobe um PocketBase descartável (pasta temporária, porta livre, superadmin próprio) com cópias de `pb_migrations` e `pb_hooks`, faz requisições HTTP como um cliente qualquer e desliga tudo no fim. Os testes só falam com `127.0.0.1`, nunca com a produção, e não escrevem nada em `pb_migrations` nem em `pb_hooks`.

Na primeira execução o binário do PocketBase (a mesma versão da produção) é baixado para `backend/.pocketbase/`, ignorado pelo git, com conferência do SHA-256. Isso exige `unzip` e acesso à internet.

Para testar uma feature nova:

1. Crie `tests/<assunto>.test.js` e copie o começo de `tests/collections.test.js` (sobe a instância no `before` e a desliga no `after`).
2. Escreva um `test` por critério de aceite e por RB da issue, com o RB no nome.
3. Rode `npm test` e confira que o teste falha antes da implementação.
4. Implemente a migração ou o hook e rode de novo até passar.

Os helpers em `tests/helpers` cobrem o cliente HTTP, o login por coleção e as fábricas de dados (`createFactories`). Ao atualizar a versão do PocketBase, atualize também `POCKETBASE_VERSION` em `tests/helpers/binary.js`.
