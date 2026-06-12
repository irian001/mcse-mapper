-- ============================================================================
-- P0 - Diagnostico somente-leitura do Supabase real
-- Data base do inventario local: 2026-06-12
--
-- Este script nao altera dados.
-- O SQL Editor pode bypassar RLS; use este resultado para inventario estrutural
-- e teste comportamento de RLS via usuarios autenticados no app/client.
-- ============================================================================

-- ============================================================================
-- 1) Tabelas esperadas pelo frontend
-- ============================================================================

WITH expected_frontend_tables(table_name, local_origin) AS (
  VALUES
    ('auditores', 'supabase/migrations'),
    ('balancete_linha_documentos', 'supabase/migrations'),
    ('balancete_linhas', 'supabase/migrations'),
    ('balancetes', 'supabase/migrations'),
    ('cliente_classes_faturamento', 'docs/sql'),
    ('cliente_contas_origem', 'supabase/migrations'),
    ('cliente_mapeamento_mcse', 'supabase/migrations'),
    ('cliente_modalidades_atuacao', 'docs/sql'),
    ('cliente_municipios_faturamento', 'docs/sql'),
    ('cliente_parametros', 'supabase/migrations'),
    ('cliente_usuarios', 'supabase/migrations'),
    ('clientes', 'supabase/migrations'),
    ('contrato_produtos', 'SEM_CREATE_TABLE_LOCAL'),
    ('contratos', 'SEM_CREATE_TABLE_LOCAL'),
    ('documentos_referencia_balancete', 'supabase/migrations'),
    ('empresa_auditoria', 'supabase/migrations'),
    ('estruturas_auditoria', 'docs/sql'),
    ('exercicios', 'supabase/migrations'),
    ('mcse_contas', 'supabase/migrations'),
    ('mcse_grupos', 'supabase/migrations'),
    ('mcse_regras_conta', 'supabase/migrations'),
    ('mcse_regras_documentos', 'supabase/migrations'),
    ('mcse_regras_emissao_erp', 'supabase/migrations'),
    ('mcse_regras_instrucoes', 'supabase/migrations'),
    ('mcse_subgrupos', 'supabase/migrations'),
    ('modalidades_atuacao', 'docs/sql'),
    ('modelo_matriz_risco_item_vinculos', 'docs/sql'),
    ('modelo_matriz_risco_itens', 'docs/sql'),
    ('modelos_matriz_riscos', 'docs/sql'),
    ('papeis_trabalho', 'supabase/migrations'),
    ('papel_trabalho_linhas', 'supabase/migrations'),
    ('procedimento_auxiliar_documentos', 'SEM_CREATE_TABLE_LOCAL'),
    ('procedimento_contagem_caixa_detalhes', 'SEM_CREATE_TABLE_LOCAL'),
    ('procedimento_contagem_caixa_itens', 'SEM_CREATE_TABLE_LOCAL'),
    ('procedimento_contagem_estoque_blocos', 'docs/sql'),
    ('procedimento_contagem_estoque_itens', 'docs/sql'),
    ('procedimento_faturas_aberto_itens', 'docs/sql'),
    ('procedimento_faturas_aberto_lotes', 'docs/sql'),
    ('procedimentos_auxiliares', 'SEM_CREATE_TABLE_LOCAL'),
    ('produtos_auditoria', 'supabase/migrations'),
    ('segmentos', 'docs/sql'),
    ('solicitacao_item_documentos', 'supabase/migrations'),
    ('solicitacao_itens', 'supabase/migrations'),
    ('solicitacoes_documentos', 'supabase/migrations'),
    ('trabalho_auditores', 'supabase/migrations'),
    ('trabalho_materialidade', 'docs/sql'),
    ('trabalho_materialidade_bases', 'docs/sql'),
    ('trabalho_planejamento', 'docs/sql'),
    ('trabalho_planejamento_modalidades', 'docs/sql'),
    ('trabalho_riscos_auditoria', 'docs/sql'),
    ('trabalhos_auditoria', 'supabase/migrations')
),
actual_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT
  'missing_expected_frontend_tables' AS check_name,
  e.table_name,
  e.local_origin
