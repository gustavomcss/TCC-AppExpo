# Testes em Android e iOS e ajustes de usabilidade

Issue #40 (`[RNF01, RNF08] Testes em Android e iOS e ajustes de usabilidade`). Este documento alimenta o capítulo de resultados do TCC. Ele reúne o roteiro de uma passada única, nos mesmos passos, em dois aparelhos (iPhone XS e Galaxy S25 FE), e o registro do que foi achado. É um teste funcional e de interface conduzido pelo autor, sem usuários finais e sem medição de desempenho.

**Estado:** passada concluída em 5 a 7/11/2026, nos dois aparelhos (T01 a T18). Os problemas de maior impacto foram corrigidos e conferidos nos aparelhos (parte 9); o que sobrou está nas limitações (parte 10). O S25 FE roda o Android 17.

Como foi conduzida: a passada seguiu a parte 3 (preparação) e a parte 4 (testes) na ordem, nos dois aparelhos ao mesmo tempo (a regra de contas está na parte 3). O resultado de cada teste está na parte 5 e o que foi achado, na parte 9; a parte 6 registra o formato em que os achados foram anotados.

## 1. Aparelhos

| Aparelho              | Sistema | Versão do sistema | Como roda        | Navegação (Android)                 | Quem e quando          |
| --------------------- | ------- | ----------------- | ---------------- | ----------------------------------- | ---------------------- |
| iPhone XS             | iOS     | 18.7.11           | Expo Go (SDK 58) | —                                   | Autor, 5 a 7/11/2026   |
| Samsung Galaxy S25 FE | Android | 17                | Expo Go (SDK 58) | gestos (T02) e 3 botões (T17 e T18) | Autor, 5 a 7/11/2026   |

A versão e a navegação de cada um foram registradas antes de começar (Ajustes, Sobre o telefone). A passada foi feita nestes dois aparelhos. O iPhone XS (cerca de 375 dp) é o mais estreito, então é nele que o layout apertado aparece; o S25 FE é o mais largo. Telas mais estreitas, outras versões de sistema e iPad não foram testados e constam nas limitações.

## 2. O que já foi visto em cada sistema

O que já estava confirmado antes da passada, para ela não repetir esses pontos e para saber onde olhar com mais cuidado. As células trazem o estado final, com a data da confirmação quando houve uma depois da passada.

| Item                                                                  | iOS                     | Android                                 |
| --------------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| Funcionalidades das issues #6 a #38                                   | Testadas a cada issue   | Testadas a cada issue                   |
| Teclado sobre os campos de baixo (`react-native-keyboard-controller`) | Confirmado              | Confirmado                              |
| Campo "Modelo" sem letra duplicada                                    | Confirmado              | Confirmado                              |
| `capitalize` nos outros campos de texto livre                         | Confirmado pelo autor   | Confirmado pelo autor                   |
| Ícones da barra de status escuros sobre o cabeçalho branco            | Sem problema            | Corrigido e confirmado na passada       |
| PDF financeiro (gerar, numerar, Geom, gráficos, quebra de página)     | Conferido               | Conferido                               |
| PDF de km e de denúncias                                              | Conferido               | Conferido em 7/11 (exportado no S25 FE) |
| Indicador de carregamento do botão "Gerar PDF"                        | Conferido em 7/11 (T16) | Conferido em 7/11 (T16)                 |
| Barra de abas ao tocar na busca do Histórico                          | Sem problema            | Subia junto com o teclado; reverificado em 10/11, comportamento normal |

## 3. Preparação

1. **Servidor do app:** no computador, `cd frontend && npx expo start` (ou `npx expo start --tunnel` se o celular não alcançar a rede). Em cada aparelho, abrir o Expo Go (SDK 58) e escanear o QR. O app aponta para a produção (`pb.wizecode.com.br`).
2. **Contas e aparelhos:** os dois aparelhos fazem o mesmo passo ao mesmo tempo, cada um com a sua conta, para não disputarem o mesmo registro. **O S25 FE é sempre o A** (`motorista.a`, `supervisor.a`) e **o iPhone XS é sempre o B** (`motorista.b`, `supervisor.b`), todos `@trace.com.br` (contas de teste do desenvolvimento, já removidas da produção). Onde o passo diz "motorista" ou "supervisor", entre com a conta do seu aparelho.
3. **Veículos descartáveis, km 1000, tipo à escolha** (cadastrar pelo app como supervisor, ou pelo painel): `ZZZ-4A01` (rota aberta do `motorista.a` na Fase 1; o A o usa nos registros das fases seguintes), `ZZZ-4A02` (rota aberta do `supervisor.a` na Fase 1; o B o usa nos registros) e `ZZZ-4B01` (da rota que o B prepara para o encerramento). Um veículo por aparelho evita que a denúncia de um atrapalhe a do outro.
4. **Fotos:** deixe uma foto qualquer na galeria do aparelho, para a denúncia e para a foto do perfil.
5. **Ordem:** siga as fases na ordem, nos dois aparelhos. Quando o passo disser "só A" ou "só B", o outro aparelho espera e confere o efeito na lista. As fases trocam de conta (Sair e entrar de novo), e isso já faz parte do teste.
6. **Limpeza no fim:** apagar pelo painel do PocketBase as rotas, denúncias e registros dos veículos `ZZZ-4...` e `ZZZ-4C...`, depois os veículos. Apagar também os motoristas `teste.40a` e `teste.40b`, se ainda existirem. Não deixar motorista nem veículo de teste na produção.

