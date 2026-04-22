-- ============================================================
-- ETAPA 3 — CONTAGEM DE ESTOQUES
-- Execute manualmente no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
-- ============================================================

-- ------------------------------------------------------------
-- 1) TABELA DE BLOCOS DE CONTAGEM
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procedimento_contagem_estoque_blocos (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimento_auxiliar_id uuid NOT NULL
                           REFERENCES public.procedimentos_auxiliares(id) ON DELETE CASCADE,

  -- Contexto
  filial            text,
  setor             text,
  tipo_estoque      text,           -- ex: materia_prima, produto_acabado, almoxarifado
  categoria_estoque text,           -- opcional

  -- Controle
  descricao_bloco    text,
  responsavel_local  text,
  observacao         text,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_blocos_proc      ON public.procedimento_contagem_estoque_blocos(procedimento_auxiliar_id);
CREATE INDEX IF NOT EXISTS idx_ce_blocos_filial    ON public.procedimento_contagem_estoque_blocos(filial);
CREATE INDEX IF NOT EXISTS idx_ce_blocos_setor     ON public.procedimento_contagem_estoque_blocos(setor);
CREATE INDEX IF NOT EXISTS idx_ce_blocos_tipo      ON public.procedimento_contagem_estoque_blocos(tipo_estoque);

-- ------------------------------------------------------------
-- 2) TABELA DE ITENS CONTADOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procedimento_contagem_estoque_itens (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contagem_estoque_bloco_id   uuid NOT NULL
                              REFERENCES public.procedimento_contagem_estoque_blocos(id) ON DELETE CASCADE,

  -- Item
  codigo_item     text,
  descricao_item  text,
  unidade_medida  text,

  -- Quantidades
  quantidade_sistema   numeric(18,4) DEFAULT 0,
  quantidade_contada   numeric(18,4) DEFAULT 0,
  diferenca_quantidade numeric(18,4) DEFAULT 0,

  -- Financeiro
  valor_unitario       numeric(18,4) DEFAULT 0,
  valor_total_sistema  numeric(18,2) DEFAULT 0,
  valor_total_contado  numeric(18,2) DEFAULT 0,
  diferenca_valor      numeric(18,2) DEFAULT 0,

  -- Classificação
  status_divergencia   text NOT NULL DEFAULT 'sem_diferenca',
                       -- valores: sem_diferenca | sobra | falta | relevante

  observacao  text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_itens_bloco   ON public.procedimento_contagem_estoque_itens(contagem_estoque_bloco_id);
CREATE INDEX IF NOT EXISTS idx_ce_itens_status  ON public.procedimento_contagem_estoque_itens(status_divergencia);
CREATE INDEX IF NOT EXISTS idx_ce_itens_codigo  ON public.procedimento_contagem_estoque_itens(codigo_item);

-- ------------------------------------------------------------
-- 3) TRIGGER DE CÁLCULO AUTOMÁTICO
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_contagem_estoque_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_qtd_sis  numeric := COALESCE(NEW.quantidade_sistema, 0);
  v_qtd_cnt  numeric := COALESCE(NEW.quantidade_contada, 0);
  v_vlr_uni  numeric := COALESCE(NEW.valor_unitario, 0);
  v_dif_qtd  numeric;
BEGIN
  v_dif_qtd := v_qtd_cnt - v_qtd_sis;

  NEW.diferenca_quantidade := v_dif_qtd;
  NEW.valor_total_sistema  := ROUND(v_qtd_sis * v_vlr_uni, 2);
  NEW.valor_total_contado  := ROUND(v_qtd_cnt * v_vlr_uni, 2);
  NEW.diferenca_valor      := NEW.valor_total_contado - NEW.valor_total_sistema;

  -- classificação automática (apenas se não vier 'relevante' explicitamente)
  IF NEW.status_divergencia IS DISTINCT FROM 'relevante' THEN
    IF v_dif_qtd = 0 THEN
      NEW.status_divergencia := 'sem_diferenca';
    ELSIF v_dif_qtd > 0 THEN
      NEW.status_divergencia := 'sobra';
    ELSE
      NEW.status_divergencia := 'falta';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_contagem_estoque_item ON public.procedimento_contagem_estoque_itens;
CREATE TRIGGER trg_calc_contagem_estoque_item
BEFORE INSERT OR UPDATE ON public.procedimento_contagem_estoque_itens
FOR EACH ROW EXECUTE FUNCTION public.calc_contagem_estoque_item();

-- ------------------------------------------------------------
-- 4) TRIGGER updated_at NO BLOCO
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_upd_ce_blocos ON public.procedimento_contagem_estoque_blocos;
CREATE TRIGGER trg_upd_ce_blocos
BEFORE UPDATE ON public.procedimento_contagem_estoque_blocos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 5) RLS — alinhado com o padrão do projeto
-- ------------------------------------------------------------
ALTER TABLE public.procedimento_contagem_estoque_blocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimento_contagem_estoque_itens  ENABLE ROW LEVEL SECURITY;

-- Blocos
CREATE POLICY select_ce_blocos ON public.procedimento_contagem_estoque_blocos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_ce_blocos ON public.procedimento_contagem_estoque_blocos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY update_ce_blocos ON public.procedimento_contagem_estoque_blocos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY delete_ce_blocos ON public.procedimento_contagem_estoque_blocos
  FOR DELETE TO authenticated USING (is_admin());

-- Itens
CREATE POLICY select_ce_itens ON public.procedimento_contagem_estoque_itens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_ce_itens ON public.procedimento_contagem_estoque_itens
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY update_ce_itens ON public.procedimento_contagem_estoque_itens
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY delete_ce_itens ON public.procedimento_contagem_estoque_itens
  FOR DELETE TO authenticated USING (is_admin());

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
