
-- =============================================
-- FIX 1: Remove has_any_admin() bootstrap bypass from ALL policies
-- Replace (NOT has_any_admin()) OR is_admin() with just is_admin()
-- This ensures default-deny when no admin exists
-- =============================================

-- AUDITORES
DROP POLICY IF EXISTS "select_auditores" ON public.auditores;
CREATE POLICY "select_auditores" ON public.auditores FOR SELECT TO authenticated
  USING (
    is_admin()
    OR auth_user_id = auth.uid()
    OR id IN (
      SELECT ta.auditor_id FROM public.trabalho_auditores ta
      WHERE ta.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
    )
  );

DROP POLICY IF EXISTS "insert_auditores" ON public.auditores;
CREATE POLICY "insert_auditores" ON public.auditores FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_auditores" ON public.auditores;
CREATE POLICY "update_auditores" ON public.auditores FOR UPDATE TO authenticated
  USING (is_admin() OR auth_user_id = auth.uid())
  WITH CHECK (is_admin() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "delete_auditores" ON public.auditores;
CREATE POLICY "delete_auditores" ON public.auditores FOR DELETE TO authenticated
  USING (is_admin());

-- BALANCETE_LINHAS
DROP POLICY IF EXISTS "select_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "select_bal_linhas" ON public.balancete_linhas FOR SELECT TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "insert_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "insert_bal_linhas" ON public.balancete_linhas FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "update_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "update_bal_linhas" ON public.balancete_linhas FOR UPDATE TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "delete_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "delete_bal_linhas" ON public.balancete_linhas FOR DELETE TO authenticated
  USING (is_admin());

-- BALANCETES
DROP POLICY IF EXISTS "select_balancetes" ON public.balancetes;
CREATE POLICY "select_balancetes" ON public.balancetes FOR SELECT TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "insert_balancetes" ON public.balancetes;
CREATE POLICY "insert_balancetes" ON public.balancetes FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "update_balancetes" ON public.balancetes;
CREATE POLICY "update_balancetes" ON public.balancetes FOR UPDATE TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "delete_balancetes" ON public.balancetes;
CREATE POLICY "delete_balancetes" ON public.balancetes FOR DELETE TO authenticated
  USING (is_admin());

-- CLIENTE_CONTAS_ORIGEM
DROP POLICY IF EXISTS "select_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "select_contas_origem" ON public.cliente_contas_origem FOR SELECT TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "insert_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "insert_contas_origem" ON public.cliente_contas_origem FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "update_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "update_contas_origem" ON public.cliente_contas_origem FOR UPDATE TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "delete_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "delete_contas_origem" ON public.cliente_contas_origem FOR DELETE TO authenticated
  USING (is_admin());

-- CLIENTE_MAPEAMENTO_MCSE
DROP POLICY IF EXISTS "select_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "select_mapeamento" ON public.cliente_mapeamento_mcse FOR SELECT TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "insert_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "insert_mapeamento" ON public.cliente_mapeamento_mcse FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "update_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "update_mapeamento" ON public.cliente_mapeamento_mcse FOR UPDATE TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "delete_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "delete_mapeamento" ON public.cliente_mapeamento_mcse FOR DELETE TO authenticated
  USING (is_admin());

-- CLIENTE_PARAMETROS
DROP POLICY IF EXISTS "select_parametros" ON public.cliente_parametros;
CREATE POLICY "select_parametros" ON public.cliente_parametros FOR SELECT TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "insert_parametros" ON public.cliente_parametros;
CREATE POLICY "insert_parametros" ON public.cliente_parametros FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "update_parametros" ON public.cliente_parametros;
CREATE POLICY "update_parametros" ON public.cliente_parametros FOR UPDATE TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "delete_parametros" ON public.cliente_parametros;
CREATE POLICY "delete_parametros" ON public.cliente_parametros FOR DELETE TO authenticated
  USING (is_admin());

-- CLIENTES
DROP POLICY IF EXISTS "select_clientes" ON public.clientes;
CREATE POLICY "select_clientes" ON public.clientes FOR SELECT TO authenticated
  USING (is_admin() OR id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "insert_clientes" ON public.clientes;
CREATE POLICY "insert_clientes" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_clientes" ON public.clientes;
CREATE POLICY "update_clientes" ON public.clientes FOR UPDATE TO authenticated
  USING (is_admin() OR id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (is_admin() OR id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "delete_clientes" ON public.clientes;
CREATE POLICY "delete_clientes" ON public.clientes FOR DELETE TO authenticated
  USING (is_admin());

-- DOCUMENTOS_REFERENCIA_BALANCETE
DROP POLICY IF EXISTS "select_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "select_docs_ref" ON public.documentos_referencia_balancete FOR SELECT TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "insert_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "insert_docs_ref" ON public.documentos_referencia_balancete FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "update_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "update_docs_ref" ON public.documentos_referencia_balancete FOR UPDATE TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "delete_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "delete_docs_ref" ON public.documentos_referencia_balancete FOR DELETE TO authenticated
  USING (is_admin());

-- EXERCICIOS
DROP POLICY IF EXISTS "select_exercicios" ON public.exercicios;
CREATE POLICY "select_exercicios" ON public.exercicios FOR SELECT TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "insert_exercicios" ON public.exercicios;
CREATE POLICY "insert_exercicios" ON public.exercicios FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "update_exercicios" ON public.exercicios;
CREATE POLICY "update_exercicios" ON public.exercicios FOR UPDATE TO authenticated
  USING (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));

DROP POLICY IF EXISTS "delete_exercicios" ON public.exercicios;
CREATE POLICY "delete_exercicios" ON public.exercicios FOR DELETE TO authenticated
  USING (is_admin());

-- MCSE_CONTAS (reference table - keep readable by all authenticated)
DROP POLICY IF EXISTS "select_mcse_contas" ON public.mcse_contas;
CREATE POLICY "select_mcse_contas" ON public.mcse_contas FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_mcse_contas" ON public.mcse_contas;
CREATE POLICY "insert_mcse_contas" ON public.mcse_contas FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_mcse_contas" ON public.mcse_contas;
CREATE POLICY "update_mcse_contas" ON public.mcse_contas FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_mcse_contas" ON public.mcse_contas;
CREATE POLICY "delete_mcse_contas" ON public.mcse_contas FOR DELETE TO authenticated
  USING (is_admin());

-- MCSE_GRUPOS (reference table)
DROP POLICY IF EXISTS "select_mcse_grupos" ON public.mcse_grupos;
CREATE POLICY "select_mcse_grupos" ON public.mcse_grupos FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_mcse_grupos" ON public.mcse_grupos;
CREATE POLICY "insert_mcse_grupos" ON public.mcse_grupos FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_mcse_grupos" ON public.mcse_grupos;
CREATE POLICY "update_mcse_grupos" ON public.mcse_grupos FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_mcse_grupos" ON public.mcse_grupos;
CREATE POLICY "delete_mcse_grupos" ON public.mcse_grupos FOR DELETE TO authenticated
  USING (is_admin());

-- MCSE_SUBGRUPOS (reference table)
DROP POLICY IF EXISTS "select_mcse_subgrupos" ON public.mcse_subgrupos;
CREATE POLICY "select_mcse_subgrupos" ON public.mcse_subgrupos FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_mcse_subgrupos" ON public.mcse_subgrupos;
CREATE POLICY "insert_mcse_subgrupos" ON public.mcse_subgrupos FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_mcse_subgrupos" ON public.mcse_subgrupos;
CREATE POLICY "update_mcse_subgrupos" ON public.mcse_subgrupos FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_mcse_subgrupos" ON public.mcse_subgrupos;
CREATE POLICY "delete_mcse_subgrupos" ON public.mcse_subgrupos FOR DELETE TO authenticated
  USING (is_admin());

-- MCSE_REGRAS_CONTA (reference table)
DROP POLICY IF EXISTS "select_mcse_regras" ON public.mcse_regras_conta;
CREATE POLICY "select_mcse_regras" ON public.mcse_regras_conta FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_mcse_regras" ON public.mcse_regras_conta;
CREATE POLICY "insert_mcse_regras" ON public.mcse_regras_conta FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_mcse_regras" ON public.mcse_regras_conta;
CREATE POLICY "update_mcse_regras" ON public.mcse_regras_conta FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_mcse_regras" ON public.mcse_regras_conta;
CREATE POLICY "delete_mcse_regras" ON public.mcse_regras_conta FOR DELETE TO authenticated
  USING (is_admin());

-- PAPEIS_TRABALHO
DROP POLICY IF EXISTS "select_papeis" ON public.papeis_trabalho;
CREATE POLICY "select_papeis" ON public.papeis_trabalho FOR SELECT TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "insert_papeis" ON public.papeis_trabalho;
CREATE POLICY "insert_papeis" ON public.papeis_trabalho FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "update_papeis" ON public.papeis_trabalho;
CREATE POLICY "update_papeis" ON public.papeis_trabalho FOR UPDATE TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "delete_papeis" ON public.papeis_trabalho;
CREATE POLICY "delete_papeis" ON public.papeis_trabalho FOR DELETE TO authenticated
  USING (is_admin());

-- PAPEL_TRABALHO_LINHAS
DROP POLICY IF EXISTS "select_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "select_papel_linhas" ON public.papel_trabalho_linhas FOR SELECT TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "insert_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "insert_papel_linhas" ON public.papel_trabalho_linhas FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "update_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "update_papel_linhas" ON public.papel_trabalho_linhas FOR UPDATE TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "delete_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "delete_papel_linhas" ON public.papel_trabalho_linhas FOR DELETE TO authenticated
  USING (is_admin());

-- TRABALHO_AUDITORES
DROP POLICY IF EXISTS "select_trabalho_auditores" ON public.trabalho_auditores;
CREATE POLICY "select_trabalho_auditores" ON public.trabalho_auditores FOR SELECT TO authenticated
  USING (is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "insert_trabalho_auditores" ON public.trabalho_auditores;
CREATE POLICY "insert_trabalho_auditores" ON public.trabalho_auditores FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_trabalho_auditores" ON public.trabalho_auditores;
CREATE POLICY "update_trabalho_auditores" ON public.trabalho_auditores FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_trabalho_auditores" ON public.trabalho_auditores;
CREATE POLICY "delete_trabalho_auditores" ON public.trabalho_auditores FOR DELETE TO authenticated
  USING (is_admin());

-- TRABALHOS_AUDITORIA
DROP POLICY IF EXISTS "select_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "select_trabalhos" ON public.trabalhos_auditoria FOR SELECT TO authenticated
  USING (is_admin() OR id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "insert_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "insert_trabalhos" ON public.trabalhos_auditoria FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "update_trabalhos" ON public.trabalhos_auditoria FOR UPDATE TO authenticated
  USING (is_admin() OR id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (is_admin() OR id IN (SELECT public.get_accessible_trabalho_ids()));

DROP POLICY IF EXISTS "delete_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "delete_trabalhos" ON public.trabalhos_auditoria FOR DELETE TO authenticated
  USING (is_admin());

-- =============================================
-- FIX 2: Storage - fix upload policy & add UPDATE policy
-- =============================================

DROP POLICY IF EXISTS "upload_docs" ON storage.objects;
CREATE POLICY "upload_docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-balancete'
    AND (
      is_admin()
      OR (split_part(name, '/', 1))::uuid IN (SELECT public.get_accessible_trabalho_ids())
    )
  );

CREATE POLICY "update_docs" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos-balancete'
    AND (is_admin() OR can_access_storage_doc(name))
  )
  WITH CHECK (
    bucket_id = 'documentos-balancete'
    AND (is_admin() OR can_access_storage_doc(name))
  );

-- =============================================
-- FIX 3: Update has_any_admin to be used only for UI bootstrap detection
-- The function stays but is no longer used in any RLS policy
-- =============================================
