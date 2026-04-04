
ALTER TABLE public.auditores DISABLE TRIGGER trg_prevent_self_privilege_escalation;

UPDATE public.auditores 
SET perfil_acesso = 'admin' 
WHERE id = '556a7c80-f970-4e13-a091-f2f373bc87a6';

ALTER TABLE public.auditores ENABLE TRIGGER trg_prevent_self_privilege_escalation;
