-- Prevent duplicate automatic PTA generation for the same trabalho + conta MCSE
CREATE UNIQUE INDEX IF NOT EXISTS idx_papeis_trabalho_unique_auto
ON public.papeis_trabalho (trabalho_auditoria_id, conta_mcse_id)
WHERE conta_mcse_id IS NOT NULL;
