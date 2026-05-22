# Manual Técnico

Este documento consolida a visão técnica atual do sistema a partir do repositório local, SQLs existentes, migrations, uso real das tabelas no frontend e documentação operacional em `docs/manual/`.

Observação: inferido a partir do código.

## 1. Objetivo do manual técnico

Orientar manutenção, evolução e validação técnica do sistema, descrevendo arquitetura, stack, módulos, clients Supabase, padrões de acesso a dados, RLS, storage, SQLs manuais, migrations, drift de schema, tipagem TypeScript e pontos críticos.

Este manual não autoriza alteração de código, banco, SQL, migrations ou `types.ts`.

## 2. Público-alvo

- Desenvolvedores e agentes técnicos.
- Administradores técnicos do Supabase.
- Responsáveis por manutenção, QA e implantação.
- Pessoas que precisam entender riscos de schema, RLS, storage e tipagem antes de evoluir o sistema.

## 3. Visão geral da arquitetura

O sistema é uma aplicação frontend React que usa Supabase externo como backend.

Arquitetura resumida:

- Frontend: React + TypeScript + Vite.
- UI: Tailwind, shadcn/ui e Radix UI.
- Estado remoto/cache: TanStack React Query.
- Backend: Supabase externo, via PostgREST e Supabase Auth.
- Banco: PostgreSQL gerenciado pelo Supabase.
- Segurança: RLS/policies e funções auxiliares.
- Storage: buckets para documentos de balancete, procedimentos e solicitações.
- Importação/exportação: módulos específicos usam `xlsx`, HTML/PDF e componentes de dashboard.

Pendente de validação no Supabase real.

## 4. Stack principal

Dependências identificadas em `package.json`:

| Categoria | Bibliotecas |
|---|---|
| Frontend | `react`, `react-dom`, `react-router-dom` |
| Build/dev | `vite`, `typescript`, `@vitejs/plugin-react-swc` |
| Dados | `@supabase/supabase-js`, `@tanstack/react-query` |
| UI | `@radix-ui/*`, shadcn/ui local, `tailwindcss`, `tailwind-merge`, `class-variance-authority` |
| Formulários/validação | `react-hook-form`, `@hookform/resolvers`, `zod` |
| Ícones | `lucide-react` |
| Gráficos | `recharts` |
| Planilhas/importação | `xlsx` |
| Datas | `date-fns` |
| Toast/tema | `sonner`, `next-themes` |
| Testes | `vitest`, `@testing-library/react`, `@playwright/test` |

Não foram encontradas instruções nesta fase para executar build ou testes.

## 5. Estrutura de pastas

| Pasta | Finalidade | Exemplos | Módulos relacionados | Observações técnicas |
|---|---|---|---|---|
| `src/pages` | Páginas roteadas | `TrabalhosPage.tsx`, `SolicitacoesPage.tsx`, `PapeisTrabalhoPage.tsx` | Módulos principais | Contém páginas internas, hubs e portal cliente |
| `src/pages/hubs` | Hubs de navegação | `TrabalhosHubPage.tsx`, `AdministracaoHubPage.tsx` | Navegação | Agrupa módulos por domínio |
| `src/pages/cliente` | Portal do cliente | `ClienteSolicitacoesPage.tsx`, `ClientePendenciasPage.tsx` | Portal cliente | Rotas restritas ao `cliente_usuario` |
| `src/components` | Layouts, UI e componentes de domínio | `AppLayout.tsx`, `ClienteLayout.tsx`, `PageHeader.tsx` | Geral | Também contém subpastas de domínio |
| `src/components/trabalhos` | Planejamento, materialidade, bases e riscos | `TrabalhoPlanejamentoDialog.tsx`, `MaterialidadeBasesPanel.tsx`, `TrabalhoRiscosPanel.tsx` | Trabalhos | Usa tabelas recentes e `as any` |
| `src/components/pta` | PTA e vínculo com balancete/materialidade | `GerarPtaDialog.tsx`, `PtaDetailDialog.tsx`, `MaterialidadeBaseSelect.tsx` | PTA | Contém snapshot de base de materialidade |
| `src/components/procedimentos` | Procedimentos auxiliares | `FaturasEmAbertoPanel.tsx`, `ContagemCaixaPanel.tsx`, `ContagemEstoquePanel.tsx` | Procedimentos | Forte uso de tabelas recentes |
| `src/components/solicitacao` | Documentos e vínculo com balancete | `ItemDocumentosPanel.tsx`, `VincularBalanceteDialog.tsx` | Solicitações | Usa bucket `solicitacao-documentos` |
| `src/components/cliente` | Componentes do portal | `ClienteItemDocumentos.tsx` | Portal cliente | Upload PDF e versionamento |
| `src/components/balancete` | Importação e detalhe de balancete | `ImportBalanceteFlow.tsx`, `BalanceteLinhaDetailDialog.tsx` | Balancetes | Usa `xlsx` e mapeamento MCSE |
| `src/components/regras` | Regras documentais e instruções | `RegrasDocumentosPanel.tsx`, `RegrasInstrucoesPanel.tsx`, `RegrasEmissaoErpPanel.tsx` | MCSE/regras | Alimenta solicitações |
| `src/lib` | Serviços e utilitários | `supabase-client.ts`, `solicitacao-service.ts`, `solicitacao-pdf.ts` | Dados/serviços | Principal ponto de client Supabase usado pelo app |
| `src/hooks` | Hooks de perfil, estrutura e empresa | `useUserProfile.ts`, `useCurrentAuditor.ts`, `useEstruturaAtiva.ts` | Autenticação/perfil | Alguns hooks são tolerantes a schema ausente |
| `src/integrations/supabase` | Client gerado e tipos | `client.ts`, `types.ts` | Supabase | `types.ts` está defasado para tabelas recentes |
| `docs/manual` | Manuais consolidados | `04-manual-tecnico.md`, `05-dicionario-dados.md` | Documentação | Fase D |
| `docs/sql` | SQLs manuais/documentais | `fase-0a1-*.sql`, `fase-0a2-riscos-auditoria.sql` | Banco | Nem todo script é migration formal |
| `supabase/migrations` | Migrations versionadas | `2026*.sql` | Banco | Precisa reconciliar com Supabase real |