FROM expected_frontend_tables e
LEFT JOIN actual_tables a USING (table_name)
WHERE a.table_name IS NULL
ORDER BY e.table_name;

WITH expected_frontend_tables(table_name, local_origin) AS (
  VALUES
    ('auditores', 'supabase/migrations'),
    ('balancete_linha_documentos', 'supabase/migrations'),
    ('balancete_linhas', 'supabase/migrations'),
    ('balancetes', 'supabase/migrations'),
    ('cliente_classes_faturamento', 'docs/sql'),
    ('cliente_contas_origem', 'supabase/migrations'),
    ('cliente_mapeamento_mcse', 'supabase/migrations'),
    ('cliente_modalidades_atuacao', 'docs/sql'),
    ('cliente_municipios_faturamento', 'docs/sql'),
    ('cliente_parametros', 'supabase/migrations'),
    ('cliente_usuarios', 'supabase/migrations'),
    ('clientes', 'supabase/migrations'),
    ('contrato_produtos', 'SEM_CREATE_TABLE_LOCAL'),
    ('contratos', 'SEM_CREATE_TABLE_LOCAL'),
    ('documentos_referencia_balancete', 'supabase/migrations'),
    ('empresa_auditoria', 'supabase/migrations'),
    ('estruturas_auditoria', 'docs/sql'),
    ('exercicios', 'supabase/migrations'),
    ('mcse_contas', 'supabase/migrations'),
    ('mcse_grupos', 'supabase/migrations'),
    ('mcse_regras_conta', 'supabase/migrations'),
    ('mcse_regras_documentos', 'supabase/migrations'),
    ('mcse_regras_emissao_erp', 'supabase/migrations'),
    ('mcse_regras_instrucoes', 'supabase/migrations'),
    ('mcse_subgrupos', 'supabase/migrations'),
    ('modalidades_atuacao', 'docs/sql'),
    ('modelo_matriz_risco_item_vinculos', 'docs/sql'),
    ('modelo_matriz_risco_itens', 'docs/sql'),
    ('modelos_matriz_riscos', 'docs/sql'),
    ('papeis_trabalho', 'supabase/migrations'),
    ('papel_trabalho_linhas', 'supabase/migrations'),
    ('procedimento_auxiliar_documentos', 'SEM_CREATE_TABLE_LOCAL'),
    ('procedimento_contagem_caixa_detalhes', 'SEM_CREATE_TABLE_LOCAL'),
    ('procedimento_contagem_caixa_itens', 'SEM_CREATE_TABLE_LOCAL'),
    ('procedimento_contagem_estoque_blocos', 'docs/sql'),
    ('procedimento_contagem_estoque_itens', 'docs/sql'),
    ('procedimento_faturas_aberto_itens', 'docs/sql'),
    ('procedimento_faturas_aberto_lotes', 'docs/sql'),
    ('procedimentos_auxiliares', 'SEM_CREATE_TABLE_LOCAL'),
    ('produtos_auditoria', 'supabase/migrations'),
    ('segmentos', 'docs/sql'),
    ('solicitacao_item_documentos', 'supabase/migrations'),
    ('solicitacao_itens', 'supabase/migrations'),
    ('solicitacoes_documentos', 'supabase/migrations'),
    ('trabalho_auditores', 'supabase/migrations'),
    ('trabalho_materialidade', 'docs/sql'),
    ('trabalho_materialidade_bases', 'docs/sql'),
    ('trabalho_planejamento', 'docs/sql'),
    ('trabalho_planejamento_modalidades', 'docs/sql'),
    ('trabalho_riscos_auditoria', 'docs/sql'),
    ('trabalhos_auditoria', 'supabase/migrations')
)
SELECT
  'rls_status_expected_tables' AS check_name,
  e.table_name,
  e.local_origin,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COALESCE(pc.policy_count, 0) AS policy_count