**O que olhar em toda tela (vale para todos os testes):**

- **Layout:** nada cortado, sobreposto ou fora da tela; texto legível; nada escondido atrás da barra de status, do notch, da barra de abas ou da barra de gestos e botões do Android.
- **Navegação:** cada botão leva aonde diz; voltar volta para a tela anterior; nenhum beco sem saída.
- **Formulário:** poucos campos, rótulos que se entendem sozinhos, mensagem de erro que diz o que fazer, e nenhuma mensagem em inglês.
- **Toque:** botões e chips fáceis de acertar com o polegar.
- **Fluidez:** animações suaves (folhas, toast, "Observação" que abre e fecha), sem tranco nem tela branca.

## 4. Roteiro

Cada teste tem os passos e, em **Avaliar**, o que observar além do funcionamento. As fases dizem com qual conta fazer.

### Fase 1: motorista (A e B)

Os dois aparelhos fizeram os mesmos passos de motorista. Ficaram abertas a rota e a denúncia pendente do `motorista.a` (`ZZZ-4A01`) e do `supervisor.a` (`ZZZ-4A02`), usadas nas fases 2 a 4.

**T01. Login**

1. Abra o app sem sessão (se houver, "Sair" na aba Usuário).
2. Toque em "Entrar" sem preencher: cada campo mostra seu erro.
3. Digite um e-mail válido e uma senha errada e toque em "Entrar": abre o diálogo "Não foi possível entrar". Toque em "Entendi".
4. Toque no campo de senha: o campo, o botão "Entrar" e a nota "Sem acesso? Peça ao supervisor da sua empresa." ficam acima do teclado. Toque no olho: a senha aparece e some.
5. Entre com o motorista do seu aparelho.

**Avaliar:** o teclado não cobre campo, botão nem a nota; a fonte Geom carregou (não é a do sistema); os ícones da barra de status (hora, bateria) estão escuros e legíveis sobre o fundo claro.

**T02. Abas e barras do sistema**

1. Toque nas três abas: Histórico, Serviços e Usuário.
2. No Android, observe a barra de abas em relação à barra de gestos ou de botões do sistema.

**Avaliar:** ícones e rótulos alinhados; cabeçalho só com texto; a barra de abas não fica coberta pela barra do sistema nem solta acima dela; os ícones da barra de status são escuros. **No Android, anote se a navegação do aparelho é por gestos ou por 3 botões.**

**T03. Serviços (motorista)**

1. Abra a aba Serviços.

**Avaliar:** cinco cards (Rota, Denúncia de km, Abastecimento, Troca de óleo, Manutenção) sob "Operacionais" e **nenhum** administrativo; ícone no topo à esquerda de cada card; descrições inteiras, sem corte.

**T04. Registrar saída**

1. Serviços, "Rota". Toque no campo "Veículo": a folha desliza de baixo. Toque fora dela: fecha. Abra de novo e escolha `ZZZ-4A0x` (o do seu aparelho).
2. O "Km atual" aparece preenchido e não se edita.
3. Toque em "Registrar saída" sem itinerário: erro no campo.
4. Digite o itinerário `entrega NO centro`. Toque fora do campo: vira `Entrega no centro`.
5. Toque em "Observação (opcional)": o contador mostra `0/500`; com o teclado aberto, o campo não fica atrás dele.
6. Toque em "Registrar saída": abre "Registrar saída?". Toque em "Cancelar": volta ao formulário com o que você digitou. Repita e confirme.
7. O toast "Saída registrada." aparece acima da barra de baixo e some sozinho em 5 s (ou ao toque). Você volta a Serviços.

**Avaliar:** a folha, o toast e a barra de ação sem sobreposição; o card "Rota" ganha o badge preto "Aberta" no canto; a barra "Registrar saída" não é coberta pela barra do sistema (Android).

**T05. Denunciar divergência de km**

1. Serviços, "Denúncia de km": aparece o resumo da rota aberta.
2. Em "Km informado", digite `100500`: o campo mostra `1.005,00`.
3. Toque em "Registrar denúncia" sem foto: erro "Anexe uma foto do painel.".
4. Toque em "Adicionar foto" e depois em "Tirar foto". **Na primeira vez o sistema pede a permissão da câmera:** aceite (veja a observação abaixo sobre negar). Tire a foto.
5. A miniatura aparece ao lado do nome do arquivo e de "Câmera · tamanho". Toque em "Alterar foto" e escolha "Remover foto": o erro volta. Adicione de novo, agora por "Escolher da galeria".
6. Toque em "Registrar denúncia": abre o diálogo; confirme. Toast "Denúncia registrada." e volta.
7. Reabra "Denúncia de km": o resumo da rota, o cartão "Denúncia registrada" com o badge "Pendente", a foto em 4:3 e o aviso da situação. Em Serviços, o card "Denúncia de km" tem o badge preto "Pendente".

