
-- Drop old single-param overload if it exists
DROP FUNCTION IF EXISTS public.link_auditor_account(uuid);

-- Recreate get_auth_users_for_linking to force schema cache refresh
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

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
