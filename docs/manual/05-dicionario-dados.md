# Dicionário de Dados Inicial

Este dicionário consolida as tabelas identificadas no código, em `docs/sql`, em `supabase/migrations` e na documentação operacional.

Observação: inferido a partir do código. Pendente de validação no Supabase real.

## Como ler este documento

Cada tabela é descrita com:

| Campo | Descrição |
|---|---|
| Finalidade | Uso principal da tabela |
| Módulo | Módulos que usam a tabela |
| Origem identificada | Código, `docs/sql`, migration ou inferido |
| Principais campos | Campos mais relevantes identificados |
| Relacionamentos | Relações percebidas no código ou SQL |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE lógico/físico ou upload |
| RLS / Segurança | Entendimento inicial de policies |
| Observações | Notas técnicas |
| Pendências | Pontos para validar |

Os campos listados são principais, não uma enumeração exaustiva.

## 1. Base cadastral

### clientes

| Campo | Descrição |
|---|---|
| Finalidade | Cadastro de clientes auditados |
| Módulo | Clientes, trabalhos, balancetes, solicitações, portal, procedimentos |
| Origem identificada | Migration e código |
| Principais campos | `id`, `razao_social`, `nome_fantasia`, `cnpj`, `status`, `segmento_id`, endereço e contatos |
| Relacionamentos | Pai de `exercicios`, `trabalhos_auditoria`, `cliente_usuarios`, `cliente_parametros` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Cliente deve acessar apenas seu próprio `cliente_id`; admin/auditor conforme policies |
| Observações | Segmento pode depender de SQL manual |
| Pendências | Pendente de validação no Supabase real |

| Campo | Finalidade | Observações |
|---|---|---|
| `razao_social` | Nome formal | Usado em listas e cabeçalhos |
| `cnpj` | Identificação fiscal | Validar formatação/regra real |
| `status` | Situação do cliente | `ativo`, `inativo`, `prospecto` no frontend |
| `segmento_id` | Segmento/estrutura aplicável | Campo tolerante a ausência de schema |

### exercicios

| Campo | Descrição |
|---|---|
| Finalidade | Períodos auditados por cliente |
| Módulo | Clientes, trabalhos, balancetes, PTA, solicitações |
| Origem identificada | Migration e código |
| Principais campos | `cliente_id`, `ano_exercicio`, `data_inicio`, `data_fim`, `status` |
| Relacionamentos | Filho de `clientes`; pai indireto de trabalhos e solicitações |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Acesso por cliente/trabalho acessível |
| Observações | Status no frontend: `aberto`, `em_andamento`, `fechado`, `arquivado` |
| Pendências | Validar FKs e policies reais |

### cliente_parametros

| Campo | Descrição |
|---|---|
| Finalidade | Parâmetros por cliente |
| Módulo | Clientes, MCSE/mapeamento |
| Origem identificada | Migration e código |
| Principais campos | `cliente_id` e parâmetros operacionais |
| Relacionamentos | Filho de `clientes` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Deve seguir escopo por cliente |
| Observações | Usado em `ClientesPage` e queries auxiliares |
| Pendências | Detalhar campos contra schema real |

### empresa_auditoria

| Campo | Descrição |
|---|---|
| Finalidade | Dados da empresa de auditoria exibidos no layout e cadastros |
| Módulo | Administração, layout interno |
| Origem identificada | Migration e código |
| Principais campos | Razão social, nome fantasia, CNPJ, contatos, registros profissionais, auditor responsável |
| Relacionamentos | Pode referenciar `auditores` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Escrita admin identificada em migrations |
| Observações | Usa `as any` no frontend |
| Pendências | Pendente de validação no Supabase real |

## 2. Usuários, perfis e acesso

### auditores

| Campo | Descrição |
|---|---|
| Finalidade | Cadastro de usuários internos/auditores |
| Módulo | Auditores, trabalhos, planejamento, riscos, permissões |
| Origem identificada | Migration e código |
| Principais campos | `nome`, `email`, `cargo`, `perfil`, `perfil_acesso`, `auth_user_id`, `ativo`, `observacoes` |
| Relacionamentos | Pai de `trabalho_auditores`; vínculo com Supabase Auth via `auth_user_id` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Admin com escrita ampla; autoedição limitada observada em migrations |
| Observações | Perfis: `assistente`, `senior`, `gerente`, `socio`, `admin` |
| Pendências | Validar RPCs de vínculo Auth no Supabase real |

### cliente_usuarios

