
-- Drop the insecure view
DROP VIEW IF EXISTS public.auth_users_for_linking;

-- Create a function that links by email instead of user_id
CREATE OR REPLACE FUNCTION public.link_auditor_by_email(p_auditor_id uuid, p_user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only admins can link
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem vincular usuários a auditores';
  END IF;

  -- Find user by email
  SELECT au.id INTO v_user_id FROM auth.users au WHERE lower(au.email) = lower(p_user_email);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado com o email: %', p_user_email;
  END IF;

  -- Check auditor exists and is not already linked
  IF NOT EXISTS (SELECT 1 FROM auditores WHERE id = p_auditor_id AND auth_user_id IS NULL) THEN
    RAISE EXCEPTION 'Auditor não encontrado ou já possui vínculo';
  END IF;

  -- Prevent double linking
  IF EXISTS (SELECT 1 FROM auditores WHERE auth_user_id = v_user_id) THEN
    RAISE EXCEPTION 'Este usuário já está vinculado a outro auditor';
  END IF;

  UPDATE auditores SET auth_user_id = v_user_id WHERE id = p_auditor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_auditor_by_email(uuid, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
