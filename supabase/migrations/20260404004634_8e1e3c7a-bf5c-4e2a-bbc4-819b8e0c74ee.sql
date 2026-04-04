
-- Fix SELECT policy to allow bootstrap scenario (read back newly inserted row)
DROP POLICY IF EXISTS "select_auditores" ON public.auditores;
CREATE POLICY "select_auditores" ON public.auditores
FOR SELECT TO authenticated
USING (
  is_admin()
  OR NOT has_any_admin()
  OR auth_user_id = auth.uid()
  OR id IN (
    SELECT ta.auditor_id FROM trabalho_auditores ta
    WHERE ta.trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
  )
);
