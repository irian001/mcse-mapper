
-- FIX 1: Prevent non-admins from escalating their own privileges
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is admin, allow everything
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin users cannot change privilege-related columns
  IF NEW.perfil_acesso IS DISTINCT FROM OLD.perfil_acesso
     OR NEW.cargo IS DISTINCT FROM OLD.cargo
     OR NEW.perfil IS DISTINCT FROM OLD.perfil THEN
    RAISE EXCEPTION 'Somente administradores podem alterar perfil de acesso, cargo ou perfil';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_privilege_escalation ON public.auditores;
CREATE TRIGGER trg_prevent_self_privilege_escalation
  BEFORE UPDATE ON public.auditores
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- FIX 2: Remove has_any_admin() from can_access_storage_doc and remaining policies
CREATE OR REPLACE FUNCTION public.can_access_storage_doc(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR (split_part(p_object_name, '/', 1))::uuid IN (
      SELECT public.get_accessible_trabalho_ids()
    );
$$;

-- Fix delete_docs storage policy (remove has_any_admin)
DROP POLICY IF EXISTS "delete_docs" ON storage.objects;
CREATE POLICY "delete_docs" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-balancete'
    AND (is_admin() OR can_access_storage_doc(name))
  );

-- Also fix delete on documentos_referencia_balancete if it still uses has_any_admin
DROP POLICY IF EXISTS "delete_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "delete_docs_ref" ON public.documentos_referencia_balancete FOR DELETE TO authenticated
  USING (is_admin());