| Campo | Descrição |
|---|---|
| Finalidade | Usuários externos vinculados a clientes |
| Módulo | Portal cliente, administração |
| Origem identificada | Migration e código |
| Principais campos | `cliente_id`, `auth_user_id`, `nome`, `email`, `ativo` |
| Relacionamentos | Filho de `clientes`; vínculo com Supabase Auth |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Cliente deve ver apenas seu próprio vínculo/cliente |
| Observações | Define perfil `cliente_usuario` em `useUserProfile` |
| Pendências | Testar isolamento por cliente no Supabase real |

## 3. Trabalhos de auditoria

### trabalhos_auditoria

| Campo | Descrição |
|---|---|
| Finalidade | Cabeçalho do trabalho de auditoria |
| Módulo | Trabalhos, planejamento, balancetes, PTA, solicitações, procedimentos |
| Origem identificada | Migration e código |
| Principais campos | `cliente_id`, `exercicio_id`, `nome_trabalho`, datas, `status_trabalho`, contrato/produto, controle de horas |
| Relacionamentos | Filho de `clientes` e `exercicios`; pai de módulos operacionais |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Acesso por admin ou trabalho acessível |
| Observações | Status: `planejado`, `iniciado`, `em_execucao`, `revisao_1`, `revisao_2`, `finalizado_para_parecer`, `encerrado` |
| Pendências | Validar status e transitions oficiais |

### trabalho_auditores

| Campo | Descrição |
|---|---|
| Finalidade | Vínculo entre auditor e trabalho |
| Módulo | Trabalhos, equipe, RLS |
| Origem identificada | Migration e código |
| Principais campos | `trabalho_auditoria_id`, `auditor_id`, `papel_no_trabalho`, `responsavel_principal` |
| Relacionamentos | Vínculo entre `trabalhos_auditoria` e `auditores` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Base para `get_accessible_trabalho_ids` |
| Observações | Papéis: `elaborador`, `revisor_1`, `revisor_2`, `gerente`, `socio` |
| Pendências | Validar efeito da remoção de auditor em acessos |

## 4. Planejamento, materialidade e riscos

### trabalho_planejamento

| Campo | Descrição |
|---|---|
| Finalidade | Planejamento do trabalho |
| Módulo | Planejamento |
| Origem identificada | `docs/sql/fase-0a1-planejamento-materialidade.sql` e código |
| Principais campos | Objetivo, escopo, estratégia, responsável, status, aprovador, premissas, limitações |
| Relacionamentos | Filho de `trabalhos_auditoria`, `clientes`, `exercicios` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | SQL manual indica admin/trabalho acessível; cliente bloqueado |
| Observações | Aprovação observada no frontend |
| Pendências | Pendente de validação no Supabase real; alçada server-side precisa teste |

| Campo | Finalidade | Observações |
|---|---|---|
| `status_planejamento` | Controla rascunho/aprovado | Bloqueios de UI dependem do status |
| `aprovado_por` | Auditor aprovador | Inferido |
| `data_aprovacao` | Data da aprovação | Inferido |

### trabalho_materialidade

| Campo | Descrição |
|---|---|
| Finalidade | Materialidade do trabalho |
| Módulo | Materialidade |
| Origem identificada | `docs/sql/fase-0a1-planejamento-materialidade.sql` e código |
| Principais campos | `base_calculo`, `percentual_aplicado`, `materialidade_global`, `materialidade_desempenho`, `limite_trivialidade`, `justificativa_tecnica`, `status_materialidade`, `versao`, `vigente` |
| Relacionamentos | Filho de `trabalhos_auditoria`; pai de `trabalho_materialidade_bases` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | SQL manual indica admin/trabalho acessível; cliente bloqueado |
| Observações | Nova versão completa ainda não implementada |
| Pendências | Pendente de validação no Supabase real |

### trabalho_materialidade_bases

| Campo | Descrição |
|---|---|
| Finalidade | Bases específicas de materialidade |
| Módulo | Bases de materialidade, PTA |
| Origem identificada | `docs/sql/fase-0a1-materialidade-bases.sql` e código |
| Principais campos | `nome_base`, `balancete_id`, `balancete_linha_id`, snapshots, critério, percentual, valor, `ativo` |
| Relacionamentos | Filho de `trabalho_materialidade`; pode referenciar `balancetes` e `balancete_linhas` |
| Operações no sistema | SELECT, INSERT, UPDATE, inativação/reativação |
| RLS / Segurança | SQL manual indica admin/trabalho acessível |
| Observações | UI limita a 3 bases ativas |
| Pendências | Validar limite server-side |

| Campo | Finalidade | Observações |
|---|---|---|
| `nome_base` | Nome da base | Exibido no PTA |
| `balancete_id` | Balancete de origem | Opcional quando valor manual |
| `balancete_linha_id` | Linha de origem | Opcional quando valor manual |
| `codigo_conta_snapshot` | Código preservado | Snapshot |
| `descricao_conta_snapshot` | Descrição preservada | Snapshot |
| `saldo_base_snapshot` | Saldo preservado | Snapshot |
| `criterio_saldo_base` | Critério de cálculo | Manual/saldo conforme UI |
| `percentual_aplicado` | Percentual da base | Pode calcular valor |
| `valor_materialidade` | Valor final da base | Usado no PTA |
| `ativo` | Visibilidade/uso | Inativação lógica |