**Negar a câmera (faça só no S25 FE, depois de concluir a denúncia):** em Aba Usuário, "Trocar foto", "Tirar foto", negue a permissão. O app deve avisar que só os ajustes do aparelho desfazem isso e continuar usável. Para voltar a permitir: Ajustes do aparelho, Apps, Expo Go, Permissões.

**Avaliar:** a câmera e a galeria abrem sem travar a tela (no iOS só depois que a folha some); a foto não sai cortada nem distorcida; a miniatura e o nome do arquivo não estouram a linha.

Depois: **Sair** (aba Usuário), confirmando o diálogo "Sair da conta?".

### Fase 2: motorista (só B prepara uma rota para o encerramento)

**T06. Rota para encerrar (só B)**

O aparelho A fica em T06 como n/a e pode já sair da conta.

1. No B, entre com `motorista.b`. Em Serviços, "Rota", abra a folha de veículos: `ZZZ-4A01` e `ZZZ-4A02` (rotas abertas na Fase 1) devem aparecer como "Indisponível" (esmaecidos, sem responder ao toque). Confira.
2. Escolha `ZZZ-4B01`, itinerário `rota para encerrar`, e registre a saída.
3. Sair.

**Avaliar:** o badge "Indisponível" fica centralizado na linha e o rótulo longo quebra sem encostar nele.

### Fase 3: supervisor (A com `supervisor.a`, B com `supervisor.b`)

**T07. Serviços e encerramento de rotas**

1. Entre com o supervisor do seu aparelho. Em Serviços, confira os cards sob "Operacionais" e "Administrativos" (cinco a mais) e os contadores pretos no canto de "Encerramento de rotas" (esperado 3, as rotas das Fases 1 e 2) e de "Revisão de denúncias" (esperado 2).
2. Abra "Encerramento de rotas": a lista traz as rotas abertas e depois as encerradas, cada uma com o badge à direita. Teste a busca (motorista, placa ou modelo) e os chips Todas, Abertas e Encerradas. Digite uma busca sem resultado: o aviso "Nenhuma rota encontrada" fica no topo da área, e tocar nele fecha o teclado. A rota que tem denúncia mostra no rodapé do card "Denúncia pendente" (ou "aprovada", "reprovada").
3. Toque na rota do `motorista.a` (a que tem denúncia pendente). Toque em "Encerrar rota" e confirme: abre o aviso "Ação não permitida" pedindo que a denúncia seja revisada antes. Feche. Os dois aparelhos fazem este passo.
4. **Só A:** volte à lista e toque na rota do `motorista.b`. Leia o aviso azul "Encerrar sem retorno". Toque em "Encerrar rota" e confirme no diálogo vermelho: toast "Rota encerrada. Veículo e motorista foram liberados." e a rota aparece como "Encerrada", esmaecida, na lista. **B:** reabra a lista e confira que a rota do `motorista.b` já aparece "Encerrada".
5. **Só B, depois do T08:** a denúncia da rota do `supervisor.a` já foi reprovada. Toque nessa rota e encerre-a, como no passo 4.

**Avaliar:** cards do mesmo tamanho; contadores sobre o canto sem cobrir o título; o diálogo e a barra de ação sem corte; o teclado da busca não esconde nada (no Android, a barra de abas não deve atrapalhar).

**T08. Revisão de denúncias**

1. Abra "Revisão de denúncias": as duas denúncias (a do `motorista.a`, `ZZZ-4A01`, e a do `supervisor.a`, `ZZZ-4A02`) estão "Pendente". Teste os chips Todas, Pendentes e Revisadas.
2. **A abre a do `motorista.a`; B abre a do `supervisor.a`.** Confira: motorista, "placa · modelo", dados em duas colunas e a foto do painel em 4:3.
3. **A:** toque em "Aprovar": abre o diálogo (não vermelho). Confirme: toast verde "Denúncia aprovada. Os km da rota foram corrigidos." O badge passa a "Aprovada". **B:** toque em "Reprovar": o diálogo é vermelho. Confirme: toast azul "Denúncia reprovada. Nenhum km foi alterado." O badge passa a "Reprovada".

**Avaliar:** a foto não estoura a tela; o texto "O que acontece ao decidir" cabe sem corte; os dois botões da barra fixa ("Aprovar" e "Reprovar") ficam empilhados, um sobre o outro, nos dois aparelhos, e cabem sem corte.

**T09. Gestão de motoristas**

