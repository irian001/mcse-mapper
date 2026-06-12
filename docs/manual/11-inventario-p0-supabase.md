# Inventario P0 - Supabase, RLS e Frontend

Data do inventario: 2026-06-12.

Este documento registra a primeira validacao P0 feita somente com o repositorio local. Ele nao valida o Supabase real. O objetivo e deixar claro o que o frontend usa, o que existe como `CREATE TABLE` local, quais objetos exigem verificacao no banco real e quais regras criticas precisam de teste por perfil.

## Metodo

Buscas estaticas em `src/`:

- Tabelas: `supabase.from("...")`, `(supabase as any).from("...")`, `(supabase.from as any)("...")`.
- RPCs: `.rpc("...")`.
- Storage: `supabase.storage.from("...")` e constantes de bucket.

Buscas estaticas em `supabase/migrations/` e `docs/sql/`:

- `CREATE TABLE`.
- `CREATE POLICY`.
- `CREATE OR REPLACE FUNCTION`.
- `storage.buckets` e `bucket_id`.

Limitacoes:

- Usos dinamicos de `.from(table)` exigem revisao manual.
- O repositorio pode nao refletir o Supabase real.
- Policies antigas em migrations podem ter sido substituidas por migrations posteriores; o mapa local mostra definicoes historicas, nao necessariamente o estado final do banco.
- O comportamento real de RLS deve ser testado via usuarios autenticados, porque o SQL Editor do Supabase normalmente executa com privilegios elevados.

## Sumario P0

- 51 tabelas referenciadas estaticamente pelo frontend.
- 45 tabelas com `CREATE TABLE` local em `supabase/migrations/` ou `docs/sql/`.
- 6 tabelas usadas pelo frontend sem `CREATE TABLE` local encontrado.
- 6 RPCs chamadas diretamente pela UI.
- 2 buckets usados pela UI: `documentos-balancete` e `solicitacao-documentos`.
- Alcadas de aprovacao de planejamento/materialidade aparecem calculadas no frontend; o SQL local avaliado limita por acesso ao trabalho/admin, mas nao reproduz claramente a matriz completa de alcada.

## Tabelas usadas pelo frontend

