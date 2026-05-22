# Manual do Sistema - Índice Geral

Este diretório contém a estrutura da documentação funcional, técnica e operacional do sistema, criada a partir do inventário técnico-funcional da Fase D.1 e evoluída nas fases de consolidação do manual.

Observação: o conteúdo reflete o estado identificado no repositório local. Deve ser validado contra o ambiente Supabase real antes de ser tratado como fonte definitiva.

## Documentos

1. [00-visao-geral.md](00-visao-geral.md)
   - Visão geral do objetivo do sistema, contexto de auditoria, módulos principais, fluxo macro e limitações atuais.

2. [01-manual-usuario-auditor.md](01-manual-usuario-auditor.md)
   - Manual operacional consolidado para auditores internos: acesso, dashboard, clientes, auditores, trabalhos, equipe, planejamento, materialidade, bases, matriz de riscos, balancetes, PTA, solicitações, portal do cliente, procedimentos auxiliares, faturas em aberto, boas práticas, limitações, erros comuns e checklist.

   Capítulos principais do manual do auditor:

   - Visão geral do fluxo do auditor.
   - Trabalhos de auditoria e equipe.
   - Planejamento, materialidade e bases de materialidade.
   - Matriz de riscos.
   - Balancetes.
   - PTA / Papéis de Trabalho.
   - Solicitações documentais e portal do cliente.
   - Procedimentos auxiliares e faturas em aberto.
   - Boas práticas, limitações, erros comuns e checklist operacional.

3. [02-manual-usuario-cliente.md](02-manual-usuario-cliente.md)
   - Manual operacional para usuários do cliente: acesso ao portal, menu da Área do Cliente, solicitações documentais, pendências, itens solicitados, status, upload de PDF, complementação, acompanhamento de respostas, boas práticas, limitações, erros comuns e checklist.

   Capítulos principais do manual do cliente:

   - Visão geral da Área do Cliente.
   - Acesso, tela inicial e menus.
   - Solicitações documentais e pendências.
   - Itens solicitados e status.
   - Envio, reenvio e complementação de documentos.
   - Boas práticas, restrições de acesso, erros comuns e checklist.

4. [03-manual-administrador.md](03-manual-administrador.md)
   - Manual operacional e técnico leve para administração do sistema: papéis administrativos, usuários internos, auditores, perfis, clientes, usuários do cliente, trabalhos, equipe, exercícios, planejamento, materialidade, riscos, MCSE, regras, solicitações, portal do cliente, procedimentos, Supabase externo, SQLs manuais, storage, RLS, manutenção, erros comuns e checklist.

   Capítulos principais do manual do administrador:

   - Administrador funcional versus administrador técnico.
   - Gestão de usuários internos, auditores, clientes e usuários do cliente.
   - Trabalhos, equipe, exercícios, planejamento, materialidade e riscos.
   - MCSE, plano de contas, regras, solicitações e portal do cliente.
   - Supabase externo, SQLs manuais, storage, segurança e RLS.
   - Rotinas de manutenção, erros comuns, checklist e backlog administrativo.

5. [04-manual-tecnico.md](04-manual-tecnico.md)
   - Manual técnico consolidado: arquitetura React/Vite/Supabase, stack, estrutura de pastas, roteamento, perfis, clients Supabase, padrões de dados, módulos técnicos, storage, RLS, SQLs manuais, migrations, drift de schema, `types.ts`, uso de `as any`, limitações e backlog técnico.

6. [05-dicionario-dados.md](05-dicionario-dados.md)
   - Dicionário de dados inicial por grupos: base cadastral, usuários, trabalhos, planejamento/materialidade/riscos, MCSE/regras, balancetes/PTA, solicitações, portal, procedimentos, faturas em aberto, contratos/produtos, storage, relacionamentos e RLS.

7. [06-matriz-permissoes-rls.md](06-matriz-permissoes-rls.md)
   - Mapeamento inicial de perfis, funções RLS, bloqueios no frontend e riscos de autorização.

8. [07-fluxos-status.md](07-fluxos-status.md)
   - Fluxos e status conhecidos para trabalho, planejamento, materialidade, PTA, solicitações, documentos, procedimentos e riscos.

9. [08-roteiro-testes.md](08-roteiro-testes.md)
   - Roteiro inicial de testes funcionais por módulo, com foco adicional em planejamento, materialidade, matriz de riscos, PTA e Portal do Cliente.

10. [09-runbook-implantacao.md](09-runbook-implantacao.md)
    - Runbook inicial para alteracoes, validacoes, SQL manual, GitHub, Lovable e Codex Desktop/local.

11. [10-backlog-e-dividas-tecnicas.md](10-backlog-e-dividas-tecnicas.md)
    - Backlog inicial e dívidas técnicas identificadas na Fase D.1.

## Observacoes de uso

- Esta é uma base em evolução, não um manual final validado em produção.
- Quando o texto indicar "Observação: inferido a partir do código.", a informação ainda precisa de confirmação funcional.
- Quando o texto indicar "Ainda não implementado.", a funcionalidade foi citada no código, no fluxo ou no backlog, mas não foi encontrada como recurso pronto.
- Os arquivos em `docs/sql/` não foram substituídos por esta documentação.
