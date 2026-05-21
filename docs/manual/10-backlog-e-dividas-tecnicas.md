# Backlog e Dívidas Técnicas

Este documento consolida as pendências identificadas na Fase D.1 — Inventário técnico-funcional do sistema.

O objetivo é registrar riscos técnicos, funcionais e documentais que precisam ser tratados para aumentar a confiabilidade, rastreabilidade e manutenibilidade do sistema.

## Critérios de prioridade

| Prioridade | Descrição |
|---|---|
| P0 | Crítico ou bloqueante para segurança, dados ou continuidade da evolução |
| P1 | Alto impacto técnico ou funcional |
| P2 | Importante, mas não bloqueante |
| P3 | Melhoria, organização ou refinamento |

---

## 1. Documentação

| Prioridade | Pendência | Risco / impacto | Ação recomendada |
|---|---|---|---|
| P1 | `README.md` desatualizado | O repositório descreve contexto antigo de dashboard de permissionária/conselho, não o sistema atual de auditoria | Atualizar README com visão atual do produto, stack, módulos e fluxo de implantação |
| P2 | `docs/sistema` ausente no repositório atual | Documentos citados em fases anteriores não estão presentes ou não foram sincronizados | Confirmar se a documentação antiga deve ser migrada, consolidada ou descartada |
| P1 | Manual de usuário ainda inicial | Usuários não possuem referência operacional confiável | Evoluir `docs/manual/01-manual-usuario-auditor.md` e `02-manual-usuario-cliente.md` |
| P1 | Manual técnico ainda inicial | Dificulta manutenção e entrada de novos desenvolvedores/agentes | Evoluir `04-manual-tecnico.md` com arquitetura, módulos, padrões e pontos críticos |
| P0 | Dicionário de dados precisa ser validado contra Supabase real | Risco de documentação divergir do banco efetivamente usado | Gerar dicionário a partir do schema real do Supabase |
| P1 | Matriz de permissões precisa de testes reais de RLS | Risco de permissões documentadas divergirem das políticas reais | Testar RLS por perfil e por módulo |
| P2 | Roteiros de teste ainda precisam ser detalhados por módulo | Validação manual fica inconsistente | Criar roteiros por fluxo crítico: login, trabalhos, planejamento, riscos, PTA, solicitações e portal |

---

## 2. Schema e banco de dados

| Prioridade | Pendência | Risco / impacto | Ação recomendada |
|---|---|---|---|
| P0 | `types.ts` desatualizado | Queries recentes usam tabelas/campos não reconhecidos pela tipagem oficial | Regenerar types do Supabase em fase controlada |
| P1 | Uso frequente de `as any` | Perda de segurança de tipo e maior risco de erro silencioso | Reduzir `as any` por módulo após regenerar types |
| P0 | Drift entre código, migrations, `docs/sql` e Supabase real | Risco de ambiente novo não conseguir reproduzir o sistema | Fazer reconciliação entre Supabase real, SQLs manuais e migrations |
| P1 | SQLs manuais em `docs/sql` não convertidos formalmente em migrations | Baixa rastreabilidade de implantação | Definir política: quando manter SQL manual e quando converter para migration |
| P1 | Tabelas referenciadas sem `CREATE TABLE` localizado no repositório atual | Risco de dependência de schema não versionado | Validar existência no Supabase e documentar origem |

### Tabelas que exigem validação de origem

- `contratos`
- `contrato_produtos`
- `procedimentos_auxiliares`
- `procedimento_auxiliar_documentos`
- `procedimento_contagem_caixa_itens`
- `procedimento_contagem_caixa_detalhes`

### Ações necessárias

1. Confirmar se existem no Supabase externo.
2. Confirmar se possuem RLS.
3. Confirmar se fazem parte do escopo final.
4. Criar documentação ou SQL/migration correspondente, se necessário.

---

## 3. Segurança, permissões e RLS

| Prioridade | Pendência | Risco / impacto | Ação recomendada |
|---|---|---|---|
| P0 | Parte das alçadas de planejamento/materialidade parece implementada no frontend | Usuário poderia contornar UI se RLS/RPC não bloquear | Validar enforcement server-side |
| P0 | Necessário confirmar se o banco bloqueia as mesmas operações do frontend | Divergência entre regra visual e regra real | Criar matriz de testes por perfil |
| P0 | Testar acesso cruzado entre clientes | Risco de vazamento de dados entre clientes | Testar `cliente_usuario` em múltiplos cenários |
| P0 | Testar acesso de auditor sem vínculo ao trabalho | Risco de auditor acessar trabalho indevido | Validar `get_accessible_trabalho_ids()` |
| P1 | Revisar storage policies para documentos | Risco de acesso indevido a anexos/evidências | Inventariar buckets e policies |

---

## 4. Módulos e funcionalidades

