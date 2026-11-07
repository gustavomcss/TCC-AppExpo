# TRACE

App móvel (Android e iOS) de gestão operacional de frotas para pequenas e médias empresas. Trabalho de Conclusão de Curso (TCC).

Feito com React Native + Expo (TypeScript), uma única base de código para Android e iOS. O backend é um PocketBase autogerenciado.

## Requisitos

- Node.js 20.19.4 ou mais novo e npm
- App **Expo Go** no celular, compatível com o **SDK 58** (o SDK do projeto):
    - iOS: a versão atual da App Store.
    - Android: a versão atual da Play Store; se ela estiver em outro SDK, baixe a do SDK 58 em [expo.dev/go](https://expo.dev/go).
- Alternativa: emulador Android

## Como rodar

```bash
cd frontend
npm install
cp .env.example .env   # ajuste a URL do PocketBase, se necessário
npm start
```

Depois, escaneie o QR code com o Expo Go (Android) ou com a câmera (iOS), ou pressione `a` para abrir no emulador Android.

## Variáveis de ambiente

| Variável                     | Descrição                             |
| ---------------------------- | ------------------------------------- |
| `EXPO_PUBLIC_POCKETBASE_URL` | URL do PocketBase, sem barra no final |

O `.env` fica em `frontend/` e não é commitado; o `.env.example` mostra o formato. Variáveis `EXPO_PUBLIC_*` ficam visíveis no bundle do app, então não coloque segredos nelas.

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

## Estrutura

```
frontend/                App React Native + Expo
  src/screens            telas
  src/services           acesso ao PocketBase e configuração (env)
  src/components         componentes de UI reutilizáveis
  src/schemas            esquemas Zod dos formulários
backend/                 PocketBase (instância e operação em backend/README.md)
  pb_migrations/         migrações (coleções, campos, API Rules)
  pb_hooks/              hooks JS (km do veículo, correção por denúncia)
```

## Licença

Veja o arquivo [LICENSE](LICENSE).