| Tabela | Refs | Evidencia no frontend | Origem local |
|---|---:|---|---|
| `auditores` | 14 | `src/hooks/useCurrentAuditor.ts:12`; `src/hooks/useUserProfile.ts:21`; `src/pages/AuditoresPage.tsx:91` | `supabase/migrations/20260401165537_b46dea54-ea08-4f21-94fc-f984b633246f.sql` |
| `balancete_linha_documentos` | 4 | `src/components/balancete/BalanceteLinhasTable.tsx:133`; `src/components/balancete/LinkedDocsBlock.tsx:30`; `src/components/solicitacao/VincularBalanceteDialog.tsx:98` | `supabase/migrations/20260412002717_126f38ef-2a5b-498f-855b-e56989124add.sql` |
| `balancete_linhas` | 17 | `src/components/balancete/BalanceteLinhaDetailDialog.tsx:133`; `src/components/balancete/BalanceteLinhasTable.tsx:114`; `src/components/balancete/ImportBalanceteFlow.tsx:241` | `supabase/migrations/20260401181250_9eaa37d8-d917-4fc8-8ef0-aba808a0ff43.sql` |
| `balancetes` | 6 | `src/components/balancete/ImportBalanceteFlow.tsx:184`; `src/components/balancete/ImportBalanceteFlow.tsx:246`; `src/components/trabalhos/MaterialidadeBasesPanel.tsx:100` | `supabase/migrations/20260401181250_9eaa37d8-d917-4fc8-8ef0-aba808a0ff43.sql` |
| `cliente_classes_faturamento` | 5 | `src/components/procedimentos/CadastroClassesFaturamento.tsx:28`; `:39`; `:42` | `docs/sql/faturas-em-aberto-etapa1.sql` |
| `cliente_contas_origem` | 18 | `src/components/balancete/ImportBalanceteFlow.tsx:172`; `src/components/plano-contas/ImportPlanoContasDialog.tsx:191`; `:197` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `cliente_mapeamento_mcse` | 12 | `src/components/balancete/ImportBalanceteFlow.tsx:178`; `src/components/plano-contas/ImportPlanoContasDialog.tsx:189`; `src/lib/supabase-queries.ts:110` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `cliente_modalidades_atuacao` | 5 | `src/components/cliente/ClienteModalidadesDialog.tsx:65`; `:114`; `:150` | `docs/sql/fase-0a3-2-cliente-modalidades-atuacao.sql` |
| `cliente_municipios_faturamento` | 5 | `src/components/procedimentos/CadastroMunicipiosFaturamento.tsx:30`; `:41`; `:44` | `docs/sql/faturas-em-aberto-etapa1.sql` |
| `cliente_parametros` | 3 | `src/lib/supabase-queries.ts:75`; `src/pages/ClientesPage.tsx:163`; `:165` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `cliente_usuarios` | 7 | `src/hooks/useUserProfile.ts:30`; `src/pages/ClienteUsuariosPage.tsx:50`; `:61` | `supabase/migrations/20260412140429_7adcd50d-14b4-46cc-9576-0610dcc79c0e.sql` |
| `clientes` | 11 | `src/hooks/useEstruturaPorCliente.ts:43`; `src/lib/solicitacao-service.ts:36`; `src/lib/supabase-queries.ts:69` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `contrato_produtos` | 5 | `src/components/contratos/ContratoEscopoTab.tsx:50`; `:114`; `:117` | Nao encontrado |
| `contratos` | 4 | `src/pages/ContratosPage.tsx:76`; `:125`; `:128` | Nao encontrado |
| `documentos_referencia_balancete` | 6 | `src/components/balancete/DocumentosReferenciaBlock.tsx:26`; `:57`; `:86` | `supabase/migrations/20260403112947_de96fbba-d6c1-47c6-b396-58371defc194.sql` |
| `empresa_auditoria` | 3 | `src/hooks/useEmpresaAuditoria.ts:36`; `src/pages/EmpresaAuditoriaPage.tsx:121`; `:127` | `supabase/migrations/20260423215443_862055b0-e72c-44b0-beb0-0d9c641a3d22.sql`; `supabase/migrations/20260423221544_bbcbfd9c-2f32-46f6-9bd2-cd454938c380.sql` |
| `estruturas_auditoria` | 9 | `src/hooks/useEstruturaAtiva.ts:23`; `src/hooks/useEstruturaPorCliente.ts:55`; `src/hooks/useSegmentos.ts:50` | `docs/sql/segmentos-estruturas-auditoria.sql` |
| `exercicios` | 5 | `src/components/procedimentos/TermoContagemCaixa.tsx:57`; `src/lib/supabase-queries.ts:72`; `src/pages/ClientesPage.tsx:148` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `mcse_contas` | 13 | `src/components/mcse/ExportMcseTemplate.tsx:42`; `src/components/mcse/ImportEstruturaUnificadaDialog.tsx:98`; `:341` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `mcse_grupos` | 9 | `src/components/mcse/ExportMcseTemplate.tsx:28`; `src/components/mcse/ImportEstruturaUnificadaDialog.tsx:96`; `:257` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `mcse_regras_conta` | 6 | `src/components/modelos-riscos/ModeloRiscoItemVinculosDialog.tsx:166`; `src/lib/solicitacao-service.ts:101`; `:116` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `mcse_regras_documentos` | 6 | `src/components/modelos-riscos/ModeloRiscoItemVinculosDialog.tsx:182`; `src/components/regras/RegrasDocumentosPanel.tsx:125`; `:128` | `supabase/migrations/20260409172232_8900d966-bd71-4326-9937-a0a2b11f5597.sql` |
| `mcse_regras_emissao_erp` | 8 | `src/components/modelos-riscos/ModeloRiscoItemVinculosDialog.tsx:214`; `src/components/regras/RegrasEmissaoErpPanel.tsx:129`; `:132` | `supabase/migrations/20260410010019_2a07e646-d896-49aa-b920-6516cf1a9c5d.sql` |
| `mcse_regras_instrucoes` | 9 | `src/components/modelos-riscos/ModeloRiscoItemVinculosDialog.tsx:198`; `src/components/regras/RegrasInstrucoesPanel.tsx:114`; `:117` | `supabase/migrations/20260410010019_2a07e646-d896-49aa-b920-6516cf1a9c5d.sql` |
| `mcse_subgrupos` | 9 | `src/components/mcse/ExportMcseTemplate.tsx:35`; `src/components/mcse/ImportEstruturaUnificadaDialog.tsx:97`; `:295` | `supabase/migrations/20260330155512_4059af41-ac21-4fbe-b107-6f72b95eeafe.sql` |
| `modalidades_atuacao` | 6 | `src/components/cliente/ClienteModalidadesDialog.tsx:77`; `src/hooks/useModalidadesAtuacao.ts:26`; `src/pages/ModelosMatrizRiscosPage.tsx:291` | `docs/sql/fase-0a3-1-modalidades-atuacao.sql` |
| `modelo_matriz_risco_item_vinculos` | 3 | `src/components/modelos-riscos/ModeloRiscoItemVinculosDialog.tsx:124`; `:259`; `:274` | `docs/sql/fase-0a3-6-modelo-risco-item-vinculos.sql` |
| `modelo_matriz_risco_itens` | 6 | `src/components/modelos-riscos/ModeloMatrizRiscoItensPanel.tsx:204`; `:353`; `:360` | `docs/sql/fase-0a3-5-modelo-matriz-risco-itens.sql` |
| `modelos_matriz_riscos` | 3 | `src/hooks/useModelosMatrizRiscos.ts:42`; `src/pages/ModelosMatrizRiscosPage.tsx:370`; `:377` | `docs/sql/fase-0a3-4-modelos-matriz-riscos.sql` |
| `papeis_trabalho` | 11 | `src/components/pta/GerarPtaDialog.tsx:69`; `:119`; `:179` | `supabase/migrations/20260403143728_ace80466-218d-4e95-8ea5-9220ee22a70d.sql` |
| `papel_trabalho_linhas` | 12 | `src/components/balancete/BalanceteLinhaDetailDialog.tsx:69`; `src/components/pta/GerarPtaDialog.tsx:158`; `src/components/pta/PtaDetailDialog.tsx:137` | `supabase/migrations/20260403143728_ace80466-218d-4e95-8ea5-9220ee22a70d.sql` |
| `procedimento_auxiliar_documentos` | 3 | `src/components/procedimentos/DocumentosProcedimentoPanel.tsx:48`; `:83`; `:120` | Nao encontrado |
| `procedimento_contagem_caixa_detalhes` | 5 | `src/components/procedimentos/ContagemCaixaInlineGrid.tsx:103`; `:110`; `:125` | Nao encontrado |
| `procedimento_contagem_caixa_itens` | 5 | `src/components/procedimentos/ContagemCaixaPanel.tsx:45`; `:100`; `:105` | Nao encontrado |
| `procedimento_contagem_estoque_blocos` | 5 | `src/components/procedimentos/ContagemEstoquePanel.tsx:60`; `:147`; `:153` | `docs/sql/contagem-estoque.sql` |
| `procedimento_contagem_estoque_itens` | 9 | `src/components/procedimentos/ContagemEstoqueBlocoDetail.tsx:79`; `:153`; `:169` | `docs/sql/contagem-estoque.sql` |
| `procedimento_faturas_aberto_itens` | 4 | `src/components/procedimentos/FaturasEmAbertoDashboard.tsx:116`; `src/components/procedimentos/FaturasEmAbertoPanel.tsx:50`; `src/components/procedimentos/ImportFaturasAbertoDialog.tsx:274` | `docs/sql/faturas-em-aberto-etapa1.sql` |
| `procedimento_faturas_aberto_lotes` | 3 | `src/components/procedimentos/FaturasEmAbertoDashboard.tsx:103`; `src/components/procedimentos/FaturasEmAbertoPanel.tsx:36`; `src/components/procedimentos/ImportFaturasAbertoDialog.tsx:250` | `docs/sql/faturas-em-aberto-etapa1.sql` |
| `procedimentos_auxiliares` | 6 | `src/components/procedimentos/ConclusaoProcedimentoPanel.tsx:43`; `src/pages/DashboardEstoquesPage.tsx:228`; `src/pages/ProcedimentosAuxiliaresPage.tsx:115` | Nao encontrado |
| `produtos_auditoria` | 5 | `src/components/contratos/ContratoEscopoTab.tsx:67`; `src/pages/ModelosMatrizRiscosPage.tsx:259`; `src/pages/ProdutosAuditoriaPage.tsx:100` | `supabase/migrations/20260415012144_1cc3b81e-b4e8-4818-925c-c01717c6a733.sql` |
| `segmentos` | 3 | `src/hooks/useEstruturaPorCliente.ts:69`; `src/hooks/useSegmentos.ts:31`; `src/pages/SegmentosModalidadesPage.tsx:70` | `docs/sql/segmentos-estruturas-auditoria.sql` |
| `solicitacao_item_documentos` | 6 | `src/components/cliente/ClienteItemDocumentos.tsx:44`; `:84`; `src/components/solicitacao/ItemDocumentosPanel.tsx:92` | `supabase/migrations/20260412002100_af2caee6-2b13-4ae3-b5fb-40720adad2ee.sql` |
| `solicitacao_itens` | 13 | `src/components/cliente/ClienteItemDocumentos.tsx:99`; `src/components/solicitacao/ItemDocumentosPanel.tsx:143`; `:177` | `supabase/migrations/20260410020049_23553200-0de8-478c-8f2a-ca1bceb207db.sql` |
| `solicitacoes_documentos` | 9 | `src/lib/solicitacao-pdf.ts:12`; `src/lib/solicitacao-service.ts:221`; `src/pages/cliente/ClientePendenciasPage.tsx:21` | `supabase/migrations/20260410020049_23553200-0de8-478c-8f2a-ca1bceb207db.sql` |
| `trabalho_auditores` | 9 | `src/components/pta/PtaDetailDialog.tsx:151`; `src/components/trabalhos/TrabalhoPlanejamentoDialog.tsx:102`; `src/components/trabalhos/TrabalhoRiscosPanel.tsx:249` | `supabase/migrations/20260401165537_b46dea54-ea08-4f21-94fc-f984b633246f.sql` |
| `trabalho_materialidade` | 5 | `src/components/pta/MaterialidadeBaseSelect.tsx:63`; `src/components/trabalhos/TrabalhoPlanejamentoDialog.tsx:85`; `:404` | `docs/sql/fase-0a1-planejamento-materialidade.sql` |
| `trabalho_materialidade_bases` | 6 | `src/components/pta/MaterialidadeBaseSelect.tsx:81`; `src/components/trabalhos/MaterialidadeBasesPanel.tsx:81`; `:286` | `docs/sql/fase-0a1-materialidade-bases.sql` |
| `trabalho_planejamento` | 4 | `src/components/trabalhos/TrabalhoPlanejamentoDialog.tsx:71`; `:272`; `:285` | `docs/sql/fase-0a1-planejamento-materialidade.sql` |
| `trabalho_planejamento_modalidades` | 4 | `src/components/trabalhos/TrabalhoPlanejamentoModalidadesPanel.tsx:83`; `:156`; `:171` | `docs/sql/fase-0a3-3-trabalho-planejamento-modalidades.sql` |
| `trabalho_riscos_auditoria` | 4 | `src/components/trabalhos/TrabalhoRiscosPanel.tsx:233`; `:461`; `:474` | `docs/sql/fase-0a2-riscos-auditoria.sql` |
| `trabalhos_auditoria` | 13 | `src/components/balancete/ImportBalanceteFlow.tsx:75`; `src/components/pta/GerarPtaDialog.tsx:35`; `src/lib/solicitacao-service.ts:68` | `supabase/migrations/20260401165537_b46dea54-ea08-4f21-94fc-f984b633246f.sql` |