## 6. Roteamento e controle de acesso

O roteamento principal está em `src/App.tsx`.

Padrão identificado:

- `AuthGate` valida sessão Supabase.
- `useUserProfile` identifica `auditor`, `cliente_usuario` ou `sem_vinculo`.
- Auditores usam `AppLayout`.
- Clientes usam `ClienteLayout`.
- Usuário sem vínculo vai para tela/estado sem acesso configurado.

Rotas do cliente identificadas:

- `/cliente/solicitacoes`
- `/cliente/pendencias`

Observação: inferido a partir do código.

## 7. Autenticação e perfis

A autenticação usa Supabase Auth.

Perfis identificados pelo frontend:

| Perfil | Como é identificado | Área |
|---|---|---|
| Auditor interno | `auth_user_id` em `auditores` | Layout interno |
| `cliente_usuario` | `auth_user_id` ativo em `cliente_usuarios` | Portal cliente |
| Sem vínculo | Usuário Auth sem auditor/cliente ativo | Sem acesso operacional |

Perfis de auditor identificados em `perfil_acesso`:

- `assistente`
- `senior`
- `gerente`
- `socio`
- `admin`

Alçadas observadas:

- Planejamento: `admin`, `socio`, `gerente` e `senior` quando responsável principal.
- Materialidade: `admin`, `socio` e `gerente`.

Observação: inferido a partir do código. Alçadas implementadas no frontend precisam validação server-side.

## 8. Supabase externo

O backend efetivo é Supabase externo. O sistema usa:

- Supabase Auth.
- PostgREST para queries.
- PostgreSQL.
- RLS/policies.
- Storage.

O repositório contém `supabase/config.toml` e migrations locais, mas isso não prova que o Supabase real esteja reproduzível somente a partir do repositório.

Pendente de validação no Supabase real.

## 9. Clients Supabase

Foram encontrados dois clients:

### `src/lib/supabase-client.ts`

- Usado majoritariamente pelo código atual.
- Importa `Database` de `src/integrations/supabase/types.ts`.
- Contém URL e anon key diretamente no arquivo.
- Não documentar nem copiar credenciais em manuais ou tickets.

### `src/integrations/supabase/client.ts`

- Arquivo gerado.
- Usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Comentário orienta importação via `@/integrations/supabase/client`.

### `src/integrations/supabase/types.ts`

- Tipos gerados do Supabase.
- Não reflete completamente tabelas recentes.

Risco técnico:

- Duplicidade de client pode gerar divergência de configuração, autenticação, headers, storage e RLS.
- O client oficial do app precisa ser consolidado em fase própria.

Pendente de validação no Supabase real.

## 10. Padrão de acesso a dados