### trabalho_riscos_auditoria

| Campo | Descrição |
|---|---|
| Finalidade | Matriz de riscos do trabalho |
| Módulo | Matriz de riscos |
| Origem identificada | `docs/sql/fase-0a2-riscos-auditoria.sql` e código |
| Principais campos | Área, conta, assertiva, risco, tipo, probabilidade, impacto, nível, resposta, responsável, status, ativo |
| Relacionamentos | Filho de `trabalhos_auditoria`; pode referenciar `mcse_contas` e `auditores` |
| Operações no sistema | SELECT, INSERT, UPDATE, inativação/reativação |
| RLS / Segurança | SQL manual indica admin/trabalho acessível; cliente bloqueado |
| Observações | Sem vínculos 0B com PTA/procedimentos/solicitações/evidências |
| Pendências | Pendente de validação no Supabase real |

| Campo | Finalidade | Observações |
|---|---|---|
| `area_ciclo` | Área/ciclo auditado | Campo crítico |
| `conta_mcse_id` | Conta relacionada | Opcional |
| `codigo_conta_snapshot` | Código preservado | Snapshot |
| `descricao_conta_snapshot` | Descrição preservada | Snapshot |
| `grupo_contabil` | Agrupamento contábil | Inferido |
| `assertiva` | Assertiva de auditoria | Campo crítico |
| `risco_identificado` | Descrição do risco | Campo crítico |
| `tipo_risco` | Classificação | Inerente/controle/distorção/fraude |
| `probabilidade` | Probabilidade | Base do nível sugerido |
| `impacto` | Impacto | Base do nível sugerido |
| `nivel_risco` | Baixo/médio/alto/crítico | Pode ser ajustado manualmente |
| `risco_significativo` | Indicador | Booleano |
| `risco_fraude` | Indicador | Booleano |
| `resposta_planejada` | Resposta do auditor | Campo crítico |
| `responsavel_id` | Auditor responsável | FK inferida |
| `status_risco` | Situação do risco | Fluxo ainda não formalizado |
| `ativo` | Inativação lógica | Não remove histórico |

## 5. MCSE, plano de contas e regras

### mcse_grupos

| Campo | Descrição |
|---|---|
| Finalidade | Grupos da estrutura MCSE |
| Módulo | MCSE |
| Origem identificada | Migration e código |
| Principais campos | `codigo_grupo`, `descricao_grupo`, `ordem`, `ativo`, `estrutura_id` |
| Relacionamentos | Pai de `mcse_subgrupos` e `mcse_contas` |
| Operações no sistema | SELECT, INSERT, UPDATE, importação |
| RLS / Segurança | Leitura autenticada; escrita admin nas policies recentes |
| Observações | `estrutura_id` depende de fases de estruturas |
| Pendências | Validar estrutura real |

### mcse_subgrupos

| Campo | Descrição |
|---|---|
| Finalidade | Subgrupos MCSE |
| Módulo | MCSE |
| Origem identificada | Migration e código |
| Principais campos | `grupo_id`, `codigo_subgrupo`, `descricao_subgrupo`, `ordem`, `ativo`, `estrutura_id` |
| Relacionamentos | Filho de `mcse_grupos`; pai de `mcse_contas` |
| Operações no sistema | SELECT, INSERT, UPDATE, importação |
| RLS / Segurança | Leitura autenticada; escrita admin |
| Observações | Usado em importação e export template |
| Pendências | Pendente de validação no Supabase real |

### mcse_contas

| Campo | Descrição |
|---|---|
| Finalidade | Contas da estrutura MCSE |
| Módulo | MCSE, balancetes, PTA, regras, riscos |
| Origem identificada | Migration e código |
| Principais campos | `codigo_mcse`, `descricao_conta`, `natureza`, `nivel`, `conta_critica`, `ativo`, `estrutura_id` |
| Relacionamentos | Filho de grupos/subgrupos; pai de regras e vínculos operacionais |
| Operações no sistema | SELECT, INSERT, UPDATE, importação |
| RLS / Segurança | Leitura autenticada; escrita admin |
| Observações | Usado como referência central |
| Pendências | Validar FKs e estrutura ativa |

### cliente_contas_origem

