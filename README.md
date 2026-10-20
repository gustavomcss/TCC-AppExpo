# TRACE

App móvel (Android e iOS) de gestão operacional de frotas para pequenas e médias empresas. Trabalho de Conclusão de Curso (TCC).

Feito com React Native + Expo (TypeScript), uma única base de código para Android e iOS. O backend é um PocketBase autogerenciado.

## Requisitos

- Node.js 20.19.4 ou mais novo e npm
- App **Expo Go** no celular, compatível com o **SDK 57** (o SDK do projeto):
    - iOS: a versão atual da App Store.
    - Android: a versão atual da Play Store; se ela estiver em outro SDK, baixe a do SDK 57 em [expo.dev/go](https://expo.dev/go).
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