Padrões encontrados:

- Queries diretas com `supabase.from(...).select/insert/update/delete`.
- Cache e carregamento via TanStack Query.
- Mutations com `useMutation`.
- Upload/download via `supabase.storage.from(...)`.
- Serviços em `src/lib`, principalmente para solicitações e utilitários de balancete.
- Importação de planilhas via `xlsx`.

Não há camada única de repositórios/DAOs. Acesso a dados está distribuído em páginas, componentes e serviços.

## 11. Principais módulos funcionais

### Dashboard

- Arquivos: `src/pages/DashboardPage.tsx`, `src/components/dashboard/QuickActions.tsx`.
- Tabelas: `clientes`, `auditores`, `trabalhos_auditoria`, `solicitacoes_documentos`, `solicitacao_itens`, `trabalho_auditores`.
- Operações: contagens, listagens e indicadores.
- Limitações: indicadores dependem de RLS real e perfil logado.

### Clientes

- Arquivos: `ClientesPage.tsx`, `supabase-queries.ts`, `useSegmentos.ts`.
- Tabelas: `clientes`, `exercicios`, `cliente_parametros`, `segmentos`.
- Operações: CRUD de cliente, exercícios e parâmetros.
- Limitações: `segmentos` é tolerante a ausência de schema.

### Auditores

- Arquivos: `AuditoresPage.tsx`, `useCurrentAuditor.ts`.
- Tabelas: `auditores`, `trabalho_auditores`.
- Operações: cadastro, edição, inativação, vínculo Auth, exclusão.
- Limitações: RPCs de vínculo precisam existir no Supabase real.

### Trabalhos de Auditoria

- Arquivos: `TrabalhosPage.tsx`.
- Tabelas: `trabalhos_auditoria`, `clientes`, `exercicios`, `contratos`, `contrato_produtos`.
- Operações: criar/editar trabalho, status, contratos/produtos e controle de horas.
- Limitações: `contratos` e `contrato_produtos` usam `as any`; origem local precisa validação.

### Equipe do Trabalho

- Arquivos: `TrabalhosPage.tsx`, `PtaDetailDialog.tsx`, `TrabalhoPlanejamentoDialog.tsx`.
- Tabelas: `trabalho_auditores`, `auditores`.
- Operações: inserir, atualizar papel, marcar responsável principal, remover.
- Dependências: `get_accessible_trabalho_ids`.
- Limitações: impacto de remoção de equipe em acessos deve ser testado.

### Planejamento

- Arquivo: `TrabalhoPlanejamentoDialog.tsx`.
- Tabela: `trabalho_planejamento`.
- Operações: criar/editar rascunho, aprovar.
- Dependências: auditor logado e equipe do trabalho.
- Limitações: alçada observada no frontend; Pendente de validação no Supabase real.

### Materialidade

- Arquivo: `TrabalhoPlanejamentoDialog.tsx`.
- Tabela: `trabalho_materialidade`.
- Operações: criar/editar rascunho, aprovar, marcar vigente.
- Limitações: nova versão/substituição ainda não está implementada como fluxo completo.

### Bases de Materialidade

- Arquivos: `MaterialidadeBasesPanel.tsx`, `MaterialidadeBaseSelect.tsx`.
- Tabela: `trabalho_materialidade_bases`.
- Operações: criar, editar, inativar/reativar, selecionar no PTA.
- Dependências: `balancetes`, `balancete_linhas`, `trabalho_materialidade`.
- Limitações: limite de 3 bases ativas observado na UI; Pendente de validação no Supabase real.

### Matriz de Riscos

- Arquivo: `TrabalhoRiscosPanel.tsx`.
- Tabela: `trabalho_riscos_auditoria`.
- Operações: criar, editar, inativar/reativar, filtrar e calcular nível sugerido.
- Dependências: `mcse_contas`, `auditores`.
- Limitações: sem vínculo formal 0B com PTA, procedimentos, solicitações, evidências, regras ou bases. Ainda não implementado.

### Balancetes

- Arquivos: `BalancetesPage.tsx`, `ImportBalanceteFlow.tsx`, `BalanceteLinhasTable.tsx`, `BalanceteLinhaDetailDialog.tsx`.
- Tabelas: `balancetes`, `balancete_linhas`, `cliente_contas_origem`, `cliente_mapeamento_mcse`, `documentos_referencia_balancete`.
- Operações: importação XLS/CSV, mapeamento, validação, comentários, pendências e documentos.
- Limitações: alterações em linhas vinculadas a PTA fechado podem ser bloqueadas.

