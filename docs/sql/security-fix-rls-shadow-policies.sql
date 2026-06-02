-- =====================================================================
-- Correção de achados de segurança (RLS) — Supabase externo
-- Projeto: zqoywwtdsbtqtytvyzwl (mcse-mapper.lovable.app)
--
-- IMPORTANTE:
--   - Nada foi executado pela IA. Execute manualmente no Supabase externo.
--   - Faça backup / teste em ambiente de homologação antes de aplicar em produção.
--   - Após aplicar, rode: NOTIFY pgrst, 'reload schema';
--
-- Achados endereçados:
--   1. CROSS_CLIENT_DATA_EXPOSURE  — shadow policies USING(true) em
--      balancete_linhas e solicitacao_itens permitem leitura entre clientes.
--   2. EXPOSED_SENSITIVE_DATA      — select_cliente_usuarios libera todos os
--      registros para qualquer auditor (não-admin).
--   3. UNRESTRICTED_WRITE_ACCESS   — múltiplas tabelas operacionais com
--      INSERT/UPDATE WITH CHECK(true) / USING(true) permitem escrita em
--      trabalhos/clientes aos quais o auditor não está vinculado.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Remover shadow policies USING(true) que vazam dados entre clientes
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS select_bal_linhas        ON public.balancete_linhas;
DROP POLICY IF EXISTS select_solicitacao_itens ON public.solicitacao_itens;

-- Confirme que ainda existe uma policy SELECT escopada (por trabalho/cliente
-- acessível ou cliente_usuario do próprio cliente_id). Caso não exista,
-- recrie nos moldes abaixo (ajuste o nome se já houver outra equivalente):

-- CREATE POLICY select_bal_linhas_scoped ON public.balancete_linhas
--   FOR SELECT TO authenticated
--   USING (
--     public.is_admin()
--     OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
--     OR cliente_id = public.get_cliente_usuario_cliente_id()
--   );
--
-- CREATE POLICY select_solicitacao_itens_scoped ON public.solicitacao_itens
--   FOR SELECT TO authenticated
--   USING (
--     public.is_admin()
--     OR EXISTS (
--       SELECT 1 FROM public.solicitacoes_documentos s
--       WHERE s.id = solicitacao_itens.solicitacao_id
--         AND (
--           s.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
--           OR s.cliente_id = public.get_cliente_usuario_cliente_id()
--         )
--     )
--   );

-- ---------------------------------------------------------------------
-- 2) cliente_usuarios — escopar SELECT para auditores não-admin
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS select_cliente_usuarios ON public.cliente_usuarios;

CREATE POLICY select_cliente_usuarios ON public.cliente_usuarios
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      -- Cliente-usuário: apenas o próprio cliente_id
      public.is_cliente_usuario()
      AND cliente_id = public.get_cliente_usuario_cliente_id()
    )
    OR (
      -- Auditor interno (não cliente): apenas clientes acessíveis
      public.get_my_auditor_id() IS NOT NULL
      AND NOT public.is_cliente_usuario()
      AND cliente_id IN (SELECT public.get_accessible_cliente_ids())
    )
  );

-- ---------------------------------------------------------------------
-- 3) Endurecer INSERT/UPDATE com checagem de escopo por trabalho/cliente
-- ---------------------------------------------------------------------
-- Padrão de escopo aplicado a tabelas operacionais ligadas a um trabalho.
-- Ajuste o nome da policy conforme o que estiver atualmente no banco.

-- balancete_linhas
DROP POLICY IF EXISTS insert_bal_linhas ON public.balancete_linhas;
DROP POLICY IF EXISTS update_bal_linhas ON public.balancete_linhas;

CREATE POLICY insert_bal_linhas ON public.balancete_linhas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

CREATE POLICY update_bal_linhas ON public.balancete_linhas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

-- balancetes
DROP POLICY IF EXISTS insert_balancetes ON public.balancetes;
DROP POLICY IF EXISTS update_balancetes ON public.balancetes;

