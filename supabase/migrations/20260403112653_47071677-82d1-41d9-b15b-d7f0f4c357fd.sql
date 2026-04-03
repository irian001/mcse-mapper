
ALTER TABLE public.balancete_linhas
  ADD COLUMN IF NOT EXISTS valor_validado numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diferenca_validacao numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diferenca_aceita boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS justificativa_diferenca text DEFAULT NULL;