### PTA / Papéis de Trabalho

- Arquivos: `PapeisTrabalhoPage.tsx`, `GerarPtaDialog.tsx`, `PtaDetailDialog.tsx`, `PtaVincularLinhasDialog.tsx`.
- Tabelas: `papeis_trabalho`, `papel_trabalho_linhas`, `balancete_linhas`, `trabalho_materialidade_bases`.
- Operações: geração automática/manual, vínculo de linhas, edição, status, fechamento, snapshot de base.
- Limitações: PTA fechado/concluído/finalizado fica somente leitura.

### MCSE / Plano de Contas / Regras

- Arquivos: `McsePage.tsx`, `PlanoContasPage.tsx`, `MapeamentoPage.tsx`, `RegrasPage.tsx`, componentes em `src/components/regras`.
- Tabelas: `mcse_grupos`, `mcse_subgrupos`, `mcse_contas`, `cliente_contas_origem`, `cliente_mapeamento_mcse`, `mcse_regras_conta`, `mcse_regras_documentos`, `mcse_regras_instrucoes`, `mcse_regras_emissao_erp`.
- Operações: cadastro/importação, mapeamento, regras, documentos, instruções e ERP.
- Limitações: vínculo formal com matriz de riscos ainda não implementado.

### Solicitações Documentais

- Arquivos: `SolicitacoesPage.tsx`, `solicitacao-service.ts`, `solicitacao-pdf.ts`, `ItemDocumentosPanel.tsx`.
- Tabelas: `solicitacoes_documentos`, `solicitacao_itens`, `solicitacao_item_documentos`, `balancete_linha_documentos`.
- Operações: gerar por regras, revisar, salvar rascunho, gerar PDF/HTML, analisar documentos.
- Dependências: balancete, MCSE e regras documentais.

### Portal do Cliente

- Arquivos: `ClienteLayout.tsx`, `ClienteSolicitacoesPage.tsx`, `ClientePendenciasPage.tsx`, `ClienteItemDocumentos.tsx`.
- Tabelas: `cliente_usuarios`, `solicitacoes_documentos`, `solicitacao_itens`, `solicitacao_item_documentos`.
- Storage: `solicitacao-documentos`.
- Operações: listar solicitações, pendências, upload PDF, reenvio/complemento.
- Limitações: isolamento por cliente precisa testes no Supabase real.

### Procedimentos Auxiliares

- Arquivos: `ProcedimentosAuxiliaresPage.tsx`, `ProcedimentoDetailDialog.tsx`, `ExecucaoProcedimentoPanel.tsx`, `DocumentosProcedimentoPanel.tsx`.
- Tabelas: `procedimentos_auxiliares`, `procedimento_auxiliar_documentos`.
- Operações: criar procedimento, anexar documentos, registrar conclusão.
- Limitações: algumas tabelas aparecem no código com `as any`; Pendente de validação no Supabase real.

### Faturas em Aberto

- Arquivos: `FaturasEmAbertoPanel.tsx`, `FaturasEmAbertoDashboard.tsx`, `ImportFaturasAbertoDialog.tsx`, cadastros auxiliares.
- Tabelas: `procedimento_faturas_aberto_lotes`, `procedimento_faturas_aberto_itens`, `cliente_classes_faturamento`, `cliente_municipios_faturamento`.
- Operações: importar XLS/CSV, validar, consultar itens, dashboard e cadastros auxiliares.
- Limitações: cliente_usuario bloqueado conforme SQL manual; Pendente de validação no Supabase real.

### Contagem de Caixa

- Arquivos: `ContagemCaixaPanel.tsx`, `ContagemCaixaInlineGrid.tsx`, `TermoContagemCaixa.tsx`.
- Tabelas: `procedimento_contagem_caixa_itens`, `procedimento_contagem_caixa_detalhes`.
- Operações: registrar caixas e detalhes de cédulas/moedas.
- Limitações: `CREATE TABLE` local não foi encontrado no inventário anterior; Pendente de validação no Supabase real.

### Contagem de Estoque

- Arquivos: `ContagemEstoquePanel.tsx`, `ContagemEstoqueBlocoDetail.tsx`, `ImportItensEstoqueDialog.tsx`, `DashboardEstoquesPage.tsx`.
- Tabelas: `procedimento_contagem_estoque_blocos`, `procedimento_contagem_estoque_itens`.
- Operações: blocos, itens, importação, contagem e dashboard.
- Origem: `docs/sql/contagem-estoque*.sql`.