CREATE POLICY insert_balancetes ON public.balancetes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

CREATE POLICY update_balancetes ON public.balancetes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

-- balancete_linha_documentos
DROP POLICY IF EXISTS insert_bal_linha_docs ON public.balancete_linha_documentos;
DROP POLICY IF EXISTS update_bal_linha_docs ON public.balancete_linha_documentos;

CREATE POLICY insert_bal_linha_docs ON public.balancete_linha_documentos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

CREATE POLICY update_bal_linha_docs ON public.balancete_linha_documentos
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

-- documentos_referencia_balancete
DROP POLICY IF EXISTS insert_doc_ref_balancete ON public.documentos_referencia_balancete;
DROP POLICY IF EXISTS update_doc_ref_balancete ON public.documentos_referencia_balancete;

CREATE POLICY insert_doc_ref_balancete ON public.documentos_referencia_balancete
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

CREATE POLICY update_doc_ref_balancete ON public.documentos_referencia_balancete
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

-- papeis_trabalho
DROP POLICY IF EXISTS insert_papeis_trabalho ON public.papeis_trabalho;
DROP POLICY IF EXISTS update_papeis_trabalho ON public.papeis_trabalho;

CREATE POLICY insert_papeis_trabalho ON public.papeis_trabalho
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

CREATE POLICY update_papeis_trabalho ON public.papeis_trabalho
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
  );

-- papel_trabalho_linhas (escopada via papeis_trabalho)
DROP POLICY IF EXISTS insert_papel_trabalho_linhas ON public.papel_trabalho_linhas;
DROP POLICY IF EXISTS update_papel_trabalho_linhas ON public.papel_trabalho_linhas;

CREATE POLICY insert_papel_trabalho_linhas ON public.papel_trabalho_linhas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.papeis_trabalho p
      WHERE p.id = papel_trabalho_linhas.papel_trabalho_id
        AND p.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
    )
  );

CREATE POLICY update_papel_trabalho_linhas ON public.papel_trabalho_linhas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.papeis_trabalho p
      WHERE p.id = papel_trabalho_linhas.papel_trabalho_id
        AND p.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.papeis_trabalho p
      WHERE p.id = papel_trabalho_linhas.papel_trabalho_id
        AND p.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
    )
  );

-- Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================================
-- VALIDAÇÃO PÓS-EXECUÇÃO
-- =====================================================================
-- 1) Conferir que as shadow policies foram removidas:
--   SELECT polname, polrelid::regclass, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
--   FROM pg_policy
--   WHERE polrelid::regclass::text IN ('public.balancete_linhas','public.solicitacao_itens')
--   ORDER BY 2,1;
--
-- 2) Conferir as novas policies de cliente_usuarios:
--   SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
--   FROM pg_policy WHERE polrelid = 'public.cliente_usuarios'::regclass;
--
-- 3) Garantir que nenhuma policy de INSERT/UPDATE das tabelas acima usa
--    WITH CHECK(true) ou USING(true):
--   SELECT polrelid::regclass, polname, polcmd,
--          pg_get_expr(polqual, polrelid) AS using_expr,
--          pg_get_expr(polwithcheck, polrelid) AS check_expr
--   FROM pg_policy
--   WHERE polrelid::regclass::text IN (
--     'public.balancete_linhas','public.balancetes','public.balancete_linha_documentos',
--     'public.documentos_referencia_balancete','public.papeis_trabalho','public.papel_trabalho_linhas'
--   )
--   AND polcmd IN ('a','w');  -- a = INSERT, w = UPDATE
--
-- 4) Teste funcional (sugerido):
--    - Login como auditor vinculado apenas a um trabalho → não enxerga linhas de outros trabalhos.
--    - Login como cliente_usuario → só vê dados do próprio cliente_id.
--    - Login como auditor não-admin → não enxerga cliente_usuarios de clientes inacessíveis.
-- =====================================================================
