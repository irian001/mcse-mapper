
-- ============================================================
-- SECURITY FIX: Auditores table - privilege escalation, bootstrap, data exposure
-- ============================================================

-- 1. CREATE TRIGGER for prevent_self_privilege_escalation (function exists but trigger was missing)
DROP TRIGGER IF EXISTS trg_prevent_self_privilege_escalation ON public.auditores;
CREATE TRIGGER trg_prevent_self_privilege_escalation
  BEFORE UPDATE ON public.auditores
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- 2. REPLACE the trigger function to also block auth_user_id and ativo changes by non-admins
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins can do anything
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin: block changes to ALL sensitive fields
  IF NEW.perfil_acesso IS DISTINCT FROM OLD.perfil_acesso THEN
    RAISE EXCEPTION 'Somente administradores podem alterar perfil de acesso';
  END IF;
  IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
    RAISE EXCEPTION 'Somente administradores podem alterar cargo';
  END IF;
  IF NEW.perfil IS DISTINCT FROM OLD.perfil THEN
    RAISE EXCEPTION 'Somente administradores podem alterar perfil';
  END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Somente administradores podem alterar vínculo de usuário';
  END IF;
  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'Somente administradores podem alterar status ativo';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. FIX INSERT POLICY: Remove open bootstrap - only admin can insert
DROP POLICY IF EXISTS insert_auditores ON public.auditores;
CREATE POLICY insert_auditores ON public.auditores
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- 4. FIX UPDATE POLICY: Non-admins can only update their own non-sensitive fields
-- The trigger above enforces which fields can change, but we tighten the policy too
DROP POLICY IF EXISTS update_auditores ON public.auditores;
CREATE POLICY update_auditores ON public.auditores
  FOR UPDATE TO authenticated
  USING (is_admin() OR auth_user_id = auth.uid())
  WITH CHECK (is_admin() OR auth_user_id = auth.uid());

-- 5. FIX SELECT POLICY: Remove bootstrap exposure
DROP POLICY IF EXISTS select_auditores ON public.auditores;
CREATE POLICY select_auditores ON public.auditores
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR auth_user_id = auth.uid()
    OR id IN (
      SELECT ta.auditor_id
      FROM trabalho_auditores ta
      WHERE ta.trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

-- 6. FIX link_auditor_account: Only admin can link, OR user linking to themselves if admin assigned them
CREATE OR REPLACE FUNCTION public.link_auditor_account(p_auditor_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_auditor_email text;
  v_user_email text;
BEGIN
  -- Only allow if user is admin OR auditor email matches the authenticated user's email
  SELECT email INTO v_auditor_email FROM auditores WHERE id = p_auditor_id AND auth_user_id IS NULL;
  IF v_auditor_email IS NULL THEN
    RAISE EXCEPTION 'Auditor não encontrado ou já possui vínculo';
  END IF;

  -- Get authenticated user email
  SELECT au.email INTO v_user_email FROM auth.users au WHERE au.id = auth.uid();

  -- Allow if admin or if emails match exactly
  IF NOT public.is_admin() AND (v_auditor_email IS NULL OR lower(v_auditor_email) <> lower(v_user_email)) THEN
    RAISE EXCEPTION 'Vínculo permitido apenas por administrador ou quando o email do auditor corresponde ao da conta';
  END IF;

  -- Prevent user from linking if already linked to another auditor
  IF EXISTS (SELECT 1 FROM auditores WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Usuário já vinculado a outro auditor';
  END IF;

  UPDATE auditores SET auth_user_id = auth.uid() WHERE id = p_auditor_id;
END;
$function$;