### Contratos / Produtos

- Arquivos: `ContratosPage.tsx`, `ContratoDetailDialog.tsx`, `ContratoEscopoTab.tsx`, `ProdutosAuditoriaPage.tsx`.
- Tabelas: `contratos`, `contrato_produtos`, `produtos_auditoria`.
- Operações: contratos por cliente, produtos de contrato e produtos de auditoria.
- Limitações: `contratos` e `contrato_produtos` precisam validação de origem local.

### Relatórios/exportações

- Identificados: geração de PDF/HTML de solicitações e export template MCSE.
- Arquivos: `solicitacao-pdf.ts`, `ExportMcseTemplate.tsx`.
- Relatórios persistidos centralizados: Ainda não implementado.

## 12. Relação entre módulos

Encadeamento técnico principal:

`clientes -> exercicios -> trabalhos_auditoria -> trabalho_auditores -> planejamento/materialidade/riscos -> balancetes -> PTA -> solicitacoes -> portal cliente -> procedimentos`

Dependências importantes:

- `trabalhos_auditoria` concentra planejamento, materialidade, riscos, balancetes, PTA, solicitações e procedimentos.
- `mcse_contas` alimenta regras, balancetes, PTA e riscos.
- `mcse_regras_conta` alimenta solicitações documentais.
- `cliente_usuarios` controla portal do cliente.
- Storage depende de escopo por trabalho, solicitação, item ou cliente.

## 13. Planejamento, Materialidade e Matriz de Riscos

Esses módulos foram adicionados em fases recentes e dependem de SQLs em `docs/sql`.

SQLs relevantes encontrados:

- `fase-0a1-planejamento-materialidade.sql`
- `fase-0a1-materialidade-bases.sql`
- `fase-0a1-vinculo-materialidade-base-pta.sql`
- `fase-0a2-riscos-auditoria.sql`

Pendente de validação no Supabase real.

## 14. PTA e Balancetes

Balancetes são a base de análise contábil e de geração de PTA. PTAs podem ser gerados automaticamente por conta MCSE ou criados manualmente.

Campos recentes em PTA preservam snapshot de base de materialidade:

- `materialidade_base_id`
- `materialidade_base_nome_snapshot`
- `materialidade_base_valor_snapshot`
- `materialidade_base_percentual_snapshot`
- `materialidade_base_saldo_snapshot`
- `materialidade_base_codigo_conta_snapshot`
- `materialidade_base_descricao_conta_snapshot`
- `materialidade_base_criterio_snapshot`

Snapshot preserva o valor ou identificação no momento da operação, evitando perda de contexto se a origem mudar posteriormente.

## 15. Solicitações Documentais e Portal do Cliente

Solicitações são geradas a partir de trabalho, balancete e regras MCSE.

Portal do cliente:

- Lista solicitações do cliente.
- Mostra pendências.
- Permite upload de PDF.
- Cria nova versão a cada envio.
- Usa bucket `solicitacao-documentos`.

Pendente de validação no Supabase real: isolamento de dados por cliente e storage policies.

## 16. Procedimentos Auxiliares

Procedimentos auxiliares têm cabeçalho comum e painéis específicos por tipo.

Tipos identificados:

- Faturas em aberto.
- Contagem de caixa.
- Contagem de estoque.
- Outros hubs/placeholders.

Ordens de compra e ordens de imobilização aparecem como escopo/placeholder, mas execução específica completa não foi encontrada. Ainda não implementado.

## 17. MCSE, regras e mapeamentos

O MCSE é a estrutura de referência contábil usada por mapeamentos, regras, solicitações, balancetes e PTA.

Pontos técnicos:

- Estruturas por segmento foram adicionadas em `docs/sql/segmentos-estruturas-auditoria.sql`.
- Hooks e serviços tratam ausência de `segmentos`/`estruturas_auditoria` de modo tolerante.
- Regras documentais têm documentos, instruções e trilhas ERP.
- Alterações em regras impactam solicitações futuras.

## 18. Storage e documentos

Buckets identificados:

- `documentos-balancete`
- `solicitacao-documentos`

Usos:

- `documentos-balancete`: documentos de referência do balancete e documentos de procedimentos.
- `solicitacao-documentos`: PDFs enviados no portal do cliente e analisados pelo auditor.

Funções relacionadas:

- `can_access_storage_doc`
- `can_access_sol_storage_doc`

Pendente de validação no Supabase real: policies efetivamente aplicadas e isolamento por cliente/trabalho.

