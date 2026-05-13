-- Revoke from PUBLIC and anon on all SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_cliente_usuario() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_auditor_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_accessible_trabalho_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_accessible_cliente_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_cliente_usuario_cliente_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_storage_doc(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_sol_storage_doc(text) FROM PUBLIC, anon;

-- Trigger-only functions: revoke from all client roles
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- Admin-only RPCs: only authenticated; not anon/public
REVOKE EXECUTE ON FUNCTION public.get_auth_users_for_linking() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_auditor_by_email(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_auditor_account(uuid, uuid) FROM PUBLIC, anon;

-- Ensure authenticated keeps execute on RLS helpers (required for policy evaluation)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cliente_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_auditor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_trabalho_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_cliente_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cliente_usuario_cliente_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_storage_doc(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_sol_storage_doc(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_users_for_linking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_auditor_by_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_auditor_account(uuid, uuid) TO authenticated;