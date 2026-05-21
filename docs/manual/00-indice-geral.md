# Manual do Sistema - Indice Geral

Este diretorio contem a estrutura inicial da documentacao funcional, tecnica e operacional do sistema, criada a partir do inventario tecnico-funcional da Fase D.1.

Observacao: o conteudo reflete o estado identificado no repositorio local. Deve ser validado contra o ambiente Supabase real antes de ser tratado como fonte definitiva.

## Documentos

1. [00-visao-geral.md](00-visao-geral.md)
   - Visao geral do objetivo do sistema, contexto de auditoria, modulos principais, fluxo macro e limitacoes atuais.

2. [01-manual-usuario-auditor.md](01-manual-usuario-auditor.md)
   - Manual operacional inicial para auditores internos: trabalhos, planejamento, materialidade, riscos, balancetes, PTA, solicitacoes e procedimentos.

3. [02-manual-usuario-cliente.md](02-manual-usuario-cliente.md)
   - Manual inicial para usuarios do cliente: acesso ao portal, solicitacoes, pendencias, envio e reenvio de documentos.

4. [03-manual-administrador.md](03-manual-administrador.md)
   - Guia inicial para administracao do sistema: usuarios, perfis, vinculos Auth, clientes, estruturas, produtos, regras e cuidados com SQL/RLS.

5. [04-manual-tecnico.md](04-manual-tecnico.md)
   - Documentacao tecnica inicial: arquitetura React/Supabase, pastas, clients Supabase, hooks, modulos e pontos de atencao.

6. [05-dicionario-dados.md](05-dicionario-dados.md)
   - Dicionario inicial de tabelas, por grupos funcionais, com finalidade, relacoes e observacoes conhecidas.

7. [06-matriz-permissoes-rls.md](06-matriz-permissoes-rls.md)
   - Mapeamento inicial de perfis, funcoes RLS, bloqueios no frontend e riscos de autorizacao.

8. [07-fluxos-status.md](07-fluxos-status.md)
   - Fluxos e status conhecidos para trabalho, planejamento, materialidade, PTA, solicitacoes, documentos, procedimentos e riscos.

9. [08-roteiro-testes.md](08-roteiro-testes.md)
   - Roteiro inicial de testes funcionais por modulo.

10. [09-runbook-implantacao.md](09-runbook-implantacao.md)
    - Runbook inicial para alteracoes, validacoes, SQL manual, GitHub, Lovable e Codex Desktop/local.

11. [10-backlog-e-dividas-tecnicas.md](10-backlog-e-dividas-tecnicas.md)
    - Backlog inicial e dividas tecnicas identificadas na Fase D.1.

## Observacoes de uso

- Esta e uma base inicial, nao um manual final.
- Quando o texto indicar "Observacao: inferido a partir do codigo.", a informacao ainda precisa de confirmacao funcional.
- Quando o texto indicar "Ainda nao implementado.", a funcionalidade foi citada no codigo, no fluxo ou no backlog, mas nao foi encontrada como recurso pronto.
- Os arquivos em `docs/sql/` nao foram substituidos por esta documentacao.
