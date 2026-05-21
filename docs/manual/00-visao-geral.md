# Visao Geral do Sistema

## Objetivo

O sistema apoia a execucao e organizacao de trabalhos de auditoria, integrando cadastros, planejamento, materialidade, matriz de riscos, balancetes, papeis de trabalho, solicitacoes documentais, portal do cliente e procedimentos auxiliares.

Observacao: inferido a partir do codigo e do inventario da Fase D.1.

## Contexto de auditoria

O fluxo foi estruturado para uma equipe interna de auditoria que cadastra clientes, trabalhos, auditores, estruturas de referencia, regras documentais e procedimentos. O cliente externo acessa apenas um portal restrito para consultar solicitacoes e enviar documentos.

O sistema usa Supabase como backend externo, com autenticação, banco relacional, RLS e storage para documentos.

## Modulos principais

- Autenticacao e roteamento por perfil.
- Dashboard operacional.
- Clientes, exercicios e parametros.
- Auditores e usuarios do cliente.
- Produtos de auditoria e contratos.
- Trabalhos de auditoria e equipe.
- Planejamento do trabalho.
- Materialidade e bases de materialidade.
- Matriz de riscos.
- Balancetes.
- MCSE, plano de contas, mapeamento e regras.
- PTA - Papeis de Trabalho de Auditoria.
- Solicitacoes documentais.
- Portal do cliente.
- Procedimentos auxiliares.
- Contagem de caixa.
- Contagem de estoque.
- Faturas em aberto.

## Fluxo macro

1. O auditor ou administrador cadastra cliente, exercicio, auditores, produtos, contratos e regras.
2. O auditor cria um trabalho de auditoria.
3. A equipe e vinculada ao trabalho.
4. O planejamento do trabalho e registrado.
5. A materialidade e definida e aprovada.
6. Bases de materialidade podem ser cadastradas e vinculadas ao PTA.
7. A matriz de riscos e cadastrada por area, conta, assertiva e resposta planejada.
8. O balancete e importado e mapeado para a estrutura MCSE ou estrutura ativa.
9. O PTA e gerado ou editado a partir das contas do balancete.
10. Solicitacoes documentais sao geradas a partir das regras e disponibilizadas ao cliente.
11. O cliente acessa o portal e envia documentos.
12. O auditor analisa documentos, vincula evidencias ao balancete e conclui trabalhos auxiliares.
13. Procedimentos auxiliares complementam a auditoria, incluindo caixa, estoque e faturas em aberto.

## Limitacoes atuais

- O README do repositorio esta desatualizado e descreve outro contexto.
- `docs/sistema` nao existe nesta etapa.
- `types.ts` do Supabase esta desatualizado em relacao a tabelas recentes.
- Ha uso frequente de `as any` para tabelas novas.
- Alguns SQLs recentes estao em `docs/sql/`, mas nao necessariamente em `supabase/migrations`.
- Algumas tabelas usadas pelo frontend nao tiveram `CREATE TABLE` local encontrado.
- Algumas regras de alcada parecem estar implementadas no frontend, sem confirmacao equivalente em RLS.
- Ha textos com sinais de encoding quebrado em partes do repositorio.

## Escopo ainda nao implementado ou incompleto

- Vinculo formal de risco com PTA, procedimento, solicitacao, evidencia ou base de materialidade. Ainda nao implementado.
- Workflow completo de revisao tecnica com eventos, notas, gates e dashboards de QA. Ainda nao implementado.
- Execucao especifica para ordens de compra e ordens de imobilizacao. Ainda nao implementado.
- Relatorios persistidos centralizados. Ainda nao implementado.
- Dicionario de dados validado contra o Supabase real. Ainda nao implementado.
- Matriz final de permissoes validada por testes de RLS. Ainda nao implementado.
