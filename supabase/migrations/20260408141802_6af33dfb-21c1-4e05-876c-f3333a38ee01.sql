
-- Function to list auth users available for linking (admin only)
CREATE OR REPLACE FUNCTION public.get_auth_users_for_linking()
RETURNS TABLE(user_id uuid, user_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.email::text AS user_email
  FROM auth.users au
  WHERE au.id NOT IN (
    SELECT a.auth_user_id FROM public.auditores a WHERE a.auth_user_id IS NOT NULL
  )
  ORDER BY au.email;
$$;

-- Update link_auditor_account to be admin-only and accept a target user_id
CREATE OR REPLACE FUNCTION public.link_auditor_account(p_auditor_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
BEGIN
  -- Only admins can link
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem vincular usuários a auditores';
  END IF;

  -- Determine target user: explicit param or current user
  v_target_user_id := COALESCE(p_user_id, auth.uid());

  -- Check auditor exists and is not already linked
  IF NOT EXISTS (SELECT 1 FROM auditores WHERE id = p_auditor_id AND auth_user_id IS NULL) THEN
    RAISE EXCEPTION 'Auditor não encontrado ou já possui vínculo';
  END IF;

  -- Prevent user from being linked to multiple auditors
  IF EXISTS (SELECT 1 FROM auditores WHERE auth_user_id = v_target_user_id) THEN
    RAISE EXCEPTION 'Usuário já vinculado a outro auditor';
  END IF;

  -- Verify target user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_target_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  UPDATE auditores SET auth_user_id = v_target_user_id WHERE id = p_auditor_id;
END;
$$;