1. Abra "Gestão de motoristas": lista em ordem alfabética, busca, chips Todos, Ativos e Inativos.
2. "Cadastrar motorista": toque em "Cadastrar motorista" sem preencher (erros nos três campos). Preencha nome `motorista TESTE quarenta`, e-mail `teste.40a@trace.com.br` no A e `teste.40b@trace.com.br` no B, e senha `12345678`. Ao sair do nome, ele vira `Motorista Teste Quarenta`. Cadastre: toast e volta à lista. Os dois aparelhos cadastram o mesmo nome: na lista, os dois ficam juntos e em ordem de e-mail (`teste.40a` antes de `teste.40b`).
3. Tente cadastrar o mesmo e-mail de novo: o erro aparece no campo e-mail, em português.
4. Abra o motorista criado: nome editável, e-mail e cargo só para leitura, "Trocar foto", "Redefinir senha", "Desativar motorista".
5. Desative e reative. Por fim, "Excluir motorista": o diálogo vermelho abre; confirme. Ele sai da lista com o toast "Motorista excluído.".

**Avaliar:** o e-mail longo na linha da lista não estoura; o avatar e o badge Ativo/Inativo ficam alinhados; o teclado não cobre os campos de baixo do cadastro (a barra fixa some no Android e é coberta no iOS, o esperado).

**T10. Gestão de veículos**

1. Abra "Gestão de veículos": duas linhas de chips (situação e tipo), busca por placa (com e sem hífen), modelo ou tipo.
2. "Cadastrar veículo": toque em "Cadastrar veículo" sem preencher. Placa `ZZZ-4C01` no A e `ZZZ-4C02` no B; abra "Tipo" (a folha tem ícones); modelo `moto TESTE` (ao sair vira `Moto Teste`); km `100000` (mostra `1.000,00`). Cadastre.
3. Tente cadastrar a mesma placa de novo: erro de placa já cadastrada, no campo.
4. Abra o veículo: placa, tipo e modelo editáveis; "Km atual" só para leitura. Inative e reative. Por fim, "Excluir veículo" (sem registros): diálogo e toast.

**Avaliar:** a linha de chips de tipo rola para o lado sem prender o gesto de voltar do Android; o km aparece sempre no formato `000.000,00 km` nos cards.

Depois: **Sair**.

### Fase 4: motorista (A com `motorista.a`, B com `motorista.b`)

**T11. Registrar retorno**

**Ordem:** o A faz os passos 1 a 5 primeiro. Quando o A terminar, o B faz o passo 1 (registra a saída) e para; o A faz o passo 6; só então o B segue com os passos 2 a 5.

1. Entre com o motorista do seu aparelho. **A:** Serviços, "Rota": o cartão "Rota aberta" (`ZZZ-4A01`) mostra Saída, Retorno (vazio, `-`), Km de saída e Km de retorno, e a saída agora está em `1.005,00` (corrigida pela aprovação). **B:** a rota anterior foi encerrada, então registre antes uma saída com `ZZZ-4B01` (que voltou a ficar disponível) e itinerário `volta do dia`; depois abra "Rota", com a saída em `1.000,00`. Toque na "Observação" da saída, se houver: abre e fecha animado, com a seta girando.
2. Em "Km de retorno", digite o km igual ao de saída (A: `100500`; B: `100000`): erro dizendo que precisa ser maior que o km de saída.
3. Digite `101000` (`1.010,00`). Em "Observação (opcional)" digite `FIM do dia`: com o teclado aberto o campo continua visível; ao sair vira `Fim do dia`.
4. Role até o fim: botão "Denunciar divergência de km" (só conferir, não tocar).
5. Toque em "Registrar retorno": diálogo, confirme. Toast "Retorno registrado." e volta.
6. **Só A, com a rota do B aberta:** o A já não tem rota aberta. Serviços, "Rota", toque no campo "Veículo": `ZZZ-4B01` aparece como "Indisponível" (esmaecido, sem responder ao toque, com o badge centralizado na linha). Feche a folha. Isso cobre, no Android, o que o T06 viu só no iPhone.

**Avaliar:** no Android a barra de ação some enquanto o teclado está aberto e volta ao fechar; no iOS o teclado a cobre; o cartão-resumo cabe sem corte.

**T12. Abastecimento, troca de óleo e manutenção**

1. Use o veículo do seu aparelho (A: `ZZZ-4A01`; B: `ZZZ-4A02`) em T12 e T13. "Abastecimento": toque em "Registrar abastecimento" vazio (erros em todos os campos). Digite `0` em litros e valor: erro "maior que zero".
2. Preencha: veículo do seu aparelho, km `500000` (`5.000,00`), combustível pela folha, litros `4000` (`40,00`), valor total `25000` (`R$ 250,00`). Registre: toast "Abastecimento registrado." e volta.
3. "Troca de óleo": veículo, km `500000`, tipo do óleo `óleo SINTÉTICO 5W-30` (ao sair vira `Óleo sintético 5w-30`), valor `18000`. Registre: toast "Troca de óleo registrada."
4. "Manutenção": veículo, km `500000`, descrição `troca DE pastilhas` (vira `Troca de pastilhas`; confira o contador `n/500`), valor `35000`. Registre: toast "Manutenção registrada."