## Tabelas sem CREATE TABLE local

| Tabela | Uso principal | Validacao P0 |
|---|---|---|
| `contratos` | Contratos de auditoria por cliente | Confirmar existencia, colunas, RLS e origem no Supabase real. |
| `contrato_produtos` | Escopo/produtos do contrato | Confirmar existencia, FKs com `contratos`/`produtos_auditoria`, RLS e origem. |
| `procedimentos_auxiliares` | Cabecalho de procedimentos auxiliares | Confirmar existencia, tipo/status, RLS e origem. |
| `procedimento_auxiliar_documentos` | Anexos de procedimentos | Confirmar existencia, FK, RLS e relacao com bucket `documentos-balancete`. |
| `procedimento_contagem_caixa_itens` | Itens de contagem de caixa | Confirmar existencia, FK e RLS. |
| `procedimento_contagem_caixa_detalhes` | Detalhes de cedulas/moedas | Confirmar existencia, FK e RLS. |

## Usos dinamicos de from()

| Expressao | Arquivo | Interpretacao |
|---|---|---|
| `tableName` | `src/components/mcse/ImportMcseDialog.tsx:165`, `:253`, `:261` | Importacao dinamica de MCSE; revisar valores permitidos no componente. |
| `table` | `src/components/procedimentos/ImportCadastroAuxiliarDialog.tsx:121`, `:124` | Importacao generica de cadastros auxiliares; revisar valores recebidos por props. |

