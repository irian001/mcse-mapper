DROP POLICY IF EXISTS select_auditores ON public.auditores;

CREATE POLICY select_auditores ON public.auditores
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.get_my_auditor_id() IS NOT NULL
      AND NOT public.is_cliente_usuario()
    )
  );

NOTIFY pgrst, 'reload schema';