**Avaliar:** a máscara do km e do valor (os dígitos entram pela direita); o teclado numérico abre nos campos numéricos; o prefixo `R$` e o sufixo `km` ficam dentro do campo; o campo de baixo nunca fica atrás do teclado; o botão fixo não é coberto pela barra do sistema.

**T13. Histórico**

1. Aba Histórico. Percorra os cinco chips: Rotas, Denúncias, Abastecimentos, Trocas de óleo e Manutenções. Em Rotas deve estar a rota de T11: no A, com "Denúncia aprovada" no rodapé e o km corrigido; no B, sem indicador de denúncia, e **sem** a rota encerrada da Fase 2 (RB10).
2. Toque na busca e digite a placa do seu veículo, com ou sem hífen (`ZZZ-4A01` ou `ZZZ4A01`, `ZZZ-4A02` ou `ZZZ4A02`) e também só um pedaço dela (`4A01`, `Z4A`). **No Android, observe a barra de abas: ela sobe junto com o teclado (problema conhecido, parte 8). Anote se piorou ou se cobre algum conteúdo.**
3. Abra o seletor de tipo de veículo e o de período, lado a lado: escolha uma opção, toque de novo na marcada (desmarca).
4. Compare o card de cada módulo: legibilidade, ícone, "placa · modelo", dados em duas colunas.

**Avaliar:** nenhum card corta o texto; nome longo de motorista, itinerário ou modelo quebram de linha sem estourar; a busca e os dois seletores cabem numa linha nos dois aparelhos, em especial no iPhone XS, o mais estreito.

**T14. Editar um registro próprio**

1. No Histórico, módulo Abastecimentos, toque no lápis do abastecimento de T12.
2. A tela traz "Dados do registro" só para leitura e o card com os campos editáveis (Valor total primeiro).
3. Mude o valor e toque em "Salvar alterações": toast "Alterações salvas." e a lista atualiza.

**Avaliar:** os dados fixos (Km registrado, Registrado, Veículo, Autor) cabem em duas colunas sem corte.

**T15. Aba Usuário**

1. Foto de 80 dp, nome, e-mail e badge de cargo. Toque em "Trocar foto": folha com "Tirar foto" e "Escolher da galeria". Escolha a galeria e uma foto; depois "Remover foto".
2. "Trocar senha": toque em "Alterar senha" vazio (erros nos três campos); digite uma senha atual **errada** e confira o erro. **Não conclua a troca** para não perder a senha da conta de teste.
3. "Privacidade" (acrescentada em 11/11): abre a folha "Privacidade dos dados" com cinco blocos de texto e o botão "Entendi". Na tela de login, o link "Privacidade dos dados" abaixo do card abre a mesma folha.
4. "Sair": diálogo "Sair da conta?".

**Avaliar:** a foto não deforma; a folha e o diálogo ficam por cima da barra de abas.

### Fase 5: supervisor (A com `supervisor.a`, B com `supervisor.b`)

**T16. Relatórios e PDF**

1. Entre com o supervisor do seu aparelho. Serviços, "Relatórios". No campo "Relatório" escolha, em ordem, Financeiro, Km rodados e Denúncias. Período "Este mês"; teste "Tipo de veículo" (tocar de novo desmarca) e, no financeiro, "Tipo de serviço".
2. Em cada um, toque em "Gerar PDF": o botão mostra o indicador de carregamento enquanto gera e abre a folha de compartilhamento.
3. Salve o PDF (Arquivos no iOS; Downloads ou o Drive no Android) e abra-o.
4. Abra a opção "Personalizado": digite as datas em `DD/MM/AAAA` e confira o erro de data final antes da inicial.

**Avaliar:** os totais dos cards batem com o Histórico; os gráficos cabem na largura; o PDF tem fonte Geom, "Página N de M", margens e nenhum card cortado entre páginas, e os títulos não ficam sozinhos no fim da página. O PDF de km e o de denúncias no Android e o indicador de carregamento do botão foram conferidos em 7/11 (PDFs exportados no S25 FE; indicador no T16).

### Fase 6: sistema (qualquer conta; o T17 é só do A, que é Android)

**T17. Botão e gesto de voltar do Android**

1. Em Android, nas telas empilhadas (formulário de saída, detalhe de veículo, edição de registro), use o voltar do sistema.
2. Com uma folha aberta (veículo, foto) e com um diálogo aberto, use o voltar: deve fechar a folha ou o diálogo antes de sair da tela.
3. Com o teclado aberto, o voltar fecha o teclado.
4. O app abre na aba Serviços. Nela, o voltar sai do app; no Histórico e no Usuário, o voltar leva a Serviços antes de sair (esperado desde 7/11; antes o app abria no Histórico e o voltar de Serviços levava a ele).