## 19. RLS e segurança

Funções conhecidas:

- `is_admin`
- `is_cliente_usuario`
- `get_accessible_trabalho_ids`
- `get_accessible_cliente_ids`
- `get_cliente_usuario_cliente_id`
- `get_my_auditor_id`
- `can_access_storage_doc`
- `can_access_sol_storage_doc`

Padrões esperados:

- `cliente_usuario` não acessa área interna.
- Auditor acessa trabalhos permitidos.
- Admin tem acesso amplo.
- DELETE, quando permitido, tende a ser restrito.
- Frontend não substitui RLS.

Pendente de validação no Supabase real.

## 20. SQLs manuais, migrations e drift de schema

`docs/sql` contém scripts manuais/documentais de fases recentes.

`supabase/migrations` contém migrations versionadas históricas.

Riscos:

- Parte do schema pode ter sido criada manualmente no Supabase.
- Nem todo SQL manual virou migration formal.
- `types.ts` pode ficar desatualizado.
- Frontend pode depender de tabelas/campos ainda não presentes em ambiente novo.
- Policies locais podem não corresponder ao ambiente real.

Regra técnica:

- SQL manual só deve ser executado em fase própria, com revisão, ambiente correto, registro e validação pós-execução.

## 21. Tipagem TypeScript e types.ts

`src/integrations/supabase/types.ts` existe, mas está desatualizado para módulos recentes.

Sintomas:

- Uso de `as any` para tabelas recentes.
- Casts em queries com tabelas não tipadas.
- Comentários indicando que tipos precisam ser regenerados após SQL.

Pendente de validação no Supabase real: regenerar tipos a partir do schema efetivo em fase autorizada.

## 22. Uso de as any

`as any` aparece em:

- Tabelas recentes de planejamento, materialidade, bases e riscos.
- Procedimentos auxiliares.
- Faturas em aberto.
- Contratos e produtos de contrato.
- Segmentos e estruturas.
- Importações XLS/CSV.
- Status/enums ainda não refletidos em `types.ts`.

Risco:

- Perda de segurança de tipo.
- Erros silenciosos em campos/tabelas.
- Maior dificuldade de refatoração.

Recomendação:

1. Validar schema real.
2. Regenerar `types.ts`.
3. Remover `as any` por módulo.
4. Adicionar testes de regressão nos fluxos críticos.

## 23. Padrões recomendados para novas fases

- Ler o código antes de alterar.
- Separar fase de documentação, código e banco.
- Não executar SQL fora de fase própria.
- Documentar origem de tabelas: código, docs/sql, migration ou inferência.
- Evitar criar novo client Supabase.
- Preferir `src/lib/supabase-client.ts` enquanto o app não for consolidado.
- Para tabelas novas, planejar SQL, RLS, storage, types e documentação juntos.
- Validar perfis: admin, auditor vinculado, auditor não vinculado e cliente.
- Atualizar manual/dicionário ao final de fases funcionais.

## 24. Pontos críticos de manutenção

- Client Supabase duplicado.
- Credenciais/URL não devem ser replicadas em documentação.
- `types.ts` desatualizado.
- Uso amplo de `as any`.
- Drift entre Supabase real, `docs/sql`, migrations e frontend.
- Alçadas frontend sem validação server-side.
- Storage e RLS precisam testes reais.
- Tabelas usadas sem `CREATE TABLE` local encontrado.
- Módulos placeholder não devem ser tratados como prontos.

## 25. Limitações atuais

- Dicionário de dados ainda precisa ser validado contra o Supabase real.
- Matriz de permissões/RLS ainda precisa de testes reais.
- Riscos ainda não fecham ciclo formal com PTA/procedimentos/solicitações/evidências.
- Relatórios persistidos centralizados ainda não implementados.
- Nova versão de materialidade não está implementada como fluxo completo.
- Alguns módulos usam tolerância a schema ausente.
- Encoding ainda apresenta sinais de inconsistência em partes do repositório/documentação.

## 26. Backlog técnico relacionado

- Reconciliar schema real versus repositório.
- Confirmar SQLs de `docs/sql` aplicados.
- Regenerar `types.ts`.
- Reduzir `as any`.
- Consolidar client Supabase.
- Criar política formal de SQL manual versus migration.
- Validar RLS e storage policies por perfil.
- Converter ou registrar scripts manuais críticos.
- Criar testes mínimos por fluxo crítico.
- Atualizar README em fase própria.
