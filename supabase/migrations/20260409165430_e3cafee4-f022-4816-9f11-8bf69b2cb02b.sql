
-- 1. Renomear colunas existentes
ALTER TABLE public.mcse_regras_conta RENAME COLUMN conta_id TO conta_mcse_id;
ALTER TABLE public.mcse_regras_conta RENAME COLUMN requer_documento_obrigatorio TO exige_documento_obrigatorio;
ALTER TABLE public.mcse_regras_conta RENAME COLUMN requer_revisao_humana TO exige_revisao_humana;
ALTER TABLE public.mcse_regras_conta RENAME COLUMN requer_conciliacao_reg_soc TO exige_conciliacao_reg_soc;

-- 2. Adicionar novos campos
ALTER TABLE public.mcse_regras_conta
  ADD COLUMN codigo_mcse text,
  ADD COLUMN descricao_mcse text,
  ADD COLUMN conta_critica boolean NOT NULL DEFAULT false,
  ADD COLUMN grupo_documental text,
  ADD COLUMN gera_solicitacao_automatica boolean NOT NULL DEFAULT false,
  ADD COLUMN ativo boolean NOT NULL DEFAULT true;

-- 3. Preencher codigo_mcse e descricao_mcse a partir de mcse_contas para registros existentes
UPDATE public.mcse_regras_conta r
SET codigo_mcse = c.codigo_mcse,
    descricao_mcse = c.descricao_conta,
    conta_critica = c.conta_critica
FROM public.mcse_contas c
WHERE r.conta_mcse_id = c.id;

-- 4. Garantir unicidade: no máximo 1 regra por conta MCSE
ALTER TABLE public.mcse_regras_conta
  ADD CONSTRAINT mcse_regras_conta_conta_mcse_id_unique UNIQUE (conta_mcse_id);

-- 5. Índice para buscas por codigo_mcse
CREATE INDEX idx_mcse_regras_conta_codigo ON public.mcse_regras_conta (codigo_mcse);