## RPCs usadas pelo frontend

| RPC | Evidencia no frontend | Origem local encontrada |
|---|---|---|
| `arquivar_modelo_matriz_riscos` | `src/pages/ModelosMatrizRiscosPage.tsx:408` | `docs/sql/fase-0a3-4-modelos-matriz-riscos.sql` |
| `get_auth_users_for_linking` | `src/pages/AuditoresPage.tsx:139`, `src/pages/ClienteUsuariosPage.tsx:79` | `supabase/migrations/20260408141802_6af33dfb-21c1-4e05-876c-f3333a38ee01.sql`, `20260408144457_6ea34b74-aff0-4e40-bf69-fd9ac52b1451.sql`, `20260503114517_47d0c9e8-dad8-43f7-a7d8-7fd5e74134fb.sql` |
| `link_auditor_account` | `src/pages/AuditoresPage.tsx:152` | `supabase/migrations/20260403165817_cbc2c99c-c79e-4a9c-a67d-f20295a37879.sql`, `20260407191458_b0df98d8-e70c-4a0d-903c-441520170ebd.sql`, `20260408141802_6af33dfb-21c1-4e05-876c-f3333a38ee01.sql` |
| `link_auditor_by_email` | `src/pages/AuditoresPage.tsx:130` | `supabase/migrations/20260408144855_036cc2b9-f863-4d7c-bd61-63d5f9f333ff.sql`, `20260408162848_24290503-a989-4a84-8220-3f942e756dca.sql` |
| `publicar_modelo_matriz_riscos` | `src/pages/ModelosMatrizRiscosPage.tsx:393` | `docs/sql/fase-0a3-4-modelos-matriz-riscos.sql` |
| `set_cliente_modalidade_principal` | `src/components/cliente/ClienteModalidadesDialog.tsx:133` | `docs/sql/fase-0a3-2-cliente-modalidades-atuacao.sql` |