| Campo | Descrição |
|---|---|
| Finalidade | Plano de contas de origem do cliente |
| Módulo | Plano de contas, mapeamento, balancetes |
| Origem identificada | Migration e código |
| Principais campos | `cliente_id`, código/id da conta, descrição, classificação, grau, analítica, status de mapeamento |
| Relacionamentos | Filho de `clientes`; origem para `cliente_mapeamento_mcse` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE em importações |
| RLS / Segurança | Escopo por cliente/trabalho acessível |
| Observações | Importado por XLS/CSV |
| Pendências | Validar campos reais |

### cliente_mapeamento_mcse

| Campo | Descrição |
|---|---|
| Finalidade | Mapeamento entre conta de origem e conta MCSE |
| Módulo | Mapeamento, balancetes |
| Origem identificada | Migration e código |
| Principais campos | `cliente_id`, `conta_origem_id`, `conta_mcse_id`, `tipo_mapeamento`, `homologado`, `observacao` |
| Relacionamentos | Liga `cliente_contas_origem` a `mcse_contas` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Escopo por cliente/trabalho acessível |
| Observações | Usado na importação de balancete |
| Pendências | Pendente de validação no Supabase real |

### mcse_regras_conta

| Campo | Descrição |
|---|---|
| Finalidade | Regras por conta MCSE |
| Módulo | Regras, solicitações, balancetes, PTA |
| Origem identificada | Migration e código |
| Principais campos | `conta_mcse_id`, `codigo_mcse`, `descricao_mcse`, flags, materialidade, limite, grupo documental, `gera_solicitacao_automatica`, `ativo` |
| Relacionamentos | Pai de documentos, instruções e emissão ERP |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Leitura autenticada; escrita admin |
| Observações | Alterações impactam solicitações futuras |
| Pendências | Validar vínculo futuro com riscos |

### mcse_regras_documentos

| Campo | Descrição |
|---|---|
| Finalidade | Documentos solicitáveis por regra |
| Módulo | Regras, solicitações, portal |
| Origem identificada | Migration e código |
| Principais campos | `regra_mcse_id`, `conta_mcse_id`, `tipo_documento`, `descricao_documento`, `obrigatorio`, `ordem_solicitacao`, `formato_aceito`, `ativo` |
| Relacionamentos | Filho de `mcse_regras_conta` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Leitura autenticada; escrita admin |
| Observações | Alimenta geração de `solicitacao_itens` |
| Pendências | Pendente de validação no Supabase real |

### mcse_regras_instrucoes

| Campo | Descrição |
|---|---|
| Finalidade | Instruções por regra |
| Módulo | Regras, solicitações, portal |
| Origem identificada | Migration e código |
| Principais campos | `regra_mcse_id`, título, texto, público-alvo, ordem, ativo |
| Relacionamentos | Filho de `mcse_regras_conta` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Leitura autenticada; escrita admin |
| Observações | Exibido ao cliente e/ou auditor conforme alvo |
| Pendências | Validar nomenclatura real dos campos |

### mcse_regras_emissao_erp

| Campo | Descrição |
|---|---|
| Finalidade | Trilha de emissão em ERP |
| Módulo | Regras, solicitações, portal |
| Origem identificada | Migration e código |
| Principais campos | `regra_mcse_id`, `erp_nome`, `nome_relatorio`, módulo, caminho, filtros, campos mínimos, formato, ordem |
| Relacionamentos | Filho de `mcse_regras_conta` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Leitura autenticada; escrita admin |
| Observações | Ajuda cliente a emitir documentos |
| Pendências | Pendente de validação no Supabase real |

## 6. Balancetes e PTA

### balancetes

| Campo | Descrição |
|---|---|
| Finalidade | Cabeçalho de importação de balancete |
| Módulo | Balancetes |
| Origem identificada | Migration e código |
| Principais campos | `trabalho_auditoria_id`, `cliente_id`, `exercicio_id`, arquivo, tipo, totais, status |
| Relacionamentos | Pai de `balancete_linhas` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE em ambiente/teste |
| RLS / Segurança | Admin/trabalho acessível; cliente leitura filtrada em policies recentes |
| Observações | Importação usa `xlsx` |
| Pendências | Validar políticas efetivas |

### balancete_linhas

| Campo | Descrição |
|---|---|
| Finalidade | Linhas importadas do balancete |
| Módulo | Balancetes, PTA, solicitações |
| Origem identificada | Migration e código |
| Principais campos | Conta origem, saldos, variação, MCSE, validação, comentários, pendências |
| Relacionamentos | Filho de `balancetes`; origem para `papel_trabalho_linhas` e vínculos documentais |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE na exclusão de balancete |
| RLS / Segurança | Admin/trabalho acessível; cliente leitura filtrada |
| Observações | Pode ter alteração bloqueada se vinculada a PTA fechado |
| Pendências | Validar status de validação reais |

### papeis_trabalho

