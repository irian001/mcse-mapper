# Visão Geral do Sistema

## Objetivo

O sistema apoia a execução e organização de trabalhos de auditoria, integrando cadastros, planejamento, materialidade, matriz de riscos, balancetes, papéis de trabalho, solicitações documentais, portal do cliente e procedimentos auxiliares.

Observação: inferido a partir do código e do inventário da Fase D.1.

## Contexto de auditoria

O fluxo foi estruturado para uma equipe interna de auditoria que cadastra clientes, trabalhos, auditores, estruturas de referência, regras documentais e procedimentos. O cliente externo acessa apenas um portal restrito para consultar solicitações e enviar documentos.

O sistema usa Supabase como backend externo, com autenticação, banco relacional, RLS e storage para documentos.

## Módulos principais

- Autenticação e roteamento por perfil.
- Dashboard operacional.
- Clientes, exercícios e parâmetros.
- Auditores e usuários do cliente.
- Produtos de auditoria e contratos.
- Trabalhos de auditoria e equipe.
- Planejamento do trabalho.
- Materialidade e bases de materialidade.
- Matriz de riscos.
- Balancetes.
- MCSE, plano de contas, mapeamento e regras.
- PTA - Papéis de Trabalho de Auditoria.
- Solicitações documentais.
- Portal do cliente.
- Procedimentos auxiliares.
- Contagem de caixa.
- Contagem de estoque.
- Faturas em aberto.

## Fluxo macro

1. O auditor ou administrador cadastra cliente, exercício, auditores, produtos, contratos e regras.
2. O auditor cria um trabalho de auditoria.
3. A equipe é vinculada ao trabalho.
4. O planejamento do trabalho é registrado.
5. A materialidade é definida e aprovada, quando aplicável.
6. Bases de materialidade podem ser cadastradas e vinculadas ao PTA.
7. A matriz de riscos é cadastrada por área, conta, assertiva e resposta planejada.
8. O balancete é importado e mapeado para a estrutura MCSE ou estrutura ativa.
9. O PTA é gerado ou editado a partir das contas do balancete.
10. Solicitações documentais são geradas a partir das regras e disponibilizadas ao cliente.
11. O cliente acessa o portal e envia documentos.
12. O auditor analisa documentos, vincula evidências ao balancete quando aplicável e conclui trabalhos auxiliares.
13. Procedimentos auxiliares complementam a auditoria, incluindo caixa, estoque e faturas em aberto.

Resumo do encadeamento operacional:

`trabalho -> planejamento -> materialidade -> bases de materialidade -> matriz de riscos -> balancete -> PTA -> solicitações -> portal cliente -> procedimentos auxiliares`

Observação: a matriz de riscos já é funcional como cadastro e acompanhamento, mas seus vínculos formais com PTA, procedimentos, solicitações e evidências ainda não foram implementados.

## Limitações atuais

- O README do repositório está desatualizado e descreve outro contexto.
- `docs/sistema` não existe nesta etapa.
- `types.ts` do Supabase está desatualizado em relação a tabelas recentes.
- Há uso frequente de `as any` para tabelas novas.
- Alguns SQLs recentes estão em `docs/sql/`, mas não necessariamente em `supabase/migrations`.
- Algumas tabelas usadas pelo frontend não tiveram `CREATE TABLE` local encontrado.
- Algumas regras de alçada parecem estar implementadas no frontend, sem confirmação equivalente em RLS.
- Há textos com sinais de encoding quebrado em partes do repositório.

## Escopo ainda não implementado ou incompleto

- Vínculo formal de risco com PTA, procedimento, solicitação, evidência ou base de materialidade. Ainda não implementado.
- Workflow completo de revisão técnica com eventos, notas, gates e dashboards de QA. Ainda não implementado.
- Execução específica para ordens de compra e ordens de imobilização. Ainda não implementado.
- Relatórios persistidos centralizados. Ainda não implementado.
- Dicionário de dados validado contra o Supabase real. Ainda não implementado.
- Matriz final de permissões validada por testes de RLS. Ainda não implementado.
