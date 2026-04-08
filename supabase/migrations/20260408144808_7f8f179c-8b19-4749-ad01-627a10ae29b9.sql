
-- Create a security definer view to list available auth users
CREATE OR REPLACE VIEW public.auth_users_for_linking AS
SELECT au.id AS user_id, au.email::text AS user_email
FROM auth.users au
WHERE au.id NOT IN (
  SELECT a.auth_user_id FROM public.auditores a WHERE a.auth_user_id IS NOT NULL
)
ORDER BY au.email;

-- Grant access
GRANT SELECT ON public.auth_users_for_linking TO authenticated;

-- RLS: only admins can see this view (enable RLS on the view)
ALTER VIEW public.auth_users_for_linking SET (security_invoker = true);