FROM expected_frontend_tables e
LEFT JOIN pg_class c ON c.relname = e.table_name
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN (
  SELECT schemaname, tablename, count(*) AS policy_count
  FROM pg_policies
  GROUP BY schemaname, tablename
) pc ON pc.schemaname = 'public' AND pc.tablename = e.table_name
WHERE n.nspname = 'public' OR c.oid IS NULL
ORDER BY e.table_name;

-- ============================================================================
-- 2) Policies ativas nas tabelas esperadas e em storage.objects
-- ============================================================================

WITH expected_policy_targets(table_schema, table_name) AS (
  VALUES
    ('public', 'auditores'),
    ('public', 'balancete_linha_documentos'),
    ('public', 'balancete_linhas'),
    ('public', 'balancetes'),
    ('public', 'cliente_classes_faturamento'),
    ('public', 'cliente_contas_origem'),
    ('public', 'cliente_mapeamento_mcse'),
    ('public', 'cliente_modalidades_atuacao'),
    ('public', 'cliente_municipios_faturamento'),
    ('public', 'cliente_parametros'),
    ('public', 'cliente_usuarios'),
    ('public', 'clientes'),
    ('public', 'contrato_produtos'),
    ('public', 'contratos'),
    ('public', 'documentos_referencia_balancete'),
    ('public', 'empresa_auditoria'),
    ('public', 'estruturas_auditoria'),
    ('public', 'exercicios'),
    ('public', 'mcse_contas'),
    ('public', 'mcse_grupos'),
    ('public', 'mcse_regras_conta'),
    ('public', 'mcse_regras_documentos'),
    ('public', 'mcse_regras_emissao_erp'),
    ('public', 'mcse_regras_instrucoes'),
    ('public', 'mcse_subgrupos'),
    ('public', 'modalidades_atuacao'),
    ('public', 'modelo_matriz_risco_item_vinculos'),
    ('public', 'modelo_matriz_risco_itens'),
    ('public', 'modelos_matriz_riscos'),
    ('public', 'papeis_trabalho'),
    ('public', 'papel_trabalho_linhas'),
    ('public', 'procedimento_auxiliar_documentos'),
    ('public', 'procedimento_contagem_caixa_detalhes'),
    ('public', 'procedimento_contagem_caixa_itens'),
    ('public', 'procedimento_contagem_estoque_blocos'),
    ('public', 'procedimento_contagem_estoque_itens'),
    ('public', 'procedimento_faturas_aberto_itens'),
    ('public', 'procedimento_faturas_aberto_lotes'),
    ('public', 'procedimentos_auxiliares'),
    ('public', 'produtos_auditoria'),
    ('public', 'segmentos'),
    ('public', 'solicitacao_item_documentos'),
    ('public', 'solicitacao_itens'),
    ('public', 'solicitacoes_documentos'),
    ('public', 'trabalho_auditores'),
    ('public', 'trabalho_materialidade'),
    ('public', 'trabalho_materialidade_bases'),
    ('public', 'trabalho_planejamento'),
    ('public', 'trabalho_planejamento_modalidades'),
    ('public', 'trabalho_riscos_auditoria'),
    ('public', 'trabalhos_auditoria'),
    ('storage', 'objects')
)
SELECT
  'active_policies_for_expected_tables' AS check_name,
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check
FROM pg_policies p
JOIN expected_policy_targets e
  ON e.table_schema = p.schemaname
 AND e.table_name = p.tablename
ORDER BY p.schemaname, p.tablename, p.policyname;

-- ============================================================================
-- 3) Funcoes/RPCs esperadas
-- ============================================================================