| Prioridade | Pendência | Risco / impacto | Ação recomendada |
|---|---|---|---|
| P1 | Riscos sem vínculo formal com PTA, procedimentos, solicitações, evidências ou bases de materialidade | Matriz de riscos ainda não fecha o ciclo risco → resposta → evidência → conclusão | Implementar fases 0B de vínculos |
| P1 | Workflow de revisão, eventos, notas e gates ainda não implementado | QA ainda depende de controles manuais | Planejar implantação incremental de review_events, review_notes e gates |
| P2 | Ordens de compra aparecem no hub, mas execução específica ainda não implementada | Risco de expectativa funcional incorreta | Implementar ou remover placeholder |
| P2 | Ordens de imobilização aparecem no hub, mas execução específica ainda não implementada | Risco de expectativa funcional incorreta | Implementar ou remover placeholder |
| P2 | Relatórios persistidos centralizados ainda não implementados | Relatórios podem ficar dispersos | Planejar módulo de relatórios/exportações |
| P2 | Automações de notificação/prazo não identificadas | Controle de prazos depende de acompanhamento manual | Mapear necessidade futura de notificações |

---

## 5. Qualidade técnica

| Prioridade | Pendência | Risco / impacto | Ação recomendada |
|---|---|---|---|
| P1 | Client Supabase duplicado | Risco de inconsistência de autenticação, URL, headers e policies | Consolidar uso de client oficial |
| P2 | Encoding quebrado em textos do repositório | Prejudica leitura e aparência profissional | Corrigir acentuação e encoding dos documentos |
| P2 | Comentários e textos podem divergir do comportamento atual | Risco de documentação enganosa dentro do código | Revisar comentários de módulos críticos |
| P1 | Falta padrão único para SQL manual versus migration | Dificulta reprodução de ambiente | Criar política de banco e implantação |
| P1 | Falta padrão de testes automatizados por fluxo crítico | Regressões podem passar despercebidas | Definir testes mínimos por módulo |

### Observação sobre Supabase client

Foram identificadas referências a dois padrões de client Supabase:

- `src/lib/supabase-client.ts`
- `src/integrations/supabase/client.ts`

A consolidação deve ser feita com cautela, pois pode afetar autenticação, policies, storage e chamadas existentes.

---

## 6. Backlog priorizado

### P0 — Crítico

1. Validar schema real do Supabase.
2. Confirmar quais SQLs de `docs/sql` já foram aplicados.
3. Validar RLS real por perfil.
4. Testar acesso cruzado entre clientes.
5. Testar acesso de auditor sem vínculo ao trabalho.
6. Confirmar tabelas usadas sem `CREATE TABLE` local.
7. Validar alçadas de planejamento/materialidade no banco.

### P1 — Alto impacto

8. Gerar dicionário de dados a partir do schema real.
9. Regenerar `types.ts`.
10. Reduzir `as any` por módulo.
11. Consolidar client Supabase.
12. Definir política SQL manual versus migrations.
13. Revisar storage policies.
14. Integrar riscos com PTA/procedimentos/solicitações/evidências.

### P2 — Médio impacto

15. Atualizar README.
16. Corrigir encoding.
17. Detalhar roteiros de teste por módulo.
18. Formalizar matriz de permissões.
19. Criar manual operacional por perfil.
20. Definir padrão de relatórios/exportações.

### P3 — Melhorias e limpeza

21. Revisar placeholders de ordens de compra.
22. Revisar placeholders de ordens de imobilização.
23. Padronizar comentários técnicos.
24. Melhorar textos de ajuda e mensagens de UI.
25. Avaliar testes automatizados progressivos.

---

## 7. Validações humanas necessárias

Antes de avançar para fases com maior integração entre riscos, PTA, solicitações e evidências, é necessário validar:

- Quais SQLs de `docs/sql` já foram aplicados no Supabase externo.
- Quais tabelas existem no Supabase, mas não possuem SQL/migration local.
- Se RLS real corresponde ao comportamento esperado no frontend.
- Se contratos fazem parte do escopo final do produto.
- Se procedimentos auxiliares fazem parte do escopo final do produto.
- Se ordens de compra e ordens de imobilização devem ser implementadas ou removidas.
- Nomenclatura oficial dos módulos para o manual final.
- Política oficial para alterações de schema: migration, SQL manual ou ambos.
- Política de alçada: frontend apenas, RLS, RPC ou triggers.

---

## 8. Recomendações de curto prazo

Antes de iniciar a próxima fase funcional, recomenda-se:

1. Rodar validação do schema real do Supabase.
2. Atualizar o dicionário de dados com base no schema real.
3. Confirmar RLS das tabelas críticas.
4. Atualizar README.
5. Definir política de SQL manual versus migrations.
6. Criar roteiro mínimo de testes por perfil.
7. Validar a matriz de riscos recém-implementada.
8. Registrar formalmente o escopo da próxima fase 0B.

---

## 9. Status do documento

| Campo | Informação |
|---|---|
| Origem | Fase D.1 — Inventário técnico-funcional |
| Finalidade | Controle de backlog técnico, funcional e documental |
| Status | Inicial |
| Requer validação humana | Sim |
| Deve ser revisado após validação do Supabase real | Sim |