| Campo | Descrição |
|---|---|
| Finalidade | Papel de trabalho por trabalho/conta |
| Módulo | PTA |
| Origem identificada | Migration, SQL de vínculo de materialidade e código |
| Principais campos | Trabalho, cliente, exercício, conta MCSE, título, status, conclusões, fechado, campos de materialidade |
| Relacionamentos | Pai de `papel_trabalho_linhas`; pode referenciar `trabalho_materialidade_bases` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Admin/trabalho acessível; cliente leitura filtrada |
| Observações | Geração automática previne duplicidade por trabalho/conta |
| Pendências | Validar campos recentes no Supabase real |

| Campo | Finalidade | Observações |
|---|---|---|
| `materialidade_base_id` | Base selecionada | FK inferida para `trabalho_materialidade_bases` |
| `materialidade_base_nome_snapshot` | Nome preservado | Snapshot |
| `materialidade_base_valor_snapshot` | Valor preservado | Snapshot |
| `materialidade_base_percentual_snapshot` | Percentual preservado | Snapshot |
| `materialidade_base_saldo_snapshot` | Saldo preservado | Snapshot |
| `materialidade_base_codigo_conta_snapshot` | Código preservado | Snapshot |
| `materialidade_base_descricao_conta_snapshot` | Descrição preservada | Snapshot |
| `materialidade_base_criterio_snapshot` | Critério preservado | Snapshot |

### papel_trabalho_linhas

| Campo | Descrição |
|---|---|
| Finalidade | Vínculo entre PTA e linhas do balancete |
| Módulo | PTA |
| Origem identificada | Migration e código |
| Principais campos | `papel_trabalho_id`, `balancete_linha_id`, snapshots de saldos/contas |
| Relacionamentos | Liga `papeis_trabalho` a `balancete_linhas` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Derivada por trabalho acessível |
| Observações | Atualiza snapshot no detalhe do PTA |
| Pendências | Pendente de validação no Supabase real |

### documentos_referencia_balancete

| Campo | Descrição |
|---|---|
| Finalidade | Documentos anexados a linhas de balancete |
| Módulo | Balancetes, PTA |
| Origem identificada | Migration e código |
| Principais campos | Linha, trabalho, cliente, exercício, arquivo, URL/path, upload, ativo |
| Relacionamentos | Filho de `balancete_linhas` |
| Operações no sistema | SELECT, INSERT, UPDATE, storage upload/remove |
| RLS / Segurança | Depende de tabela e bucket `documentos-balancete` |
| Observações | Usa signed URL |
| Pendências | Validar policies de storage |

### balancete_linha_documentos

| Campo | Descrição |
|---|---|
| Finalidade | Vínculo entre documento recebido e linha do balancete |
| Módulo | Solicitações, balancetes |
| Origem identificada | Migration e código |
| Principais campos | `balancete_linha_id`, `solicitacao_item_documento_id`, trabalho, cliente, tipo vínculo, observações |
| Relacionamentos | Liga `balancete_linhas` a `solicitacao_item_documentos` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | DELETE restrito a admin em migration inicial; policies recentes precisam validação |
| Observações | Evidência aceita pode ser vinculada ao balancete |
| Pendências | Pendente de validação no Supabase real |

## 7. Solicitações documentais

### solicitacoes_documentos

| Campo | Descrição |
|---|---|
| Finalidade | Cabeçalho da solicitação documental |
| Módulo | Solicitações, portal cliente |
| Origem identificada | Migration e código |
| Principais campos | `trabalho_auditoria_id`, `cliente_id`, `exercicio_id`, título, origem, prazo, status, observações |
| Relacionamentos | Pai de `solicitacao_itens` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Cliente acessa solicitações do próprio cliente; auditor por trabalho acessível |
| Observações | Gerada a partir de regras e balancete |
| Pendências | Validar status oficiais |

### solicitacao_itens

| Campo | Descrição |
|---|---|
| Finalidade | Documento ou informação solicitada |
| Módulo | Solicitações, portal cliente |
| Origem identificada | Migration e código |
| Principais campos | `solicitacao_id`, regra MCSE, conta MCSE, tipo, descrição, instruções, prazo, obrigatório, status |
| Relacionamentos | Filho de `solicitacoes_documentos`; pai de documentos enviados |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE na revisão |
| RLS / Segurança | Cliente pode atualizar dentro do próprio escopo conforme policies recentes |
| Observações | Status inclui `pendente`, `recebido`, `aceito`, `rejeitado`, `dispensado` |
| Pendências | Pendente de validação no Supabase real |

### solicitacao_item_documentos

