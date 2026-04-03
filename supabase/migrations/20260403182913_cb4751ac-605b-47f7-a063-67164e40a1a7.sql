
-- Remove old ALL policies on MCSE reference tables (our new per-operation policies already exist)
DROP POLICY IF EXISTS "manage_mcse_contas" ON public.mcse_contas;
DROP POLICY IF EXISTS "manage_mcse_grupos" ON public.mcse_grupos;
DROP POLICY IF EXISTS "manage_mcse_subgrupos" ON public.mcse_subgrupos;
DROP POLICY IF EXISTS "manage_mcse_regras" ON public.mcse_regras_conta;

-- Remove old documentos_referencia_balancete policies with has_any_admin
DROP POLICY IF EXISTS "select_docs" ON public.documentos_referencia_balancete;
DROP POLICY IF EXISTS "insert_docs" ON public.documentos_referencia_balancete;
DROP POLICY IF EXISTS "update_docs" ON public.documentos_referencia_balancete;
DROP POLICY IF EXISTS "delete_docs" ON public.documentos_referencia_balancete;

-- The correct policies (select_docs_ref, insert_docs_ref, update_docs_ref, delete_docs_ref) 
-- were already created in the previous migration. Verify they exist, re-create if needed:
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
