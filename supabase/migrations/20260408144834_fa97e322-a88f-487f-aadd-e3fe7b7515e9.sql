
-- Recreate view without security_invoker (runs as owner, can access auth.users)
CREATE OR REPLACE VIEW public.auth_users_for_linking AS
SELECT au.id AS user_id, au.email::text AS user_email
FROM auth.users au
WHERE au.id NOT IN (
  SELECT a.auth_user_id FROM public.auditores a WHERE a.auth_user_id IS NOT NULL
)
AND public.is_admin()
ORDER BY au.email;

-- Remove security_invoker setting
ALTER VIEW public.auth_users_for_linking SET (security_invoker = false);

GRANT SELECT ON public.auth_users_for_linking TO authenticated;
NOTIFY pgrst, 'reload schema';
