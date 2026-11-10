# Capturas de tela

Capturas do app para os capítulos 5 e 6 do TCC. Uma pasta por sistema: `ios/` (iPhone XS, Expo Go) e `android/` (Galaxy S25 FE, Android 17). As duas são feitas (o critério da issue #43 pede Android e iOS) e recebem **os mesmos arquivos, com o mesmo nome**, para as telas poderem ser postas lado a lado no texto. Servem de figuras dos capítulos 5 (desenvolvimento) e 6 (resultados) do TCC: mostram as telas implementadas e o fluxo de uso, nos dois sistemas.

As 28 capturas foram feitas nos dois aparelhos em 9 e 10/11/2026 (iPhone XS em `ios/`, `.png`; Galaxy S25 FE em `android/`, `.jpg`, porque o Samsung salva em JPEG). A lista abaixo diz o que cada captura mostra. Os dados que aparecem nas telas, com o plano de cada captura e a conta a usar, estão em [dados-de-demonstracao.md](dados-de-demonstracao.md).

## Preparação

1. Crie os dados fictícios e entre com as contas de demonstração, como em [dados-de-demonstracao.md](dados-de-demonstracao.md) (o script cria o elenco, a frota, as rotas, as denúncias e os registros; a coluna "Conta" abaixo usa os nomes de lá: Carlos, Juliana, Rafael e Renata).
2. Capture com a fonte do sistema no tamanho normal, no tema claro, com a barra de status limpa (bateria cheia, sem notificações). Em retrato, tela inteira, sem moldura do aparelho.
3. Formato PNG, sem edição. Use a captura nativa de cada aparelho (iPhone: botão lateral e aumentar volume; Galaxy S25 FE: botão lateral e diminuir volume). Passe os arquivos para o computador (iPhone: AirDrop, iCloud ou cabo; Android: cabo ou Drive) e salve em `ios/` e `android/`, **com o mesmo nome em cada pasta**.
4. Faça as duas rodadas com os mesmos dados e o mesmo passo a passo, uma por aparelho, para as telas ficarem lado a lado. **Preencha os formulários, mas não os envie** (as telas de saída, abastecimento, óleo, manutenção e edição): assim os dados ficam iguais para o segundo aparelho e para a apresentação.
5. Não confirme as ações de aprovar, reprovar e encerrar: mudariam os contadores. Cancele os diálogos.
6. Ao terminar, mantenha os dados fictícios para a apresentação ou apague-os com `--clean` (ver [dados-de-demonstracao.md](dados-de-demonstracao.md)).

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