**Avaliar:** nenhuma tela se perde nem fica presa; o gesto de voltar das bordas não conflita com a fileira de chips que rola para o lado.

**T18. Fonte do sistema no tamanho máximo**

1. Aumente a fonte ao máximo (Android: Ajustes, Tela, Tamanho e estilo da fonte; iOS: Ajustes, Acessibilidade, Tela e Tamanho do Texto, Texto Maior). Volte ao app.
2. Reveja o Login, Serviços, a saída (T04), o abastecimento (T12), a lista de motoristas (T09) e a barra de abas.
3. **Devolva a fonte ao tamanho normal no fim.**

**Avaliar:** nenhum botão corta a linha; o rótulo da aba cabe; os campos continuam usáveis. Se quebrar, anotar em quais telas e decidir entre limitar o tamanho da fonte e registrar como limitação (decidido: o app segue a fonte do sistema e a limitação consta na parte 10).

## 5. Resultados

Legenda: **OK**, **Falhou** (descrito na parte 9, no formato da parte 6) ou **n/a**.

| #   | Teste                                         | iPhone XS (B)      | S25 FE (A)         |
| --- | --------------------------------------------- | ------------------ | ------------------ |
| T01 | Login                                         | OK                 | OK                 |
| T02 | Abas e barras do sistema                      | OK                 | OK                 |
| T03 | Serviços (motorista)                          | OK                 | OK                 |
| T04 | Registrar saída                               | OK                 | OK                 |
| T05 | Denunciar divergência de km (foto)            | OK                 | OK                 |
| T06 | Rota para encerrar (só B)                     | OK                 | OK                 |
| T07 | Serviços (supervisor) e encerramento de rotas | OK                 | OK                 |
| T08 | Revisão de denúncias                          | OK                 | OK                 |
| T09 | Gestão de motoristas                          | OK                 | OK                 |
| T10 | Gestão de veículos                            | OK                 | OK                 |
| T11 | Registrar retorno                             | OK                 | OK                 |
| T12 | Abastecimento, troca de óleo e manutenção     | OK                 | OK                 |
| T13 | Histórico                                     | OK                 | OK                 |
| T14 | Editar um registro próprio                    | OK                 | OK                 |
| T15 | Aba Usuário                                   | OK                 | OK                 |
| T16 | Relatórios e PDF                              | OK                 | OK                 |
| T17 | Voltar do Android                             | n/a                | OK                 |
| T18 | Fonte do sistema no tamanho máximo            | OK, com limitações | OK, com limitações |

## 6. Formato de registro dos achados

Para cada coisa estranha, uma linha com:

- **Aparelho** (iPhone XS ou S25 FE);
- **Teste e passo** (por exemplo, "T11 passo 3");
- **Esperado e visto**, em uma frase cada;
- **Print ou gravação de tela**;
- **Impacto:** alto (impede de usar), médio (atrapalha) ou baixo (estético).

Se algo quebrar o app (tela branca, fechar), copie o texto do erro que o Expo Go mostra, ou o que aparecer no terminal do `expo start`.

Os achados de impacto alto e médio foram corrigidos na própria branch da issue; os demais entraram nas limitações (parte 10), e a parte 9 foi fechada.

## 7. Pontos de risco vistos no código

Conferência feita lendo o código em 5/11/2026, sem rodar nos aparelhos. São onde a passada tem mais chance de achar problema, e não resultados.

- **Texto maior do sistema (T18).** Nenhum componente limita `maxFontSizeMultiplier` nem desliga `allowFontScaling`, então o app segue a fonte do sistema. Os campos (44 dp) e os botões (40 dp) têm altura fixa em dp e o texto cresce dentro deles. Um tamanho muito grande pode cortar a linha de um botão ou o rótulo da aba. A decisão (limitar ou aceitar e registrar como limitação) depende do que a passada mostrar.
- **Larguras fixas.** Só há dimensões fixas em `PhotoField` (altura 112) e nos diálogos e estados vazios (`maxWidth` 240 a 400); o resto é flexível. Não há largura fixa em dp que quebre um aparelho estreito.
- **Barras do sistema no Android.** O app desenha de borda a borda (`statusBarTranslucent` e `navigationBarTranslucent` no `KeyboardProvider`) e usa as áreas seguras em `ActionBar`, `StackHeader` e na barra de abas. Vale conferir com navegação por três botões e por gestos (T02).
- **Ramos por plataforma.** Há quatro arquivos com `Platform.OS`, todos de comportamento de sistema que não tem equivalente: `ActionBar` (no Android a barra some com o teclado aberto; no iOS o teclado a cobre), `BottomSheet` e `useHiddenCallback` (no iOS a câmera e a galeria só abrem depois que a folha some) e `reportPdf` (margem da página).
- **iPad.** O `app.json` tem `ios.supportsTablet: true`, mas o app só foi desenhado e testado em telefone, em retrato, e não há iPad entre os aparelhos de teste. Decisão do autor em 7/11: manter o suporte como estava e registrar como limitação (parte 10). Em 10/11 o `app.json` passou a `supportsTablet: false`, porque o suporte a tablet nunca foi confirmado em aparelho (só foram testados o iPhone XS e o Galaxy S25 FE); o app roda no iPad como app de iPhone, no modo de compatibilidade do iOS.
- **Tema escuro do sistema.** O app é só claro (`userInterfaceStyle: light`) e a barra de status é sempre escura, então o tema escuro do celular não deve afetar. Conferir uma vez no Android com o tema escuro ligado (T02).
- **Voltar do Android.** `predictiveBackGestureEnabled` está desligado. Confirmar que o voltar fecha a folha ou o diálogo antes de sair da tela (T17).

