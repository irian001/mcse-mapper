
-- Create enum for status_mapeamento
CREATE TYPE public.status_mapeamento AS ENUM ('nao_mapeado', 'mapeado_automatico', 'mapeado_manual', 'homologado');

-- Drop old unique constraint if exists
ALTER TABLE public.cliente_contas_origem DROP CONSTRAINT IF EXISTS cliente_contas_origem_cliente_id_codigo_origem_key;

-- Drop old columns
ALTER TABLE public.cliente_contas_origem 
  DROP COLUMN IF EXISTS codigo_origem,
  DROP COLUMN IF EXISTS descricao_origem,
  DROP COLUMN IF EXISTS natureza_origem,
  DROP COLUMN IF EXISTS nivel_origem,
  DROP COLUMN IF EXISTS aceita_lancamento;

-- Rename ativo to keep it but we'll use the new ativa field
ALTER TABLE public.cliente_contas_origem DROP COLUMN IF EXISTS ativo;

-- Add new columns matching the real file layout
ALTER TABLE public.cliente_contas_origem
  ADD COLUMN idempresa text,
  ADD COLUMN idconta text NOT NULL DEFAULT '',
  ADD COLUMN nome text NOT NULL DEFAULT '',
  ADD COLUMN ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN classificacao text,
  ADD COLUMN analitica boolean NOT NULL DEFAULT false,
  ADD COLUMN grau integer,
  ADD COLUMN clasmasc text,
  ADD COLUMN contabmp text,
  ADD COLUMN data_inclusao text,
  ADD COLUMN tipo_contab text,
  ADD COLUMN gerar_lanctos_cso boolean NOT NULL DEFAULT false,
  ADD COLUMN idversao text,
  ADD COLUMN nivel_classificacao integer DEFAULT 0,
  ADD COLUMN codigo_mcse_sugerido text,
  ADD COLUMN status_mapeamento public.status_mapeamento NOT NULL DEFAULT 'nao_mapeado',
  ADD COLUMN observacao_importacao text;

-- Add unique constraint on cliente_id + idconta
ALTER TABLE public.cliente_contas_origem 
  ADD CONSTRAINT cliente_contas_origem_cliente_id_idconta_key UNIQUE (cliente_id, idconta);