| Campo | Descrição |
|---|---|
| Finalidade | Arquivos enviados para item de solicitação |
| Módulo | Portal cliente, solicitações |
| Origem identificada | Migration e código |
| Principais campos | `solicitacao_item_id`, `nome_arquivo`, `tipo_arquivo`, `url_arquivo`, `uploaded_by`, `versao`, `status_documento`, observações |
| Relacionamentos | Filho de `solicitacao_itens`; pode ser ligado a `balancete_linha_documentos` |
| Operações no sistema | SELECT, INSERT, UPDATE, storage upload |
| RLS / Segurança | Cliente no próprio escopo; auditor/admin por trabalho |
| Observações | Upload atual aceita PDF e cria versão |
| Pendências | Validar storage policies |

## 8. Portal do cliente

O portal usa:

- `cliente_usuarios`.
- `solicitacoes_documentos`.
- `solicitacao_itens`.
- `solicitacao_item_documentos`.
- Bucket `solicitacao-documentos`.

Pendente de validação no Supabase real: isolamento por cliente e signed URLs.

## 9. Procedimentos auxiliares

### procedimentos_auxiliares

| Campo | Descrição |
|---|---|
| Finalidade | Cabeçalho de procedimento auxiliar |
| Módulo | Procedimentos |
| Origem identificada | Código; origem SQL/migration não confirmada no inventário |
| Principais campos | Trabalho, cliente, exercício, tipo, título, datas, conta MCSE, responsáveis, status, conclusões |
| Relacionamentos | Pai de documentos e tabelas específicas do procedimento |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Deve seguir trabalho/cliente acessível |
| Observações | Usa `as any` |
| Pendências | Pendente de validação no Supabase real |

### procedimento_auxiliar_documentos

| Campo | Descrição |
|---|---|
| Finalidade | Evidências anexadas a procedimentos |
| Módulo | Procedimentos |
| Origem identificada | Código; origem SQL/migration não confirmada no inventário |
| Principais campos | `procedimento_id`, tipo, arquivo, URL/path, upload, observação, status |
| Relacionamentos | Filho de `procedimentos_auxiliares` |
| Operações no sistema | SELECT, INSERT, DELETE, storage upload/remove |
| RLS / Segurança | Depende de tabela e bucket `documentos-balancete` |
| Observações | Usa signed URL |
| Pendências | Pendente de validação no Supabase real |

### procedimento_contagem_caixa_itens

| Campo | Descrição |
|---|---|
| Finalidade | Itens/caixas contados |
| Módulo | Contagem de caixa |
| Origem identificada | Código; `CREATE TABLE` local não confirmado no inventário |
| Principais campos | Procedimento, identificação, local, responsável, valores informado/contado, diferença |
| Relacionamentos | Filho de `procedimentos_auxiliares`; pai de detalhes |
| Operações no sistema | SELECT, INSERT, DELETE |
| RLS / Segurança | Pendente |
| Observações | Usa `as any` |
| Pendências | Pendente de validação no Supabase real |

### procedimento_contagem_caixa_detalhes

| Campo | Descrição |
|---|---|
| Finalidade | Cédulas/moedas ou lançamentos de contagem |
| Módulo | Contagem de caixa |
| Origem identificada | Código; `CREATE TABLE` local não confirmado no inventário |
| Principais campos | Item de caixa, tipo, denominação, quantidade, valor total |
| Relacionamentos | Filho de `procedimento_contagem_caixa_itens` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Pendente |
| Observações | Usado por grid inline e termo |
| Pendências | Pendente de validação no Supabase real |

### procedimento_contagem_estoque_blocos

| Campo | Descrição |
|---|---|
| Finalidade | Blocos de contagem de estoque |
| Módulo | Contagem de estoque |
| Origem identificada | `docs/sql/contagem-estoque.sql` e código |
| Principais campos | Procedimento, filial, setor, tipo, categoria, descrição, responsável, datas |
| Relacionamentos | Filho de `procedimentos_auxiliares`; pai de itens |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | SQL manual define policies; cliente bloqueado conforme padrão |
| Observações | Dashboard usa esses dados |
| Pendências | Pendente de validação no Supabase real |

### procedimento_contagem_estoque_itens

| Campo | Descrição |
|---|---|
| Finalidade | Itens contados em estoque |
| Módulo | Contagem de estoque |
| Origem identificada | `docs/sql/contagem-estoque.sql`, v2/v3 e código |
| Principais campos | Bloco, código, descrição, unidade, quantidades, valores, diferenças, status, contado |
| Relacionamentos | Filho de `procedimento_contagem_estoque_blocos` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE, importação |
| RLS / Segurança | SQL manual define policies |
| Observações | Triggers/funções calculam diferenças em SQL |
| Pendências | Pendente de validação no Supabase real |

## 10. Faturas em aberto

### cliente_classes_faturamento

