# Capturas de tela e dados de demonstração

Capturas do app para os capítulos 5 e 6 do TCC. Uma pasta por sistema: `ios/` (iPhone XS, Expo Go) e `android/` (Galaxy S25 FE, Android 17). As duas são feitas (o critério da issue #43 pede Android e iOS) e recebem **os mesmos arquivos, com o mesmo nome**, para as telas poderem ser postas lado a lado no texto. Servem de figuras dos capítulos 5 (desenvolvimento) e 6 (resultados) do TCC: mostram as telas implementadas e o fluxo de uso, nos dois sistemas.

As 28 capturas foram feitas nos dois aparelhos em 9 e 10/11/2026 (iPhone XS em `ios/`, `.png`; Galaxy S25 FE em `android/`, `.jpg`, porque o Samsung salva em JPEG). A lista abaixo diz o que cada captura mostra. Os dados que aparecem nas telas, com o plano de cada captura e a conta a usar, estão em [Dados de demonstração](#dados-de-demonstração).

## Preparação

1. Crie os dados fictícios e entre com as contas de demonstração, como em [Dados de demonstração](#dados-de-demonstração) (o script cria o elenco, a frota, as rotas, as denúncias e os registros; a coluna "Conta" abaixo usa os nomes de lá: Carlos, Juliana, Rafael e Renata).
2. Capture com a fonte do sistema no tamanho normal, no tema claro, com a barra de status limpa (bateria cheia, sem notificações). Em retrato, tela inteira, sem moldura do aparelho.
3. Formato PNG, sem edição. Use a captura nativa de cada aparelho (iPhone: botão lateral e aumentar volume; Galaxy S25 FE: botão lateral e diminuir volume). Passe os arquivos para o computador (iPhone: AirDrop, iCloud ou cabo; Android: cabo ou Drive) e salve em `ios/` e `android/`, **com o mesmo nome em cada pasta**.
4. Faça as duas rodadas com os mesmos dados e o mesmo passo a passo, uma por aparelho, para as telas ficarem lado a lado. **Preencha os formulários, mas não os envie** (as telas de saída, abastecimento, óleo, manutenção e edição): assim os dados ficam iguais para o segundo aparelho e para a apresentação.
5. Não confirme as ações de aprovar, reprovar e encerrar: mudariam os contadores. Cancele os diálogos.
6. Ao terminar, mantenha os dados fictícios para a apresentação ou apague-os com `--clean` (ver [Dados de demonstração](#dados-de-demonstração)).

## Nome dos arquivos

`NN-tela-variação.png` no iOS e `NN-tela-variação.jpg` no Android, com `NN` a ordem abaixo e tudo em minúsculas e sem acento. Exemplo: `04-saida-formulario.png`. O nome-base é igual nas duas pastas.

## Lista de telas

| NN  | Arquivo                       | Tela                                                                                    | Conta       | Feito |
| --- | ----------------------------- | --------------------------------------------------------------------------------------- | ----------- | ----- |
| 01  | `01-login.png`                | Login (e, se couber, o diálogo "Não foi possível entrar")                               | —          |       |
| 02  | `02-servicos-motorista.png`   | Serviços do motorista (cinco cards operacionais)                                        | Carlos     |       |
| 03  | `03-servicos-supervisor.png`  | Serviços do supervisor, com os contadores nos cards administrativos                     | Renata     |       |
| 04  | `04-saida-formulario.png`     | Registrar saída, preenchido                                                             | Rafael     |       |
| 05  | `05-saida-veiculos.png`       | Folha de veículos com um "Indisponível"                                                 | Rafael     |       |
| 06  | `06-retorno.png`              | Registrar retorno (cartão "Rota aberta" e formulário)                                   | Carlos     |       |
| 07  | `07-denuncia-formulario.png`  | Denúncia de km com a foto do painel anexada                                             | Juliana    |       |
| 08  | `08-denuncia-registrada.png`  | Denúncia registrada, situação pendente                                                  | Carlos     |       |
| 09  | `09-abastecimento.png`        | Abastecimento, preenchido                                                               | Rafael     |       |
| 10  | `10-troca-de-oleo.png`        | Troca de óleo, preenchida                                                               | Rafael     |       |
| 11  | `11-manutencao.png`           | Manutenção, preenchida                                                                  | Rafael     |       |
| 12  | `12-historico-rotas.png`      | Histórico, módulo Rotas, com um card com denúncia aprovada                              | Rafael     |       |
| 13  | `13-historico-servicos.png`   | Histórico, módulo Abastecimentos (card com o lápis de edição)                           | Rafael     |       |
| 14  | `14-edicao-registro.png`      | Edição de um registro próprio                                                           | Rafael     |       |
| 15  | `15-usuario.png`              | Aba Usuário                                                                             | Rafael     |       |
| 16  | `16-motoristas-lista.png`     | Gestão de motoristas, lista                                                             | Renata     |       |
| 17  | `17-motorista-detalhe.png`    | Edição do motorista                                                                     | Renata     |       |
| 18  | `18-veiculos-lista.png`       | Gestão de veículos, lista com as duas linhas de chips                                   | Renata     |       |
| 19  | `19-veiculo-detalhe.png`      | Edição do veículo ("Km atual" só para leitura)                                          | Renata     |       |
| 20  | `20-revisao-lista.png`        | Revisão de denúncias, lista                                                             | Renata     |       |
| 21  | `21-revisao-detalhe.png`      | Detalhe da denúncia pendente, com a foto e a barra "Aprovar" e "Reprovar"               | Renata     |       |
| 22  | `22-revisao-confirmacao.png`  | Diálogo de confirmação de "Aprovar"                                                     | Renata     |       |
| 23  | `23-encerramento-lista.png`   | Encerramento de rotas, lista                                                            | Renata     |       |
| 24  | `24-encerramento-detalhe.png` | Detalhe da rota aberta, com o aviso "Encerrar sem retorno"                              | Renata     |       |
| 25  | `25-relatorio-financeiro.png` | Relatórios, financeiro, com os gráficos                                                 | Renata     |       |
| 26  | `26-relatorio-km.png`         | Relatórios, km rodados                                                                  | Renata     |       |
| 27  | `27-relatorio-denuncias.png`  | Relatórios, denúncias                                                                   | Renata     |       |
| 28  | `28-pdf-financeiro.png`       | Primeira página do PDF financeiro aberto (captura do PDF, não da folha de compartilhar) | Renata     |       |

Com os dados fictícios, a tela 05 mostra três veículos "Indisponível"; a 12 traz o card com "Denúncia aprovada"; a 21 traz a foto do painel.

Se faltar tempo, as indispensáveis para o capítulo de desenvolvimento são 02, 03, 04, 06, 07, 12, 21, 25 e 28.

## Dados de demonstração

Plano e descrição do banco fictício que alimenta as capturas de tela do TCC (e a apresentação). As subseções abaixo dizem como deixar os dados de prontidão, quem é o elenco, a frota, o volume, o mapa das capturas e o passo a passo na produção.

Plano e descrição do banco fictício que alimenta as capturas de tela do TCC (e a apresentação). O objetivo é que cada tela tenha o que mostrar: listas com volume suficiente para rolar e filtrar, os três estados de uma denúncia, rotas abertas, encerrada e finalizadas, veículos de todos os tipos (um inativo), um motorista inativo e seis meses de custos para os gráficos dos relatórios.

Os dados são criados pelo script [`backend/seed/seed-demo.mjs`](../../../backend/seed/seed-demo.mjs). Ele passa pelos fluxos reais (a rota é aberta e finalizada, a denúncia é registrada e aprovada ou reprovada), então o servidor aplica todas as regras e correções de km, e os números das telas são os que o sistema de fato produziria. O script foi executado e conferido numa instância descartável do PocketBase; **não foi executado na produção**.

### Receita rápida: deixar os dados de prontidão

Os dados ficam sempre a um comando de distância: apagar, recriar ou renovar as datas, na produção ou numa instância local. Os comandos rodam em `backend/` (Node 22 ou mais novo e ImageMagick, `convert`, instalados). O servidor é o da `PB_URL` (por padrão, a produção, `pb.wizecode.com.br`).

```bash
cd backend
npm run seed          # cria os dados de demonstração (recusa se já existem)
npm run seed:clean    # apaga só o que o script criou
npm run seed:reset    # apaga e cria de novo, com as datas contadas a partir de hoje
```

- **Quando usar o `seed:reset`:** antes de uma apresentação (as datas são relativas ao dia da execução: sem isso, "há 3 dias" envelhece), depois de testes que sujaram os dados ou para voltar ao estado original.
- **O que ele pergunta:** o e-mail e a senha do superadmin e a senha das contas de demonstração (nada é gravado). Num servidor que não é a máquina local, pede antes que você digite `sim`. Para não digitar, exporte `SU_EMAIL`, `SU_PASS` e `DEMO_PASSWORD` só naquele terminal, e use `-- --yes` para pular a confirmação (por exemplo `npm run seed:reset -- --yes`).
- **Outros ajustes:** `PB_URL` aponta para outro servidor (por exemplo `http://127.0.0.1:8090`), `DEMO_DOMAIN` muda o domínio dos e-mails (padrão `trace.com`) e `HOOKS_DIR` muda a pasta de hooks que o servidor observa.
- **Como funciona:** o script copia um hook temporário (`backend/seed/seed_backdate.pb.js`, que só aceita superusuário) para `backend/pb_hooks`, espera o servidor carregá-lo e o **remove ao terminar, mesmo com erro ou Ctrl+C**, porque a data de criação é sempre do servidor (RNF05) e só o hook consegue datar os registros no passado. O PocketBase reinicia por alguns segundos quando o hook entra e sai: espere antes de abrir o app ou de rodar outro comando.
- **O que ele nunca apaga:** o `--clean` e o `--reset` só removem os 7 e-mails exatos do elenco (`nome.sobrenome@trace.com`), os 8 veículos pelas placas da frota e os registros desses usuários. As contas de teste (`supervisor.a@trace.com.br` etc.) e qualquer outro dado ficam como estão. Se alguém criou registros de outro usuário num veículo de demonstração, esse veículo fica (o script avisa).
- **Se falhar no meio:** rode `npm run seed:clean` e depois `npm run seed`.
- **Para usar sem tocar a produção:** suba um PocketBase local (ver "Alternativa: PocketBase local" mais abaixo) e rode com `PB_URL=http://127.0.0.1:8090 HOOKS_DIR=...`.

### Elenco

Todos os usuários usam o domínio `trace.com` (nome.sobrenome@trace.com; mude com `DEMO_DOMAIN`) e a mesma senha, que você escolhe ao rodar o script (não fica no repositório). O `--clean` apaga só estes endereços exatos, nunca as contas de teste como `supervisor.a@trace.com.br`.

| Usuário                 | E-mail                                  | Cargo      | Papel nas capturas                                                            |
| ----------------------- | --------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| Renata Albuquerque      | `renata.albuquerque@trace.com`  | supervisor | Todas as telas administrativas e os relatórios                                |
| Rafael Tavares          | `rafael.tavares@trace.com`      | motorista  | Sem rota aberta, com histórico e registros recentes: saída, registros, Histórico e edição |
| Carlos Menezes          | `carlos.menezes@trace.com`      | motorista  | Rota aberta **com denúncia pendente**: Serviços, retorno, denúncia registrada |
| Juliana Prado           | `juliana.prado@trace.com`       | motorista  | Rota aberta **sem denúncia**: formulário de denúncia                          |
| Anderson Cavalcante     | `anderson.cavalcante@trace.com` | motorista  | Rota aberta há 3 dias com denúncia pendente: aparece no Encerramento e na Revisão |
| Fernanda Lopes          | `fernanda.lopes@trace.com`      | motorista  | Denúncia reprovada e a rota encerrada pelo supervisor                         |
| Patrícia Nogueira       | `patricia.nogueira@trace.com`   | motorista  | **Inativa**: aparece com o badge "Inativo" (e não consegue entrar)            |

### Frota

| Placa      | Tipo      | Modelo            | Situação | Observação                                        |
| ---------- | --------- | ----------------- | -------- | ------------------------------------------------- |
| `RTK-3C21` | carro     | Fiat Argo         | ativo    | Veículo principal do Rafael; tem a denúncia aprovada |
| `PLM-7E58` | carro     | Vw Gol            | ativo    | Denúncia reprovada e rota encerrada               |
| `HBN-5A90` | van       | Renault Master    | ativo    | Em rota (Carlos), indisponível para nova saída    |
| `KDR-2G14` | van       | Mercedes Sprinter | ativo    | Em rota (Juliana), indisponível                   |
| `MJX-8D37` | caminhão  | Mercedes Atego    | ativo    | Livre                                             |
| `TQZ-1B66` | caminhão  | Vw Delivery       | ativo    | Em rota (Anderson), indisponível                  |
| `WNV-6H09` | moto      | Honda Cg 160      | ativo    | Livre                                             |
| `GCS-9J72` | moto      | Yamaha Factor     | **inativo** | Tem registros, então foi inativado (RB12)      |

Os modelos estão escritos como o app os grava (primeira letra de cada palavra em maiúscula, o resto em minúsculas).

### Volume e linha do tempo

Seis meses de uso, com datas relativas ao dia em que o script roda (a data de cada registro é ajustada no servidor por um hook temporário, porque a data de criação é sempre do servidor, RNF05).

| Item                  | Quantidade (varia um pouco com o dia da execução) | Observação                                                                              |
| --------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| Rotas finalizadas     | 110                   | Pelo menos 13 por veículo; o Histórico passa de uma página (10 por página)              |
| Rotas abertas         | 3                     | Carlos (hoje), Juliana (ontem à tarde) e Anderson (há 3 dias)                           |
| Rota encerrada        | 1                     | Fernanda, há 16 dias, encerrada pelo supervisor dois dias depois (fica fora do Histórico) |
| Denúncias             | 13                    | 5 aprovadas, 6 reprovadas e 2 pendentes                                                 |
| Abastecimentos        | 57                    | Combustível adequado ao tipo do veículo                                                 |
| Trocas de óleo        | 25                    |                                                                                         |
| Manutenções           | 16                    |                                                                                         |
| Custo total           | cerca de R$ 41 mil    | Abastecimento 43%, troca de óleo 19%, manutenção 38% (valores variam um pouco por data) |

**Contadores esperados em Serviços (supervisor):** Encerramento de rotas **3** e Revisão de denúncias **2**. Para o motorista Carlos: "Aberta" no card Rota e "Pendente" no card Denúncia de km.

**Histórias roteirizadas** (o resto do histórico é gerado com variação, mas segue as mesmas regras):

1. **Denúncia aprovada (Rafael, `RTK-3C21`, há 12 dias):** o km de saída da rota e o km de retorno da rota anterior foram corrigidos. O card no Histórico mostra "Denúncia aprovada" e o km corrigido (RB06).
2. **Denúncia reprovada (Fernanda, `PLM-7E58`, há 10 dias):** nenhum km mudou (RB07).
3. **Rota encerrada pelo supervisor (Fernanda, `PLM-7E58`, há 16 dias):** só aparece no Encerramento de rotas, nunca no Histórico (RB10, RB15).
4. **Duas denúncias pendentes (Carlos e Anderson):** entram na Revisão. A rota de Anderson mostra "Denúncia pendente" no Encerramento, e o encerramento dela é recusado até a revisão (RB21).
5. **Rota de Juliana sem denúncia:** é a que serve para a tela de Encerramento (detalhe) e para o formulário de denúncia.
6. **Rafael com registros recentes:** abastecimentos, ao menos uma troca de óleo e manutenções (uma delas, troca de pastilhas de freio) nas últimas duas semanas, para o Histórico e a edição (o lápis só aparece nos registros do próprio usuário).

As fotos das denúncias são imagens geradas (um painel com o odômetro mostrando o km informado), em 4:3, como a foto real.

### Mapa das capturas

| Captura                                      | Entre como | O que a tela mostra com esses dados                                                       |
| -------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| 02 Serviços do motorista                     | Carlos     | Badges "Aberta" e "Pendente"                                                              |
| 03 Serviços do supervisor                    | Renata     | Contadores 3 e 2                                                                          |
| 04, 05 Saída e folha de veículos             | Rafael     | Quatro veículos livres e três "Indisponível"; o inativo não aparece                       |
| 06 Retorno                                   | Carlos     | Cartão "Rota aberta" e o botão "Denunciar divergência de km"                              |
| 07 Denúncia (formulário)                     | Juliana    | Resumo da rota aberta e o formulário vazio, pronto para preencher                         |
| 08 Denúncia registrada                       | Carlos     | Badge "Pendente", foto e aviso da situação                                                |
| 09, 10, 11 Abastecimento, óleo, manutenção   | Rafael     | Formulários; ao registrar, o item aparece no Histórico                                    |
| 12, 13, 14 Histórico e edição                | Rafael     | Rotas com "Denúncia aprovada" na primeira página; abastecimentos com o lápis; edição     |
| 16, 17 Motoristas                            | Renata     | Seis motoristas, um "Inativo"                                                             |
| 18, 19 Veículos                              | Renata     | Oito veículos, um "Inativo", chips de situação e tipo                                     |
| 20, 21, 22 Revisão de denúncias              | Renata     | Duas pendentes e as revisadas; detalhe com a foto; diálogo de "Aprovar" (cancele)         |
| 23, 24 Encerramento                          | Renata     | Três abertas e uma encerrada; detalhe da rota da Juliana (não confirme)                   |
| 25, 26, 27, 28 Relatórios e PDF              | Renata     | Período "Últimos 6 meses": gráficos mensal e por veículo (com "Outros"), km, denúncias    |

**Cuidados durante as capturas:** não confirme "Aprovar", "Reprovar" nem "Encerrar rota" (mudariam os contadores); cancele os diálogos. Preencha os formulários de saída, abastecimento, óleo, manutenção e edição, mas **não os envie**: assim os dados ficam iguais para a segunda rodada de capturas (o outro aparelho) e para a apresentação.

### Como rodar na produção

Decisão do autor: popular a **produção** (`pb.wizecode.com.br`), para o banco já ter o uso fictício que será mostrado no TCC e na apresentação. O volume é pequeno e realista (cerca de 110 rotas em seis meses, ou 4 a 5 por semana entre seis motoristas e oito veículos, mais 13 denúncias e cerca de 100 registros de serviço), e o app já aponta para a produção, então as capturas saem direto dela.

Todos os comandos partem da raiz do checkout principal, `/home/gustavo/TCC-AppExpo`, e não de uma worktree: os arquivos do seed estão só nele. Durante o roteiro, **não troque de branch** nesse checkout, porque a pasta `backend/pb_hooks` dele é a que a produção monta.

#### Antes de começar

- **ImageMagick:** `convert -version` precisa responder (já está instalado nesta máquina).
- **Superadmin:** e-mail e senha do PocketBase de produção (o script pergunta; nada é gravado).
- **Senha das contas de demonstração:** escolha uma agora, de 8 caracteres ou mais, e **use uma senha forte**: o servidor é público e a Renata é supervisora. Anote-a, porque as capturas pedem o login com ela.

#### Passo 1: backup

No painel (`https://pb.wizecode.com.br/_/`): **Settings, Backups, Initialize new backup**. Se algo sair do esperado, o backup restaura o estado atual.

#### Passo 2: limpar os dados de teste

O script **não apaga** o que já existe, e tudo o que existir aparecerá no Histórico, nos relatórios e nas listas da Renata. Se **tudo** o que há hoje na produção é teste (rotas, veículos e registros dos seus testes, como `AAA-4301`, `BBB-4301`, `ABC-1A34` e `ZZZ-...`), apague-o pelo painel, em **Collections**, **nesta ordem**, porque os hooks recusam apagar veículo ou usuário que ainda tenha registros, mesmo para o superadmin:

1. `complaints`
2. `routes`
3. `fuels`, `oils` e `repairs`
4. `vehicles`
5. `users`: apenas os motoristas de teste (`motorista.a` e `motorista.b`), se não quiser que apareçam na lista de motoristas. **Mantenha** `supervisor.a` e `supervisor.b` (os supervisores não aparecem nas listas de motoristas) para continuar testando.

Em cada coleção, marque a caixa do cabeçalho da tabela (seleciona as linhas da página), use **Delete selected** e repita até a coleção ficar vazia. Se houver algo na produção que você quer **guardar**, não faça este passo: pule para o passo 3 e aceite que esses dados apareçam junto.

#### Passo 3: conferir o plano (nada é gravado)

```bash
DRY_RUN=1 node backend/seed/seed-demo.mjs
```

#### Passo 4: rodar o script

O script precisa, enquanto roda, de um hook temporário (`backend/seed/seed_backdate.pb.js`) que só aceita superusuário e serve para datar os registros no passado (a data de criação é sempre do servidor, RNF05). Com `--auto-hook`, o próprio script copia o hook para `backend/pb_hooks` (a pasta montada na produção, que recarrega na hora), espera o servidor carregá-lo e **o remove ao terminar, mesmo se der erro ou se você apertar Ctrl+C**. Assim o hook nunca fica na produção:

```bash
cd backend && npm run seed
```

Ele pergunta o e-mail e a senha do superadmin e a senha das contas de demonstração, e leva alguns minutos (cerca de 500 requisições). **Não interrompa.** No fim imprime o resumo (rotas, denúncias e registros). Ao remover o hook, o PocketBase reinicia por alguns segundos: espere antes de abrir o app. Se o script falhar no meio, rode `npm run seed:clean` (em `backend/`) e comece de novo: ele apaga só o que criou, e recusa rodar duas vezes seguidas sem limpar.

Se preferir o modo manual: copie o hook com `cp backend/seed/seed_backdate.pb.js backend/pb_hooks/`, rode o script **sem** `--auto-hook` e depois apague com `rm backend/pb_hooks/seed_backdate.pb.js`. Confira com `ls backend/pb_hooks`: devem restar só os oito hooks do projeto (`author`, `complaints`, `decimal_fields`, `routes`, `service_records`, `users`, `vehicle_plate`, `vehicles`).

#### Passo 5: conferir no app

Entre no app (iPhone, Expo Go, `frontend/.env` na produção) e confira:

| Entre como                                       | Deve ver                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `renata.albuquerque@trace.com`           | Em Serviços, contador **3** em "Encerramento de rotas" e **2** em "Revisão de denúncias". Seis motoristas (um "Inativo") e oito veículos (um "Inativo"). |
| `carlos.menezes@trace.com`               | Em Serviços, "Aberta" no card Rota e "Pendente" no card Denúncia de km.                                    |
| `rafael.tavares@trace.com`               | Histórico com várias páginas de rotas; uma rota com "Denúncia aprovada"; abastecimentos com o lápis.        |

As demais contas, na tabela "Elenco" acima, usam a mesma senha. Se algum número não bater, rode `npm run seed:reset` (em `backend/`).

#### Passo 6: capturas

Siga a [Lista de telas](#lista-de-telas) (ordem e nomes dos arquivos) com o "Mapa das capturas" acima. As datas são relativas ao dia da execução, então fazer as capturas logo depois do script mantém as legendas "há 3 dias", "ontem" e "hoje" coerentes. Cancele os diálogos de aprovar, reprovar e encerrar.

#### Depois do TCC

Os dados são fictícios e as contas existem de verdade na produção. Ao fim da apresentação, ou apague tudo com `npm run seed:clean` (em `backend/`), ou mantenha e **troque a senha** das contas ou desative-as pelo painel.

### Alternativa: PocketBase local

Serve para ensaiar o script sem tocar a produção. A pasta `backend/pb_hooks` é a que a produção monta, então **neste caminho não copie o hook para ela**: use uma pasta separada em `.pocketbase/` (ignorada pelo git). Se o PocketBase local ainda não existe, faça antes os passos 1 e 2 de [Rodar localmente](../../../backend/README.md#rodar-localmente).

```bash
cd backend && mkdir -p .pocketbase/hooks-demo && cp pb_hooks/*.js seed/seed_backdate.pb.js .pocketbase/hooks-demo/
```

```bash
.pocketbase/0.40.5/pocketbase serve --http=0.0.0.0:8090 --migrationsDir=pb_migrations --hooksDir=.pocketbase/hooks-demo --automigrate=false
```

Em outro terminal, na raiz:

```bash
HOOKS_DIR=backend/.pocketbase/hooks-demo PB_URL=http://127.0.0.1:8090 node backend/seed/seed-demo.mjs --auto-hook
```

Para ver no app, aponte `EXPO_PUBLIC_POCKETBASE_URL` para `http://<IP do computador>:8090` e reinicie com `npm start -- --clear` (depois volte para a URL de produção). Para recomeçar do zero, pare o servidor e apague `backend/.pocketbase/0.40.5/pb_data`.