## 8. Usabilidade dos formulários (RNF08)

Campos de entrada de cada formulário de registro, contados no código (`src/screens`). O critério é "poucos campos": o maior tem 5, e os campos de leitura (km atual da saída) não contam como entrada.

| Formulário                    | Campos de entrada                                   | Total |
| ----------------------------- | --------------------------------------------------- | ----- |
| Login                         | E-mail, senha                                       | 2     |
| Registrar saída               | Veículo, itinerário, observação (opcional)          | 3     |
| Registrar retorno             | Km de retorno, observação (opcional)                | 2     |
| Denúncia de km                | Km informado, foto do painel                        | 2     |
| Abastecimento                 | Veículo, km atual, combustível, litros, valor total | 5     |
| Troca de óleo                 | Veículo, km atual, tipo do óleo, valor total        | 4     |
| Manutenção                    | Veículo, km atual, descrição, valor total           | 4     |
| Cadastro de veículo           | Placa, tipo, modelo, km atual                       | 4     |
| Cadastro de motorista         | Nome, e-mail, senha inicial                         | 3     |
| Trocar senha                  | Senha atual, nova senha, confirmação                | 3     |
| Edição de registro de serviço | Valor e os campos próprios de cada tipo (2 ou 3)    | 2 a 3 |

**Mensagens claras:** os erros do servidor são traduzidos pelo `code` em português (`serverErrors.ts`, I-08) e os do app vêm dos esquemas Zod (`src/schemas`). A passada verificou se alguma mensagem aparecia em inglês, genérica demais ("Valor inválido.") ou sem dizer o que fazer; as que apareceram estão na parte 9.

Os formulários têm barra de ação fixa no rodapé, erro embaixo do campo e o `NoticeDialog` para o que não pertence a um campo. Relatórios tem seis controles de filtro, mas não é um formulário de registro.

## 9. Problemas encontrados na passada

Registro dos problemas achados na passada. Cada linha virou correção (se de maior impacto) ou entrou na parte 10.