## Buckets de Storage

| Bucket | Uso no frontend | Declaracao local |
|---|---|---|
| `documentos-balancete` | `src/components/balancete/DocumentosReferenciaBlock.tsx:51`, `src/components/procedimentos/DocumentosProcedimentoPanel.tsx:23`, `:76`, `:108`, `:118` | `supabase/migrations/20260403112947_de96fbba-d6c1-47c6-b396-58371defc194.sql` e policies posteriores em migrations de abril/maio |
| `solicitacao-documentos` | `src/components/cliente/ClienteItemDocumentos.tsx:76`, `:118`, `src/components/solicitacao/ItemDocumentosPanel.tsx:120`, `:197`, `src/components/balancete/LinkedDocsBlock.tsx:47` | `supabase/migrations/20260412002100_af2caee6-2b13-4ae3-b5fb-40720adad2ee.sql`, `supabase/migrations/20260503114517_47d0c9e8-dad8-43f7-a7d8-7fd5e74134fb.sql` |

## Policies locais por alvo

Este mapa conta definicoes `CREATE POLICY` locais por alvo. O SQL `docs/sql/p0-diagnostico-supabase.sql` lista as policies reais ativas no Supabase.

| Alvo | Definicoes locais |
|---|---:|
| `public.auditores` | 19 |
| `public.balancete_linha_documentos` | 9 |
| `public.balancete_linhas` | 18 |
| `public.balancetes` | 17 |
| `public.cliente_classes_faturamento` | 4 |
| `public.cliente_contas_origem` | 16 |
| `public.cliente_mapeamento_mcse` | 16 |
| `public.cliente_modalidades_atuacao` | 4 |
| `public.cliente_municipios_faturamento` | 4 |
| `public.cliente_parametros` | 16 |
| `public.cliente_usuarios` | 6 |
| `public.clientes` | 12 |
| `public.documentos_referencia_balancete` | 22 |
| `public.empresa_auditoria` | 8 |
| `public.estruturas_auditoria` | 4 |
| `public.exercicios` | 16 |
| `public.mcse_contas` | 8 |
| `public.mcse_grupos` | 8 |
| `public.mcse_regras_conta` | 8 |
| `public.mcse_regras_documentos` | 4 |
| `public.mcse_regras_emissao_erp` | 4 |
| `public.mcse_regras_instrucoes` | 4 |
| `public.mcse_subgrupos` | 8 |
| `public.modalidades_atuacao` | 4 |
| `public.modelo_matriz_risco_item_vinculos` | 4 |
| `public.modelo_matriz_risco_itens` | 4 |
| `public.modelos_matriz_riscos` | 4 |
| `public.papeis_trabalho` | 17 |
| `public.papel_trabalho_linhas` | 17 |
| `public.procedimento_contagem_estoque_blocos` | 4 |
| `public.procedimento_contagem_estoque_itens` | 4 |
| `public.procedimento_faturas_aberto_itens` | 4 |
| `public.procedimento_faturas_aberto_lotes` | 4 |
| `public.produtos_auditoria` | 4 |
| `public.segmentos` | 4 |
| `public.solicitacao_item_documentos` | 8 |
| `public.solicitacao_itens` | 8 |
| `public.solicitacoes_documentos` | 5 |
| `public.trabalho_auditores` | 11 |
| `public.trabalho_materialidade` | 4 |
| `public.trabalho_materialidade_bases` | 4 |
| `public.trabalho_planejamento` | 4 |
| `public.trabalho_planejamento_modalidades` | 4 |
| `public.trabalho_riscos_auditoria` | 4 |
| `public.trabalhos_auditoria` | 14 |
| `storage.objects` | 17 |