| Campo | Descrição |
|---|---|
| Finalidade | Cadastro auxiliar de classes |
| Módulo | Faturas em aberto |
| Origem identificada | `docs/sql/faturas-em-aberto-etapa1.sql` e código |
| Principais campos | `cliente_id`, código, descrição, grupo, ativo |
| Relacionamentos | Filho de `clientes` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE, importação |
| RLS / Segurança | SQL manual bloqueia `cliente_usuario` nesta etapa |
| Observações | Usado para dashboard e validação |
| Pendências | Pendente de validação no Supabase real |

### cliente_municipios_faturamento

| Campo | Descrição |
|---|---|
| Finalidade | Cadastro auxiliar de municípios |
| Módulo | Faturas em aberto |
| Origem identificada | `docs/sql/faturas-em-aberto-etapa1.sql` e código |
| Principais campos | `cliente_id`, código município, nome, UF, IBGE, regional, ativo |
| Relacionamentos | Filho de `clientes` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE, importação |
| RLS / Segurança | SQL manual bloqueia `cliente_usuario` nesta etapa |
| Observações | Usado para dashboard e validação |
| Pendências | Pendente de validação no Supabase real |

### procedimento_faturas_aberto_lotes

| Campo | Descrição |
|---|---|
| Finalidade | Lotes de importação de faturas em aberto |
| Módulo | Faturas em aberto |
| Origem identificada | `docs/sql/faturas-em-aberto-etapa1.sql` e código |
| Principais campos | Procedimento, cliente, trabalho, arquivo, totais, status, mapeamento, metadata |
| Relacionamentos | Pai de `procedimento_faturas_aberto_itens` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | SQL manual bloqueia `cliente_usuario` nesta etapa |
| Observações | Importação valida erros e alertas |
| Pendências | Pendente de validação no Supabase real |

### procedimento_faturas_aberto_itens

| Campo | Descrição |
|---|---|
| Finalidade | Faturas/títulos importados |
| Módulo | Faturas em aberto |
| Origem identificada | `docs/sql/faturas-em-aberto-etapa1.sql` e código |
| Principais campos | Procedimento, lote, UC, consumidor, fatura/documento, datas, valor, aging, classe, município |
| Relacionamentos | Filho de `procedimento_faturas_aberto_lotes` e `procedimentos_auxiliares` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | SQL manual bloqueia `cliente_usuario` nesta etapa |
| Observações | Alimenta dashboards de aging, classe e município |
| Pendências | Pendente de validação no Supabase real |

## 11. Contratos e produtos

### produtos_auditoria

| Campo | Descrição |
|---|---|
| Finalidade | Catálogo de produtos/serviços de auditoria |
| Módulo | Produtos, contratos, trabalhos |
| Origem identificada | Migration e código |
| Principais campos | Código, nome, categoria, segmento, subtipo, complexidade, risco, horas base, ativo |
| Relacionamentos | Usado por `contrato_produtos` |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Escrita admin identificada |
| Observações | Usa enums/casts |
| Pendências | Pendente de validação no Supabase real |

### contratos

| Campo | Descrição |
|---|---|
| Finalidade | Contratos por cliente |
| Módulo | Contratos, trabalhos |
| Origem identificada | Código; `CREATE TABLE` local não confirmado no inventário |
| Principais campos | Cliente, número, descrição, datas, valor, tipo contratação, forma pagamento, gestor, status |
| Relacionamentos | Filho de `clientes`; pai de `contrato_produtos`; pode ser ligado a trabalho |
| Operações no sistema | SELECT, INSERT, UPDATE |
| RLS / Segurança | Pendente |
| Observações | Usa `as any` |
| Pendências | Pendente de validação no Supabase real |

### contrato_produtos

| Campo | Descrição |
|---|---|
| Finalidade | Produtos vinculados a contrato |
| Módulo | Contratos, trabalhos |
| Origem identificada | Código; `CREATE TABLE` local não confirmado no inventário |
| Principais campos | `contrato_id`, produto, horas previstas/limite, quantidade, obrigatório, ativo |
| Relacionamentos | Vínculo entre `contratos` e `produtos_auditoria` |
| Operações no sistema | SELECT, INSERT, UPDATE, DELETE |
| RLS / Segurança | Pendente |
| Observações | Usado para sugerir controle de horas em trabalho |
| Pendências | Pendente de validação no Supabase real |

## 12. Storage e documentos

### Bucket documentos-balancete

| Campo | Descrição |
|---|---|
| Finalidade | Armazenar documentos de referência de balancete e procedimentos |
| Módulo | Balancetes, PTA, procedimentos |
| Origem identificada | Migrations e código |
| Principais campos | Objetos em `storage.objects` |
| Relacionamentos | Tabelas guardam path/URL do objeto |
| Operações no sistema | Upload, signed URL, remoção |
| RLS / Segurança | `can_access_storage_doc` em migrations |
| Observações | Bucket foi ajustado para não público em migration |
| Pendências | Validar policies reais |

