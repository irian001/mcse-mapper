ALTER TYPE public.status_solicitacao ADD VALUE IF NOT EXISTS 'revisada' AFTER 'rascunho';
ALTER TYPE public.status_solicitacao ADD VALUE IF NOT EXISTS 'parcialmente_atendida' AFTER 'parcialmente_respondida';
ALTER TYPE public.status_solicitacao ADD VALUE IF NOT EXISTS 'atendida' AFTER 'parcialmente_atendida';
ALTER TYPE public.status_solicitacao ADD VALUE IF NOT EXISTS 'encerrada' AFTER 'concluida';