WITH expected_functions(function_name, why_expected) AS (
  VALUES
    ('arquivar_modelo_matriz_riscos', 'RPC chamada pela UI'),
    ('can_access_sol_storage_doc', 'helper de storage/RLS'),
    ('can_access_storage_doc', 'helper de storage/RLS'),
    ('can_importar_riscos_modelo_trabalho', 'helper de alcada para importacao de riscos'),
    ('can_manage_modelos_matriz_riscos', 'helper de modelos de riscos'),
    ('can_manage_trabalho_planejamento_modalidades', 'helper de modalidades do planejamento'),
    ('can_publish_modelos_matriz_riscos', 'helper de modelos de riscos'),
    ('get_accessible_cliente_ids', 'helper de RLS'),
    ('get_accessible_trabalho_ids', 'helper de RLS'),
    ('get_auth_users_for_linking', 'RPC chamada pela UI'),
    ('get_cliente_usuario_cliente_id', 'helper de portal cliente'),
    ('get_my_auditor_id', 'helper de RLS'),
    ('importar_riscos_modelo_para_trabalho', 'RPC chamada pela UI indiretamente'),
    ('is_admin', 'helper de RLS'),
    ('is_cliente_usuario', 'helper de RLS'),
    ('link_auditor_account', 'RPC chamada pela UI'),
    ('link_auditor_by_email', 'RPC chamada pela UI'),
    ('publicar_modelo_matriz_riscos', 'RPC chamada pela UI'),
    ('set_cliente_modalidade_principal', 'RPC chamada pela UI'),
    ('validar_modalidades_antes_aprovar_planejamento', 'trigger de aprovacao de planejamento')
),
actual_functions AS (
  SELECT
    p.proname AS function_name,
    n.nspname AS schema_name,
    p.prosecdef AS security_definer,
    pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
)
SELECT
  'missing_expected_functions' AS check_name,
  e.function_name,
  e.why_expected
FROM expected_functions e
LEFT JOIN actual_functions a USING (function_name)
WHERE a.function_name IS NULL
ORDER BY e.function_name;

WITH expected_functions(function_name, why_expected) AS (
  VALUES
    ('arquivar_modelo_matriz_riscos', 'RPC chamada pela UI'),
    ('can_access_sol_storage_doc', 'helper de storage/RLS'),
    ('can_access_storage_doc', 'helper de storage/RLS'),
    ('can_importar_riscos_modelo_trabalho', 'helper de alcada para importacao de riscos'),
    ('can_manage_modelos_matriz_riscos', 'helper de modelos de riscos'),
    ('can_manage_trabalho_planejamento_modalidades', 'helper de modalidades do planejamento'),
    ('can_publish_modelos_matriz_riscos', 'helper de modelos de riscos'),
    ('get_accessible_cliente_ids', 'helper de RLS'),
    ('get_accessible_trabalho_ids', 'helper de RLS'),
    ('get_auth_users_for_linking', 'RPC chamada pela UI'),
    ('get_cliente_usuario_cliente_id', 'helper de portal cliente'),
    ('get_my_auditor_id', 'helper de RLS'),
    ('importar_riscos_modelo_para_trabalho', 'RPC chamada pela UI indiretamente'),
    ('is_admin', 'helper de RLS'),
    ('is_cliente_usuario', 'helper de RLS'),
    ('link_auditor_account', 'RPC chamada pela UI'),
    ('link_auditor_by_email', 'RPC chamada pela UI'),
    ('publicar_modelo_matriz_riscos', 'RPC chamada pela UI'),
    ('set_cliente_modalidade_principal', 'RPC chamada pela UI'),
    ('validar_modalidades_antes_aprovar_planejamento', 'trigger de aprovacao de planejamento')
)
SELECT
  'expected_functions_detail' AS check_name,
  e.function_name,
  e.why_expected,
  n.nspname AS schema_name,
  p.prosecdef AS security_definer,
  pg_get_function_identity_arguments(p.oid) AS args,
  array_to_string(p.proacl, E'\n') AS grants
FROM expected_functions e
LEFT JOIN pg_proc p ON p.proname = e.function_name
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
WHERE n.nspname = 'public' OR p.oid IS NULL
ORDER BY e.function_name, args;

-- ============================================================================
-- 4) Buckets e policies de Storage
-- ============================================================================

