-- ============================================================
-- ETAPA 3.2 — Status "nao_contado" para Contagem de Estoques
-- Execute manualmente no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- Pré-requisitos:
--   - docs/sql/contagem-estoque.sql aplicado
--   - docs/sql/contagem-estoque-v2.sql aplicado
--
-- Objetivo:
--   Diferenciar itens importados que ainda NÃO foram contados
--   dos que já foram efetivamente conferidos pelo auditor.
--   Itens não contados não devem entrar nos totais de divergência.
-- ============================================================

-- ------------------------------------------------------------
-- 1) NOVO CAMPO DE CONTROLE: contado (boolean)
-- ------------------------------------------------------------
-- Marca explicitamente se o auditor já realizou a contagem.
-- Default false: todo item importado nasce como "não contado".
-- Itens criados manualmente (com qtd contada > 0) já entram como contados.
ALTER TABLE public.procedimento_contagem_estoque_itens
  ADD COLUMN IF NOT EXISTS contado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ce_itens_contado
  ON public.procedimento_contagem_estoque_itens(contado);

-- ------------------------------------------------------------
-- 2) ATUALIZAR TRIGGER DE CÁLCULO PARA RESPEITAR "nao_contado"
-- ------------------------------------------------------------
-- Regras:
--   - Se contado = false (ou quantidade_contada nula):
--       status_divergencia = 'nao_contado'
--       diferenca_quantidade = NULL
--       valor_total_contado  = NULL
--       diferenca_valor      = NULL
--   - Se contado = true:
--       calcula normalmente (sem_diferenca / sobra / falta)
--   - status 'relevante' continua sendo respeitado quando definido manualmente
--     (apenas para itens já contados).
CREATE OR REPLACE FUNCTION public.calc_contagem_estoque_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_qtd_sis  numeric := COALESCE(NEW.quantidade_sistema, 0);
  v_qtd_cnt  numeric := NEW.quantidade_contada;       -- pode ser NULL
  v_vlr_uni  numeric := COALESCE(NEW.valor_unitario, 0);
  v_dif_qtd  numeric;
BEGIN
  -- Sempre recalcula valor_total_sistema (independe de ter sido contado)
  NEW.valor_total_sistema := ROUND(v_qtd_sis * v_vlr_uni, 2);

  -- Se item NÃO foi contado, zera diferenças e marca status
  IF NEW.contado = false OR v_qtd_cnt IS NULL THEN
    NEW.quantidade_contada   := NULL;
    NEW.diferenca_quantidade := NULL;
    NEW.valor_total_contado  := NULL;
    NEW.diferenca_valor      := NULL;
    NEW.status_divergencia   := 'nao_contado';
  ELSE
    -- Item contado: cálculo normal
    v_dif_qtd := v_qtd_cnt - v_qtd_sis;

    NEW.diferenca_quantidade := v_dif_qtd;
    NEW.valor_total_contado  := ROUND(v_qtd_cnt * v_vlr_uni, 2);
    NEW.diferenca_valor      := NEW.valor_total_contado - NEW.valor_total_sistema;

    -- Classificação automática (preserva 'relevante' quando definido manualmente)
    IF NEW.status_divergencia IS DISTINCT FROM 'relevante' THEN
      IF v_dif_qtd = 0 THEN
        NEW.status_divergencia := 'sem_diferenca';
      ELSIF v_dif_qtd > 0 THEN
        NEW.status_divergencia := 'sobra';
      ELSE
        NEW.status_divergencia := 'falta';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- O trigger trg_calc_contagem_estoque_item já existe (v1).
-- Apenas a função foi atualizada acima — não precisa recriar o trigger.

-- ------------------------------------------------------------
-- 3) BACKFILL — marcar itens existentes
-- ------------------------------------------------------------
-- Itens que já têm quantidade_contada > 0 são considerados contados.
-- Itens importados com quantidade_contada = 0 (ou nula) ficam como NÃO contados.
UPDATE public.procedimento_contagem_estoque_itens
SET contado = true
WHERE COALESCE(quantidade_contada, 0) <> 0
  AND contado = false;

-- Forçar recálculo dos status (dispara o trigger)
UPDATE public.procedimento_contagem_estoque_itens
SET updated_at = now();

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
