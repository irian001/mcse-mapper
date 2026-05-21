# Manual Tecnico

## Arquitetura

O sistema e uma aplicacao React com Vite, TypeScript, React Router, TanStack Query, shadcn/Radix, Supabase e bibliotecas auxiliares como `xlsx` e Recharts.

O backend principal e Supabase externo, usando:

- Supabase Auth.
- Banco Postgres.
- RLS.
- Storage para documentos.

Observacao: inferido a partir do codigo.

## Principais pastas

- `src/pages`: paginas roteadas.
- `src/pages/hubs`: hubs de navegacao.
- `src/pages/cliente`: portal do cliente.
- `src/components`: layout, componentes comuns e componentes de dominio.
- `src/components/trabalhos`: planejamento, materialidade, bases e riscos.
- `src/components/pta`: geracao e manutencao de PTA.
- `src/components/procedimentos`: procedimentos auxiliares.
- `src/components/balancete`: importacao, validacao e documentos de balancete.
- `src/components/regras`: documentos, instrucoes e ERP por regra.
- `src/lib`: servicos e utilitarios.
- `src/hooks`: hooks de usuario, empresa, estruturas e segmentos.
- `src/integrations/supabase`: client e types gerados.
- `docs/sql`: SQLs manuais/documentais de fases recentes.
- `supabase/migrations`: migrations versionadas no repositorio.

## Clients Supabase

Foram encontrados dois clients:

- `src/lib/supabase-client.ts`
  - Usado majoritariamente pelo app.
  - Contem URL e anon key diretamente no arquivo.

- `src/integrations/supabase/client.ts`
  - Client gerado, baseado em variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

Ponto de atencao: consolidar o uso de client Supabase em etapa futura.

## Roteamento

O arquivo `src/App.tsx` contem:

- `AuthGate` para sessao Supabase.
- `ProfileRouter` para separar `auditor`, `cliente_usuario` e `sem_vinculo`.
- Rotas internas do auditor.
- Rotas restritas do cliente.

## Hooks principais

- `useUserProfile`: identifica perfil do usuario.
- `useCurrentAuditor`: carrega auditor logado.
- `useEmpresaAuditoria`: carrega dados da empresa de auditoria.
- `useSegmentos`: carrega segmentos e estruturas de forma tolerante.
- `useEstruturaAtiva`: controla estrutura ativa persistida em `localStorage`.
- `useEstruturaPorCliente`: resolve estrutura aplicavel ao cliente.

## Modulos tecnicos principais

- Cadastros: clientes, auditores, usuarios do cliente, produtos.
- Trabalhos: trabalho, equipe, contrato/produto, status e planejamento.
- Planejamento/materialidade: tabelas novas em SQL manual.
- Riscos: painel e tabela `trabalho_riscos_auditoria`.
- Balancetes: importacao XLS/CSV e validacao.
- PTA: agregacao por conta MCSE, linhas e materialidade.
- Solicitacoes: geracao por regras, PDF/HTML e documentos.
- Portal cliente: upload e reenvio de documentos.
- Procedimentos: caixa, estoque e faturas em aberto.

## `types.ts` desatualizado

O arquivo `src/integrations/supabase/types.ts` nao reflete todas as tabelas usadas pelo frontend.

Tabelas recentes ou nao tipadas levam ao uso de `as any`, por exemplo:

- `trabalho_planejamento`
- `trabalho_materialidade`
- `trabalho_materialidade_bases`
- `trabalho_riscos_auditoria`
- `procedimentos_auxiliares`
- tabelas de procedimentos
- `segmentos`
- `estruturas_auditoria`
- `contratos`
- `contrato_produtos`

## Uso de `as any`

O uso de `as any` aparece como mecanismo de compatibilidade com schema em evolucao. Ele reduz seguranca de tipos e dificulta auditoria tecnica.

Recomendacao futura: regenerar types a partir do Supabase real e remover `as any` gradualmente.

## Evolucao por fases

O repositorio mostra evolucao incremental por Lovable, Codex, ChatGPT e alteracoes manuais. Parte das fases recentes foi documentada em `docs/sql`, nao apenas em migrations.

## `docs/sql` versus `supabase/migrations`

- `supabase/migrations` contem migrations versionadas historicas.
- `docs/sql` contem scripts manuais recentes e instrucoes de execucao.
- Nem todo SQL de `docs/sql` parece ter equivalente em migrations.
- Algumas tabelas usadas pelo frontend nao tiveram definicao local encontrada.

## Pontos de atencao

- Validar schema real no Supabase antes de atualizar documentacao final.
- Confirmar RLS para tabelas novas.
- Confirmar se SQLs manuais foram aplicados no ambiente externo.
- Confirmar se o build usa o client hardcoded ou o client por env.
- Corrigir encoding em etapa propria.
