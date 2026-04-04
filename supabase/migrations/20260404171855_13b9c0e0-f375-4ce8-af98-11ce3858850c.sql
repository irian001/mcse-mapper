
-- Fix: Restrict bootstrap insert to only allow non-privileged roles
DROP POLICY IF EXISTS "insert_auditores" ON public.auditores;
CREATE POLICY "insert_auditores" ON public.auditores
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      NOT has_any_admin()
      AND perfil_acesso = 'assistente'
      AND cargo = 'assistente'
      AND perfil = 'assistente'
    )
  );

-- Fix: Tighten bootstrap SELECT so unauthenticated-admin scenario only shows own row
DROP POLICY IF EXISTS "select_auditores" ON public.auditores;
CREATE POLICY "select_auditores" ON public.auditores
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (auth_user_id = auth.uid())
    OR (id IN (
      SELECT ta.auditor_id
      FROM trabalho_auditores ta
      WHERE ta.trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    ))
  );
