-- ============================================================
-- ETAPA 3.1 — Importação e Digitação Assistida (incremento)
-- Execute manualmente no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- Pré-requisito: docs/sql/contagem-estoque.sql já aplicado.
-- ============================================================

-- ------------------------------------------------------------
-- 1) NOVOS CAMPOS NA TABELA DE ITENS
-- ------------------------------------------------------------
-- origem_item: rastreia se o item foi criado por importação ou manualmente.
--   Valores esperados: 'importado' | 'manual'
-- quantidade_sistema_ajustada: marca quando o auditor altera manualmente
--   a quantidade do sistema após a importação (útil para auditoria).
ALTER TABLE public.procedimento_contagem_estoque_itens
  ADD COLUMN IF NOT EXISTS origem_item                 text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS quantidade_sistema_ajustada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantidade_sistema_original numeric(18,4);

-- Índice para filtros futuros (dashboards por origem)
CREATE INDEX IF NOT EXISTS idx_ce_itens_origem
  ON public.procedimento_contagem_estoque_itens(origem_item);

-- ------------------------------------------------------------
-- 2) TRIGGER — marcar ajuste manual da quantidade do sistema
-- ------------------------------------------------------------
-- Se o item foi importado e a quantidade_sistema for alterada
-- posteriormente, marca quantidade_sistema_ajustada = true.
CREATE OR REPLACE FUNCTION public.flag_qtd_sistema_ajustada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Apenas em UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF NEW.origem_item = 'importado'
       AND COALESCE(OLD.quantidade_sistema, 0) IS DISTINCT FROM COALESCE(NEW.quantidade_sistema, 0)
       AND NEW.quantidade_sistema_ajustada = OLD.quantidade_sistema_ajustada THEN
      NEW.quantidade_sistema_ajustada := true;
      IF NEW.quantidade_sistema_original IS NULL THEN
        NEW.quantidade_sistema_original := OLD.quantidade_sistema;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_qtd_sistema_ajustada ON public.procedimento_contagem_estoque_itens;
CREATE TRIGGER trg_flag_qtd_sistema_ajustada
BEFORE UPDATE ON public.procedimento_contagem_estoque_itens
FOR EACH ROW EXECUTE FUNCTION public.flag_qtd_sistema_ajustada();

-- Importante: o trigger trg_calc_contagem_estoque_item (calc) continua valendo
-- e roda em sequência alfabética. Como ambos são BEFORE, basta garantir que
-- ambos retornem NEW (já é o caso).

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
