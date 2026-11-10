# TRACE

App móvel (Android e iOS) de gestão operacional de frotas para pequenas e médias empresas. Trabalho de Conclusão de Curso (TCC).

Feito com React Native + Expo (TypeScript), uma única base de código para Android e iOS. O backend é um PocketBase autogerenciado.

## O que o app faz

Dois perfis entram no app, sem auto-cadastro:

- **Motorista:** registra saída e retorno de rotas, denuncia divergência de km, registra abastecimento, troca de óleo e manutenção, e vê o histórico dos próprios registros.
- **Supervisor:** faz tudo isso e ainda gerencia motoristas e veículos, revisa denúncias, encerra rotas e gera relatórios em PDF. Vê os registros de todos.

O superadmin é o superuser do PocketBase: fica fora do app, no painel `/_/`, e cria os supervisores.

## Requisitos

- Node.js 20.19.4 ou mais novo e npm (o app). Os testes do backend pedem Node 22 ou mais novo.
- App **Expo Go** no celular, compatível com o **SDK 58** (o SDK do projeto):
    - iOS: a versão atual da App Store.
    - Android: a versão atual da Play Store; se ela estiver em outro SDK, baixe a do SDK 58 em [expo.dev/go](https://expo.dev/go).
- Alternativa: emulador Android
- Para rodar o backend na sua máquina: `curl` e `unzip` (só no passo de baixar o PocketBase).

## Como rodar

O app precisa de um PocketBase para conversar. Escolha um caminho:

- **A. Backend de produção** (`https://pb.wizecode.com.br`): não há nada para subir, mas é preciso uma conta existente (não há auto-cadastro). Peça um e-mail e uma senha ao responsável pelo projeto e pule para o [passo 2](#2-rodar-o-app).
- **B. Backend local** (recomendado para quem está começando): siga o passo 1 e o 2, e use o supervisor que você mesmo criar.

### 1. Subir o PocketBase local

Os comandos partem da raiz do repositório. Detalhes, outras plataformas e como recomeçar do zero estão em [backend/README.md](backend/README.md#rodar-localmente).

```bash
cd backend
mkdir -p .pocketbase/0.40.5
```

```bash
curl -L -o .pocketbase/0.40.5/pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v0.40.5/pocketbase_0.40.5_linux_amd64.zip
```

```bash
unzip -o .pocketbase/0.40.5/pocketbase.zip pocketbase -d .pocketbase/0.40.5
```

```bash
.pocketbase/0.40.5/pocketbase superuser create admin@exemplo.com 'uma-senha-forte-123'
```

```bash
.pocketbase/0.40.5/pocketbase serve --http=0.0.0.0:8090 --migrationsDir=pb_migrations --hooksDir=pb_hooks --automigrate=false
```

No macOS, troque `linux_amd64` por `darwin_arm64` (Apple Silicon) ou `darwin_amd64`. O último comando fica rodando; use outro terminal para o resto. Ao iniciar, o PocketBase aplica sozinho todas as migrações de `backend/pb_migrations` (RNF07) e carrega os hooks de `backend/pb_hooks`. Confira:

```bash
curl -i http://127.0.0.1:8090/api/health
```

Depois crie o primeiro supervisor no painel <http://127.0.0.1:8090/_/> (entre com o superadmin acima): **Collections → users → New record**, com `email`, `password` e `passwordConfirm` (mínimo de 8 caracteres), `name`, `role = supervisor` e `active` ligado. Os motoristas e os veículos são cadastrados depois, pelo app, entrando como esse supervisor.

### 2. Rodar o app

Em outro terminal (o do PocketBase continua rodando), na raiz do repositório:

```bash
cd frontend
npm install
cp .env.example .env
```

Edite `frontend/.env` e ajuste `EXPO_PUBLIC_POCKETBASE_URL` ([tabela abaixo](#variáveis-de-ambiente)): deixe como está para a produção (caminho A) ou use o endereço do seu PocketBase local (caminho B). Depois:

```bash
npm start
```

Escaneie o QR code com o Expo Go (Android) ou com a câmera (iOS), ou pressione `a` para abrir no emulador Android. Entre com o e-mail e a senha do supervisor.

Se o celular não carregar o app pela rede local (por exemplo, rede de visitantes ou VPN), use `npm start -- --tunnel`.

## Variáveis de ambiente

| Variável                     | Descrição                             |
| ---------------------------- | ------------------------------------- |
| `EXPO_PUBLIC_POCKETBASE_URL` | URL do PocketBase, sem barra no final |

O `.env` fica em `frontend/` e não é commitado; o `.env.example` mostra o formato. Variáveis `EXPO_PUBLIC_*` ficam visíveis no bundle do app, então não coloque segredos nelas. O app lê o arquivo ao iniciar: depois de mudar a URL, reinicie o `npm start` (com `--clear` se ela não pegar).

Valores comuns:

| Onde o app roda                         | `EXPO_PUBLIC_POCKETBASE_URL`                                |
| --------------------------------------- | ----------------------------------------------------------- |
| Produção (qualquer aparelho)            | `https://pb.wizecode.com.br`                                |
| PocketBase local, celular com Expo Go   | `http://<IP do computador na rede>:8090` (mesma rede Wi-Fi) |
| PocketBase local, emulador Android      | `http://10.0.2.2:8090`                                      |
| PocketBase local, simulador iOS (macOS) | `http://127.0.0.1:8090`                                     |

## Build de distribuição (Android)

O instalável do Android (`.apk`) é gerado na nuvem pelo **EAS Build**, com o perfil `production` de `frontend/eas.json`. O perfil já traz a URL do PocketBase de produção (`https://pb.wizecode.com.br`, HTTPS) em `EXPO_PUBLIC_POCKETBASE_URL`, então o `.env` local não entra no build. Essa URL é pública; senhas e tokens não existem no pacote nem no repositório (o app guarda só o token de sessão, no aparelho). A chave de assinatura (keystore) fica guardada na conta do Expo, nunca no repositório.

Requisitos: conta gratuita em [expo.dev](https://expo.dev) e um aparelho Android.

```bash
cd frontend
npx eas-cli@latest login          # uma vez; entra com a conta do Expo
npx eas-cli@latest init           # uma vez; grava o projectId em app.json (commite)
npx eas-cli@latest build --platform android --profile production
```

Na primeira vez, aceite a criação da chave de assinatura quando o EAS perguntar. No `init`, escolha a conta que será dona do projeto (o `owner` fica gravado em `app.json`). O EAS avisa que o app usa o Expo Go para desenvolvimento: é só um aviso, porque os módulos nativos do app vêm todos no Expo Go. O build leva alguns minutos e, ao terminar, mostra um link e um QR code do `.apk`; à pergunta final, se quer instalar num emulador, responda `n`. Para instalar:

1. Abra o link (ou baixe o `.apk` em expo.dev, na página do build) no aparelho Android.
2. Se o Android pedir, permita a instalação de apps desta origem ("Instalar apps desconhecidos") para o navegador ou o gerenciador de arquivos usado.
3. Abra o TRACE e entre com uma conta do sistema. O app conecta direto à produção; não há servidor de desenvolvimento.

Para gerar uma nova versão, aumente `android.versionCode` (e, se quiser, `version`) em `frontend/app.json` e rode o comando de build de novo. Um `.aab` para a Play Store usaria `"buildType": "app-bundle"` em outro perfil; não faz parte do escopo do TCC.

### iOS

Não há instalável para iOS: ele exige o Apple Developer Program (US$ 99 por ano), que o projeto não tem. O iOS é entregue pelo **Expo Go (SDK 58)**: a pessoa clona o repositório, copia `frontend/.env.example` para `frontend/.env` (já aponta para a produção), roda `npm start` (de fora da rede do computador, `npm start -- --tunnel`) e abre o QR code no Expo Go. O servidor de desenvolvimento precisa ficar ligado enquanto o app é usado, e o app mostra o ícone e o nome do TRACE só dentro do Expo Go, não na tela inicial. Uma publicação por EAS Update não resolve: desde maio de 2026 o Expo Go só abre atualizações de projetos que o usuário possui. Com a conta paga, o caminho seria `eas build --platform ios --profile production` (o `bundleIdentifier` já está em `app.json`).

Android e iOS usam o mesmo backend de produção, então os dados criados num aparelho aparecem no outro depois de recarregar a tela. Como não há auto-cadastro e cada motorista e cada veículo só podem ter uma rota aberta, use contas e veículos de demonstração separados.

## Scripts

Rodam dentro de `frontend/`.

| Comando                | O que faz                            |
| ---------------------- | ------------------------------------ |
| `npm start`            | Inicia o servidor de desenvolvimento |
| `npm run android`      | Abre no Android                      |
| `npm run ios`          | Abre no iOS (exige macOS ou Expo Go) |
| `npm run lint`         | ESLint                               |
| `npm run typecheck`    | Verificação de tipos (`tsc`)         |
| `npm run format`       | Formata com Prettier                 |
| `npm run format:check` | Confere a formatação                 |

## Testes

Os testes de API do backend sobem um PocketBase descartável (nunca falam com a produção), aplicam as migrações e exercitam cada API Rule e cada hook. Sem dependências para instalar; precisam de Node 22 ou mais novo:

```bash
cd backend
npm test
```

Na primeira execução eles baixam o PocketBase para `backend/.pocketbase/`. O app tem `npm run typecheck` e `npm run lint` (veja [Scripts](#scripts)).

## Estrutura

```
frontend/                App React Native + Expo
  src/screens            telas
  src/services           acesso ao PocketBase e configuração (env)
  src/components         componentes de UI reutilizáveis
  src/contexts           estado global (sessão e avisos)
  src/navigation         abas, pilha e módulos por perfil
  src/schemas            esquemas Zod dos formulários e máscaras
  src/theme              tokens de design (cores, espaçamentos, fontes)
backend/                 PocketBase
  pb_migrations/         migrações (coleções, campos, índices, API Rules)
  pb_hooks/              hooks JS (autor, decimais, veículos, placas, rotas, denúncias, registros, usuários)
  tests/                 testes de API (npm test)
  seed/                  dados de demonstração para os relatórios
docs/                    roteiro de testes, testes em Android e iOS e insumos do TCC (docs/tcc)
```

## Documentação

- [backend/README.md](backend/README.md): instância de produção, rodar o PocketBase localmente, migrações, **resumo das API Rules e dos hooks por coleção**, regras detalhadas e testes do backend.
- [docs/requisitos-final.md](docs/requisitos-final.md): especificação de requisitos (RF, RNF e RB) conforme implementado, com limitações e rastreabilidade.
- [docs/roteiro-de-testes.md](docs/roteiro-de-testes.md): roteiro de testes das regras de negócio e dos fluxos críticos.
- [docs/testes-android-ios.md](docs/testes-android-ios.md): testes de usabilidade em Android e iOS.
- [docs/tcc/balanco-final.md](docs/tcc/balanco-final.md): balanço do desenvolvimento, RF com ressalva ligados às issues e auditoria dos critérios de aceite.
- [docs/tcc/insumos.md](docs/tcc/insumos.md): insumos para os capítulos 5 e 6 do TCC (atendimento aos requisitos, resultados dos testes, capturas de tela e diagramas).

## Licença

Veja o arquivo [LICENSE](LICENSE).