### Bucket solicitacao-documentos

| Campo | Descrição |
|---|---|
| Finalidade | Armazenar PDFs enviados pelo cliente |
| Módulo | Portal cliente, solicitações |
| Origem identificada | Migrations e código |
| Principais campos | Objetos em `storage.objects`; path por solicitação/item/versão |
| Relacionamentos | `solicitacao_item_documentos.url_arquivo` |
| Operações no sistema | Upload, signed URL |
| RLS / Segurança | `can_access_sol_storage_doc` em migrations |
| Observações | Upload atual aceita PDF e limite de 20 MB no frontend |
| Pendências | Validar policies reais |

## 13. Tabelas pendentes de validação

Tabelas usadas pelo frontend ou documentação que exigem validação de origem/schema real:

- `contratos`
- `contrato_produtos`
- `procedimentos_auxiliares`
- `procedimento_auxiliar_documentos`
- `procedimento_contagem_caixa_itens`
- `procedimento_contagem_caixa_detalhes`
- `segmentos`
- `estruturas_auditoria`

Pendente de validação no Supabase real.

## Relacionamentos principais

- `clientes` -> `exercicios`
- `clientes` -> `trabalhos_auditoria`
- `clientes` -> `cliente_usuarios`
- `clientes` -> `cliente_parametros`
- `trabalhos_auditoria` -> `trabalho_auditores`
- `trabalhos_auditoria` -> `trabalho_planejamento`
- `trabalhos_auditoria` -> `trabalho_materialidade`
- `trabalho_materialidade` -> `trabalho_materialidade_bases`
- `trabalhos_auditoria` -> `trabalho_riscos_auditoria`
- `trabalhos_auditoria` -> `balancetes`
- `balancetes` -> `balancete_linhas`
- `trabalhos_auditoria` -> `papeis_trabalho`
- `papeis_trabalho` -> `papel_trabalho_linhas`
- `balancete_linhas` -> `papel_trabalho_linhas`
- `mcse_grupos` -> `mcse_subgrupos`
- `mcse_subgrupos` -> `mcse_contas`
- `mcse_contas` -> `mcse_regras_conta`
- `mcse_regras_conta` -> `mcse_regras_documentos`
- `mcse_regras_conta` -> `mcse_regras_instrucoes`
- `mcse_regras_conta` -> `mcse_regras_emissao_erp`
- `solicitacoes_documentos` -> `solicitacao_itens`
- `solicitacao_itens` -> `solicitacao_item_documentos`
- `solicitacao_item_documentos` -> `balancete_linha_documentos`
- `procedimentos_auxiliares` -> tabelas específicas de procedimentos
- `procedimento_faturas_aberto_lotes` -> `procedimento_faturas_aberto_itens`
- `contratos` -> `contrato_produtos`
- `produtos_auditoria` -> `contrato_produtos`

Observação: relacionamentos acima são inferidos a partir do código e SQLs locais quando FK não foi confirmada neste documento.

## RLS por grupo

| Grupo | Padrão esperado | Funções/policies relacionadas | Pendência |
|---|---|---|---|
| Cadastros internos | Admin e auditores conforme escopo | `is_admin`, `get_accessible_cliente_ids` | Validar policies reais |
| Trabalhos | Auditor por vínculo/equipe, admin amplo | `get_accessible_trabalho_ids` | Testar auditor sem vínculo |
| Cliente | Cliente vê somente próprio cliente | `is_cliente_usuario`, `get_cliente_usuario_cliente_id` | Testar acesso cruzado |
| Solicitações | Cliente vê/envia no próprio escopo; auditor por trabalho | `get_cliente_usuario_cliente_id`, `get_accessible_trabalho_ids` | Testar upload e status |
| Storage | Acesso por trabalho/cliente/documento | `can_access_storage_doc`, `can_access_sol_storage_doc` | Validar buckets e signed URLs |
| Procedimentos | Auditor/admin por trabalho; cliente bloqueado em faturas | SQLs manuais | Validar no Supabase real |

DELETE, quando permitido, deve ser tratado como operação restrita. Pendente de validação no Supabase real.

## Conceito de snapshot

Snapshot é a preservação de valores ou identificadores no momento da operação.

Usos identificados:

- Bases de materialidade preservam conta, descrição, saldo, critério, percentual e valor.
- PTA preserva dados da base selecionada.
- Linhas de PTA podem preservar dados de balancete.
- Riscos preservam código e descrição da conta MCSE.

Finalidade:

- Manter rastreabilidade.
- Evitar perda de contexto se a origem mudar depois.
- Permitir leitura histórica do PTA ou risco.

Observação: inferido a partir do código.