WITH expected_buckets(bucket_id) AS (
  VALUES
    ('documentos-balancete'),
    ('solicitacao-documentos')
)
SELECT
  'missing_expected_buckets' AS check_name,
  e.bucket_id
FROM expected_buckets e
LEFT JOIN storage.buckets b ON b.id = e.bucket_id
WHERE b.id IS NULL
ORDER BY e.bucket_id;

WITH expected_buckets(bucket_id) AS (
  VALUES
    ('documentos-balancete'),
    ('solicitacao-documentos')
)
SELECT
  'expected_buckets_detail' AS check_name,
  b.id,
  b.name,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types
FROM storage.buckets b
JOIN expected_buckets e ON e.bucket_id = b.id
ORDER BY b.id;

SELECT
  'storage_policies_for_expected_buckets' AS check_name,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check
FROM pg_policies p
WHERE p.schemaname = 'storage'
  AND p.tablename = 'objects'
  AND (
    p.qual ILIKE '%documentos-balancete%'
    OR p.with_check ILIKE '%documentos-balancete%'
    OR p.qual ILIKE '%solicitacao-documentos%'
    OR p.with_check ILIKE '%solicitacao-documentos%'
  )
ORDER BY p.policyname;

-- ============================================================================
-- 5) Amostras para planejamento dos testes manuais de RLS
-- ============================================================================

SELECT
  'profile_counts' AS check_name,
  perfil_acesso,
  count(*) AS total,
  count(*) FILTER (WHERE ativo = true) AS ativos,
  count(*) FILTER (WHERE auth_user_id IS NOT NULL) AS vinculados_auth
FROM public.auditores
GROUP BY perfil_acesso
ORDER BY perfil_acesso;

SELECT
  'cliente_usuario_counts' AS check_name,
  count(*) AS total,
  count(*) FILTER (WHERE ativo = true) AS ativos,
  count(*) FILTER (WHERE auth_user_id IS NOT NULL) AS vinculados_auth,
  count(DISTINCT cliente_id) AS clientes_com_usuario
FROM public.cliente_usuarios;

SELECT
  'sample_trabalhos_com_equipe_para_teste' AS check_name,
  t.id AS trabalho_id,
  t.nome_trabalho,
  t.cliente_id,
  count(ta.*) AS membros_ativos,
  bool_or(ta.responsavel_principal) AS tem_responsavel_principal
FROM public.trabalhos_auditoria t
LEFT JOIN public.trabalho_auditores ta
  ON ta.trabalho_auditoria_id = t.id
 AND ta.ativo = true
GROUP BY t.id, t.nome_trabalho, t.cliente_id
HAVING count(ta.*) > 0
ORDER BY membros_ativos DESC, t.nome_trabalho
LIMIT 20;

-- ============================================================================
-- 6) Probes comportamentais fora do SQL Editor
-- ============================================================================
--
-- Admin:
--   - Login como auditor admin.
--   - Aprovar planejamento/materialidade.
--   - Confirmar leitura/escrita em cadastros administrativos.
--
-- Auditor vinculado:
--   - Login como auditor membro do trabalho.
--   - Confirmar leitura do trabalho e bloqueio conforme perfil_acesso.
--   - Senior responsavel principal deve seguir regra de aprovacao da UI.
--   - Senior nao responsavel e assistente devem falhar nas aprovacoes restritas.
--
-- Auditor sem vinculo:
--   - Login como auditor sem trabalho_auditores no trabalho alvo.
--   - Consultas diretas ao trabalho alvo devem retornar vazio ou erro de RLS.
--   - Updates diretos em planejamento/materialidade do trabalho alvo devem falhar.
--
-- Cliente usuario:
--   - Login como cliente_usuario.
--   - Ver somente solicitacoes do cliente vinculado.
--   - Tentar acessar solicitacao/documento de outro cliente deve falhar.
--   - Upload em solicitacao-documentos deve ser permitido so no escopo correto.
-- ============================================================================
