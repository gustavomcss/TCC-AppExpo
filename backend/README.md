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
