# Mapa da documentação do TRACE

Onde está cada coisa e qual é a fonte da verdade de cada assunto. O ponto de partida de quem chega ao projeto é o [CLAUDE.md](../CLAUDE.md); o histórico completo do desenvolvimento está em [historico-de-desenvolvimento.md](historico-de-desenvolvimento.md).

## Núcleo do contexto

| Arquivo | O que é | É a fonte da verdade de |
| ------- | ------- | ----------------------- |
| [CLAUDE.md](../CLAUDE.md) | Contexto, stack, regras de negócio essenciais, princípios de código, fluxo de trabalho, decisões e um resumo do estado atual (é o contexto de trabalho da ferramenta de IA, lido a cada sessão, por isso é enxuto) | Regras e decisões que valem para o código |
| [historico-de-desenvolvimento.md](historico-de-desenvolvimento.md) | O registro, issue por issue, do que foi feito, das decisões e do que foi visto no aparelho (era a seção "Estado atual" do CLAUDE.md) | O histórico e o raciocínio do desenvolvimento |
| [README.md](../README.md) | Como rodar o app e o backend, variáveis de ambiente, build de distribuição, scripts | Como instalar e executar |
| [backend/README.md](../backend/README.md) | Instância de produção, rodar localmente, migrações, resumo das API Rules e dos hooks por coleção, consultas do histórico e dos relatórios, dados de demonstração | O backend descrito em texto |

## Backend executável (a prova do que os documentos dizem)

| Pasta | O que tem |
| ----- | --------- |
| `backend/pb_migrations/` | 11 migrações: coleções, campos, índices e API Rules |
| `backend/pb_hooks/` | 8 hooks JavaScript: autor, decimais, veículos, placa equivalente, usuários, rotas, registros de serviço e denúncias |
| `backend/tests/` | 545 testes de API (`npm test` em `backend/`), que provam cada regra sem passar pelo app |
| `backend/seed/` | Dados de demonstração (`npm run seed`, `seed:clean`, `seed:reset`) |

## Documentos do projeto (`docs/`)

| Arquivo | O que é |
| ------- | ------- |
| [requisitos-final.md](requisitos-final.md) | Especificação de Requisitos versão 2.0: 23 RF, 8 RNF e 21 RB conforme implementado, limitações e rastreabilidade |
| [planejamento-final.md](planejamento-final.md) | Planejamento de Issues como executado: 44 issues, datas reais, matriz de 52 requisitos, riscos e decisões |
| [roteiro-de-testes.md](roteiro-de-testes.md) | Cenários C01 a C21 (uma por regra de negócio) e o fluxo ponta a ponta E1 a E9 |
| [testes-android-ios.md](testes-android-ios.md) | Testes de usabilidade T01 a T18 em iPhone XS e Galaxy S25 FE |

## Insumos do TCC (`docs/tcc/`)

| Arquivo | O que é |
| ------- | ------- |
| [insumos.md](tcc/insumos.md) | Atendimento por RF, RNF e RB, resultados dos testes e situação dos critérios da #43 |
| [balanco-final.md](tcc/balanco-final.md) | Visão do processo, RF alterados ou reduzidos ligados às issues, auditoria dos critérios e a comparação com os quatro documentos de origem |
| [capturas/](tcc/capturas/README.md) | 28 capturas em `ios/` e 28 em `android/`, a lista de telas e, no mesmo arquivo, o plano e a receita dos dados de demonstração |
| [diagramas/](tcc/diagramas/) | `der-final.png` e `dcu-final.png` (o que mudou em relação aos originais está nas partes 5.3 e 5.4 do balanço) |

**Conjunto completo de documentos antes da consolidação de 10/11/2026** (com os PDFs, o guia de ajustes dos diagramas e o arquivo separado dos dados de demonstração): commit `2ad7d19` (`git show 2ad7d19:<caminho>`).

## Fora do repositório

Os documentos de origem, de 13/10/2026: **TRACE – Requisitos** (versão 1.0), **TRACE – Planejamento de Issues** (versão 1.0), o DER e o DCU originais. A versão final do Requisitos e do Planejamento está aqui em `docs/`; a comparação entre as versões está no apêndice A de cada um e na parte 5 do balanço.

## Números de referência (para conferir a consistência)

23 RF, 8 RNF e 21 RB (RB20 e RB21 novas) · 44 issues (I-01 a I-43 e a #47) em 6 milestones, todas fechadas · 545 testes de API em 19 arquivos · 11 migrações · 8 hooks · 7 coleções e 1 view (`vehicle_availability`) · 17 casos de uso e 3 atores (Motorista, Supervisor e Superadmin) · 28 capturas por sistema · Expo SDK 58 · PocketBase v0.40.5.
