
GRANT EXECUTE ON FUNCTION public.get_auth_users_for_linking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_users_for_linking() TO anon;
NOTIFY pgrst, 'reload schema';