Sem policy local encontrada porque tambem nao possuem `CREATE TABLE` local: `contratos`, `contrato_produtos`, `procedimentos_auxiliares`, `procedimento_auxiliar_documentos`, `procedimento_contagem_caixa_itens`, `procedimento_contagem_caixa_detalhes`.

## Funcoes SQL/RLS locais

Funcoes criticas para P0:

- Identidade e acesso: `is_admin`, `is_cliente_usuario`, `get_my_auditor_id`, `get_accessible_trabalho_ids`, `get_accessible_cliente_ids`, `get_cliente_usuario_cliente_id`.
- Storage: `can_access_storage_doc`, `can_access_sol_storage_doc`.
- Auth/vinculo: `get_auth_users_for_linking`, `link_auditor_account`, `link_auditor_by_email`.
- Modelos e riscos: `can_manage_modelos_matriz_riscos`, `can_publish_modelos_matriz_riscos`, `publicar_modelo_matriz_riscos`, `arquivar_modelo_matriz_riscos`, `can_importar_riscos_modelo_trabalho`, `importar_riscos_modelo_para_trabalho`.
- Planejamento/modalidades: `can_manage_trabalho_planejamento_modalidades`, `validar_modalidades_antes_aprovar_planejamento`, `validar_trabalho_planejamento_modalidade`, `bloquear_delete_trabalho_planejamento_modalidade`.
- Integridade/trigger: `update_updated_at_column`, `prevent_self_privilege_escalation`, `has_any_admin`, `validar_modelo_matriz_riscos`, `validar_modelo_matriz_risco_item`, `validar_modelo_risco_item_vinculo`, `bloquear_delete_modelos_matriz_riscos`, `bloquear_delete_modelo_matriz_risco_item`, `bloquear_delete_modelo_risco_item_vinculo`, `calc_contagem_estoque_item`, `flag_qtd_sistema_ajustada`, `proteger_alteracao_segmento_cliente`, `proteger_modalidade_com_clientes_ativos`, `validar_coerencia_cliente_modalidade`, `set_cliente_modalidade_principal`.

## Regras criticas que parecem depender da UI

Estas regras nao devem ser tratadas como vulnerabilidades confirmadas sem executar testes no Supabase real. O ponto P0 e validar se existe enforcement server-side equivalente.