| Teste                          | Aparelho           | Descrição                                                                                                                                                                                                        | Impacto (alto, médio, baixo) | Destino (corrigido, limitação)                                                                                                                                                                                                   |
| ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01 passo 4                    | iPhone XS e S25 FE | Com a senha em foco, o teclado cobria o botão "Entrar" e a nota abaixo do card; só o campo ficava visível.                                                                                                       | Médio                        | Corrigido: `bottomOffset` de 144 dp em `LoginScreen`, conferido no aparelho em 5/11                                                                                                                                              |
| T01                            | iPhone XS e S25 FE | A nota sob o card ("O acesso é criado pelo supervisor da sua empresa.") descrevia como o acesso nasce, sem dizer o que fazer.                                                                                    | Baixo                        | Corrigido: "Sem acesso? Peça ao supervisor da sua empresa.", conferido                                                                                                                                                           |
| T07 passo 2; T09 e T10 passo 1 | iPhone XS e S25 FE | Com a busca sem resultado, o aviso "Nenhuma ... encontrada" ficava centralizado: só o ícone cabia acima do teclado, e tocar na área do aviso não fechava o teclado, que só saía ao tocar na busca ou em um chip. | Médio                        | Corrigido em todas as listas com busca: aviso no topo da área e toque nele fecha o teclado. Conferido no aparelho em 7/11                                                                                                        |
| T07 passo 3                    | iPhone XS e S25 FE | O card de rota aberta não dizia se havia denúncia: o supervisor só descobria ao tentar encerrar e receber "Ação não permitida".                                                                                  | Médio                        | Corrigido: o rodapé do card mostra "Denúncia pendente", "aprovada" ou "reprovada", como o card do Histórico. Conferido no aparelho em 7/11                                                                                       |
| T09 passo 2                    | iPhone XS e S25 FE | Dois motoristas com o mesmo nome apareciam em ordem aleatória de e-mail (o `teste.40b` antes do `teste.40a`).                                                                                                    | Baixo                        | Corrigido: a lista desempata pelo e-mail. Conferido no aparelho em 7/11                                                                                                                                                          |
| T12 (passo 2 a 4), Android     | S25 FE             | Ao abrir o teclado, a barra de ação "piscava" acima dele por um instante antes de sumir.                                                                                                                         | Baixo                        | Limitação (parte 10). Tentativa de esconder a barra mais cedo pelos eventos da biblioteca de teclado não resolveu e foi desfeita; antes, ela chegou a ficar fixa acima do teclado.                                               |
| T13 passo 2                    | iPhone XS e S25 FE | A busca por placa só achava a placa inteira: "4A01" não achava ZZZ-4A01, porque o app punha o hífen na 4ª posição do que foi digitado ("4A0-1").                                                                 | Médio                        | Corrigido: a busca aceita um pedaço da placa, com ou sem hífen. Testes de backend atualizados. Conferido no aparelho em 7/11, nas buscas do Histórico, da Gestão de veículos, da Revisão de denúncias e do Encerramento de rotas |
| T13 passo 2, Android           | S25 FE             | A barra de abas sobe junto com o teclado e cobre uma parte pequena dos dados (problema conhecido, não piorou).                                                                                                   | Baixo                        | Limitação (parte 10)                                                                                                                                                                                                             |
| T16 passo 4                    | iPhone XS e S25 FE | O erro "A data final deve ser igual ou posterior à inicial." ficava preso ao campo "Até", e só ele ficava vermelho.                                                                                              | Baixo                        | Corrigido: os dois campos ficam vermelhos e a mensagem aparece uma vez, alinhada à esquerda, sob os dois. Conferido no aparelho em 7/11                                                                                          |
| T17 passo 4                    | S25 FE             | O app abria no Histórico e, em Serviços, o voltar levava ao Histórico antes de sair.                                                                                                                             | Baixo                        | Corrigido: o app abre em Serviços e o voltar das outras abas leva a Serviços (`initialRouteName` e `backBehavior`). Conferido no aparelho em 7/11                                                                                |
| T18                            | S25 FE             | Com a fonte no máximo, o texto dos badges ("Ativo", "Supervisor") era cortado embaixo, porque o badge tinha altura fixa de 24 dp.                                                                                | Médio                        | Corrigido: altura mínima, o badge cresce com o texto. Conferido no aparelho em 7/11                                                                                                                                              |
| T18                            | S25 FE             | Com a fonte no máximo, placeholders ("Buscar por motorista, pla…", "Tipo de v…", "Todo o p…") e o título longo do cabeçalho ("Gestão de motorist…") são abreviados com reticências. Nada fica inutilizável.      | Baixo                        | Limitação (parte 10)                                                                                                                                                                                                             |

## 10. Limitações

Já conhecidas (registradas em docs/historico-de-desenvolvimento.md nas issues indicadas). As achadas na parte 9 e não corrigidas entraram aqui. **Reverificação de 10/11:** o autor testou de novo no Android e a barra de abas na busca do Histórico e a barra de ação dos formulários se comportam normalmente; essas duas limitações, registradas em 5 a 7/11, foram retiradas.

| Limitação                                                                                                                                                                                                                                   | Origem    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Com a fonte do sistema no tamanho máximo, os campos de busca, os seletores e os títulos longos mostram o texto abreviado com reticências (o conteúdo continua legível e utilizável). O app segue a fonte do sistema, sem limite de tamanho. | #40       |
| A máscara numérica de km e valores reescreve a cada tecla; nenhuma biblioteca nativa de máscara roda no Expo Go.                                                                                                                            | #39       |
| Motoristas e Veículos leem tudo de uma vez e filtram no app. Serve ao porte de uma pequena empresa. (Encerramento de rotas e Revisão de denúncias paginam de 10 em 10 no servidor desde 10/11.)                                 | #39       |
| Os relatórios leem todo o período escolhido e somam no app.                                                                                                                                                                                 | #36       |
| Relatórios: faltam "utilização" do veículo (dias em rota), última troca de óleo por veículo, custo por km e consumo (km/L). Os relatórios de km e de denúncias não têm gráficos.                                                            | #37, #38  |
| O instalável para iOS segue em aberto: exige conta Apple. Os testes em iOS são pelo Expo Go.                                                                                                                                                | #41       |
| A busca por modelo e por nome no servidor não ignora acento, só maiúsculas. O Histórico não tem período com datas livres, só atalhos.                                                                                                       | #33       |
| Os testes cobrem um iPhone XS e um Galaxy S25 FE no Expo Go. Não foram testados outros aparelhos (por exemplo, telas mais estreitas que a do iPhone XS), outras versões de Android e iOS, nem iPad.                                         | #40       |
| O app é só claro e em retrato; não há modo escuro nem aplicativo para tablet.                                                                                                                                                               | #40, #41  |
| A margem da página do PDF vai pela opção `margins` no iOS e pelo `@page` no Android; os três PDFs foram conferidos no Android (7/11).                                                                                                       | #37, #38  |
