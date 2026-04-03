
-- Fix bootstrap problem: allow first auditor creation when no admin exists
DROP POLICY IF EXISTS "insert_auditores" ON public.auditores;
CREATE POLICY "insert_auditores" ON public.auditores
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  OR NOT has_any_admin()
);