| Regra | Evidencia no frontend | Evidencia SQL local | Risco se ficar so no frontend |
|---|---|---|---|
| Alcada para aprovar planejamento | `src/components/trabalhos/TrabalhoPlanejamentoDialog.tsx:172-187`, `:445-459` | `docs/sql/fase-0a1-planejamento-materialidade.sql` permite update por `is_admin()` ou trabalho acessivel; nao mostra matriz admin/socio/gerente/senior responsavel no trecho local avaliado. | Auditor com acesso ao trabalho poderia tentar update direto para `status_planejamento='aprovado'`. |
| Alcada para aprovar materialidade | `src/components/trabalhos/TrabalhoPlanejamentoDialog.tsx:187-192`, `:496-512` | `docs/sql/fase-0a1-planejamento-materialidade.sql` permite update por `is_admin()` ou trabalho acessivel; nao mostra matriz admin/socio/gerente. | Auditor com acesso ao trabalho poderia tentar update direto para `status_materialidade='aprovada'`. |
| Validacoes de campos obrigatorios na aprovacao | `src/components/trabalhos/TrabalhoPlanejamentoDialog.tsx:435-492` | SQL local tem `CHECK` de status e unicidade de vigente, mas nao comprova todos os campos obrigatorios de aprovacao. | Registros aprovados incompletos podem ser gravados por chamada direta. |
| Limite de 3 bases ativas de materialidade | `src/components/trabalhos/MaterialidadeBasesPanel.tsx:89`, `:227-231`, `:314-319` | `docs/sql/fase-0a1-materialidade-bases.sql` tem RLS por acesso ao trabalho, sem limite de 3 bases no trecho local avaliado. | Usuario com acesso poderia criar mais bases ativas por chamada direta. |
| Importacao de riscos por modelo | `src/components/trabalhos/TrabalhoRiscosPanel.tsx:219-225`, `src/components/trabalhos/TrabalhoRiscosImportDialog.tsx:79`, `:99` | `docs/sql/fase-0a3-7-importar-riscos-modelo-trabalho.sql` define `can_importar_riscos_modelo_trabalho`. | Menor risco local, mas precisa validar grants e comportamento real por perfil. |

## Checklist P0 por perfil

Use `docs/sql/p0-diagnostico-supabase.sql` para inventario estrutural. Depois faca os testes comportamentais via app ou Supabase client autenticado como cada perfil.

### Administrador

- Confirmar que `is_admin()` retorna verdadeiro.
- Confirmar acesso de leitura/escrita aos cadastros administrativos.
- Aprovar planejamento em rascunho.
- Aprovar materialidade em rascunho.
- Confirmar upload/leitura/remocao esperada nos buckets `documentos-balancete` e `solicitacao-documentos`.

### Auditor vinculado ao trabalho

- Confirmar que `get_accessible_trabalho_ids()` retorna o trabalho esperado.
- Confirmar leitura de trabalho, balancete, PTA, solicitacoes e procedimentos do trabalho.
- Testar aprovacao de planejamento com `senior` responsavel principal.
- Testar aprovacao de planejamento com `senior` nao responsavel; deve falhar se a regra oficial for a da UI.
- Testar aprovacao de materialidade com `gerente` ou superior.
- Testar aprovacao de materialidade com `senior` e `assistente`; deve falhar se a regra oficial for a da UI.

### Auditor sem vinculo ao trabalho

- Confirmar que o trabalho nao aparece nas consultas normais.
- Tentar ler diretamente trabalho, balancetes, PTA, solicitacoes e procedimentos do trabalho nao vinculado; deve falhar ou retornar vazio.
- Tentar update direto em planejamento/materialidade de trabalho nao vinculado; deve falhar.
- Tentar acessar arquivos de storage de trabalho nao vinculado; deve falhar.

### Cliente usuario

- Confirmar que `is_cliente_usuario()` retorna verdadeiro.
- Confirmar que `get_cliente_usuario_cliente_id()` retorna apenas o cliente vinculado.
- Confirmar que o portal lista apenas solicitacoes do cliente vinculado.
- Testar acesso cruzado a solicitacao, item e documento de outro cliente; deve falhar ou retornar vazio.
- Testar upload em `solicitacao-documentos` apenas para item permitido.
- Confirmar bloqueio de acesso a area interna e tabelas administrativas.

## Script de diagnostico

O script somente-leitura para executar no Supabase real esta em `docs/sql/p0-diagnostico-supabase.sql`.

Resultados esperados:

- `missing_expected_frontend_tables` sem linhas, ou com justificativa formal para cada ausencia.
- `rls_status_expected_tables` com RLS habilitada nas tabelas sensiveis.
- `active_policies_for_expected_tables` com policies reais compativeis com a matriz de acesso.
- `missing_expected_functions` sem funcoes criticas ausentes.
- `missing_expected_buckets` sem buckets ausentes.
- `storage_policies_for_expected_buckets` com policies reais para os dois buckets.
