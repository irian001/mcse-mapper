# Bloco A — Navegação e Permissões / Procedimentos Específicos — ODI

Detalhamento dos casos de teste do Bloco A do plano PE-ODI.0. Execução manual sobre o estado atual (placeholder de execução). Nenhum código será alterado.

## Pré-requisitos de ambiente

- Usuários de teste já provisionados, um por perfil:
  - `admin@teste` — auditor com `perfil_acesso = admin`
  - `socio@teste` — `socio`
  - `gerente@teste` — `gerente`
  - `senior@teste` — `senior`
  - `assistente@teste` — `assistente`
  - `cliente@teste` — `cliente_usuario` ativo vinculado a um cliente
  - `sem_vinculo@teste` — usuário Auth sem registro em `auditores` nem em `cliente_usuarios`
- Pelo menos 2 clientes com 1 trabalho cada (T1 do Cliente A, T2 do Cliente B).
- T1 com equipe definida (`trabalho_auditores`) incluindo `senior@teste` e `assistente@teste`. T2 sem nenhum dos dois.
- Sócio (`socio@teste`) vinculado em pelo menos 1 trabalho do Cliente A, para validar regra do `get_accessible_trabalho_ids` (sócio vê todos os trabalhos do cliente onde participa).
- Pelo menos 3 procedimentos `tipo_procedimento = ordens_imobilizacao` criados: um em T1, um em T2 e um em um trabalho T3 ao qual nenhum dos perfis de teste tem acesso direto.

## Convenções

- "Resultado esperado" descreve o comportamento aceito pelo teste.
- "Critério de aceite" é a condição objetiva binária (passa/falha).
- Evidência: print da tela + rota + identificação do usuário no rodapé.

---

## A1 — Acesso ao hub Procedimentos por perfil

Objetivo: confirmar que cada perfil interno consegue abrir o hub e que externos/sem vínculo são bloqueados.

| # | Usuário | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|---|
| A1.1 | admin | Navegar para `/procedimentos` (hub) | Hub renderiza 7 cards, inclusive "Ordens de Imobilização" | Card "Ordens de Imobilização" visível e clicável |
| A1.2 | socio | Mesmo passo | Igual A1.1 | Igual A1.1 |
| A1.3 | gerente | Mesmo passo | Igual A1.1 | Igual A1.1 |
| A1.4 | senior | Mesmo passo | Igual A1.1 | Igual A1.1 |
| A1.5 | assistente | Mesmo passo | Igual A1.1 | Igual A1.1 |
| A1.6 | cliente_usuario | Mesmo passo | Roteamento redireciona para área do cliente ou exibe "sem acesso"; rota interna não é exposta | Usuário não consegue ver o hub interno |
| A1.7 | sem_vinculo | Mesmo passo | Mensagem/estado de "sem vínculo"; nada do menu interno carregado | Hub não renderiza |

## A2 — Bloqueio do cliente_usuario na rota interna

Objetivo: garantir isolamento entre área interna (auditor) e portal externo (cliente).

| # | Cenário | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|---|
| A2.1 | Acesso direto via URL | cliente_usuario abre `/procedimentos-auxiliares?tipo=ordens_imobilizacao` colando no navegador | ProfileRouter/ClienteLayout intercepta e impede renderização da página interna | Não exibe lista de procedimentos; redireciona para `/cliente/...` ou bloqueia |
| A2.2 | Acesso direto ao detalhe | cliente_usuario abre `/procedimentos-auxiliares?detalhe=<id>` (se aplicável) | Mesmo bloqueio | Sem render da página interna |
| A2.3 | Tentativa via API | cliente_usuario, com token, executa `select` em `procedimentos_auxiliares` no console do navegador | RLS retorna lista vazia (não erro) | `data` vazio para procedimentos do trabalho ao qual o cliente não pertence |
| A2.4 | Sidebar | cliente_usuario logado | Sidebar não exibe item "Procedimentos" | Item ausente do menu |

## A3 — Listagem traz apenas procedimentos de trabalhos acessíveis (RLS)

Objetivo: validar `get_accessible_trabalho_ids` aplicado a `procedimentos_auxiliares`.

Preparação: existem ODIs em T1 (acessível ao senior e assistente), T2 (não acessível) e T3 (não acessível a nenhum perfil de teste salvo admin).

| # | Usuário | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|---|
| A3.1 | admin | Abrir `/procedimentos-auxiliares?tipo=ordens_imobilizacao` | Lista mostra ODIs de T1, T2 e T3 | Os 3 procedimentos visíveis |
| A3.2 | socio (vinculado ao Cliente A) | Mesmo passo | Mostra ODIs de T1 e de quaisquer outros trabalhos do Cliente A; **não** mostra T2 nem T3 | T2 e T3 ausentes; T1 presente |
| A3.3 | gerente sem vínculo em T1/T2/T3 | Mesmo passo | Lista vazia ou apenas trabalhos onde estiver alocado | T1, T2 e T3 ausentes se não alocado |
| A3.4 | senior alocado em T1 | Mesmo passo | Mostra ODI de T1; oculta T2 e T3 | T1 presente; T2 e T3 ausentes |
| A3.5 | assistente alocado em T1 | Mesmo passo | Igual A3.4 | Igual A3.4 |
| A3.6 | senior removido de T1 (ativo=false em `trabalho_auditores`) | Recarregar página | ODI de T1 desaparece imediatamente | T1 ausente após remoção |
| A3.7 | Conferência de contagem | Comparar contagem na UI com `count` em `procedimentos_auxiliares` filtrado por `get_accessible_trabalho_ids()` para o usuário | Números iguais | Diferença = 0 |

## A4 — Sincronização do filtro `?tipo=ordens_imobilizacao`

Objetivo: validar `useEffect`/`handleTipoChange` em `ProcedimentosAuxiliaresPage.tsx`.

| # | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|
| A4.1 | Entrar via card "Ordens de Imobilização" do hub | URL fica `?tipo=ordens_imobilizacao` e seletor "Tipo" exibe "Ordens de Imobilização" | URL + seletor consistentes |
| A4.2 | Trocar manualmente o seletor para "Todos" | URL perde o parâmetro `tipo`; lista expande para todos os tipos | URL = `/procedimentos-auxiliares`; lista contém tipos diversos |
| A4.3 | Trocar para "Contagem de Caixa" | URL passa a `?tipo=contagem_caixa`; lista filtra | URL + lista coerentes |
| A4.4 | Voltar para "Ordens de Imobilização" | URL retorna a `?tipo=ordens_imobilizacao` | URL + lista coerentes |
| A4.5 | Editar URL manualmente para `?tipo=ordens_imobilizacao` | Seletor reflete o valor sem reload completo | Seletor sincronizado |
| A4.6 | Botão de limpar filtro (`clearTipoFilter`) | Remove `tipo` da URL e mostra todos | URL sem `tipo`; lista expande |
| A4.7 | Botão Voltar do navegador após troca | Estado anterior do filtro é restaurado | Histórico do navegador respeitado |

## A5 — Acesso ao detalhe do ODI por perfil

Objetivo: validar que abrir um ODI específico respeita RLS e perfil.

| # | Usuário | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|---|
| A5.1 | admin | Abrir detalhe de ODI de T3 | Dialog abre com 4 abas; edição permitida | Abas Dados/Execução/Evidências/Conclusão renderizam |
| A5.2 | senior alocado em T1 | Abrir detalhe de ODI de T1 | Dialog abre | Idem A5.1 |
| A5.3 | senior alocado em T1 | Tentar abrir detalhe de ODI de T2 colando ID | RLS retorna null/empty; UI mostra "não encontrado" ou volta à lista | Dialog não renderiza dados |
| A5.4 | assistente em T1 | Abrir detalhe em T1 | Abre; campos sensíveis (ex.: exclusão) ocultos | Botão "Excluir" não visível |
| A5.5 | gerente sem vínculo | Tentar acessar ODI de T1 | RLS bloqueia | Sem dados |

## A6 — Visibilidade de ações por perfil dentro do módulo ODI

Objetivo: validar `canDelete = isInternal && isAdmin` e botões de criar/editar.

| # | Usuário | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|---|
| A6.1 | admin | Listagem ODI | Botões "Novo", "Editar", "Excluir" visíveis | Todos presentes |
| A6.2 | socio | Listagem ODI | "Novo" e "Editar" visíveis; "Excluir" oculto | "Excluir" ausente |
| A6.3 | gerente | Igual A6.2 | Igual A6.2 | Igual A6.2 |
| A6.4 | senior | Igual A6.2 | Igual A6.2 | Igual A6.2 |
| A6.5 | assistente | Igual A6.2 | Igual A6.2 | Igual A6.2 |
| A6.6 | cliente_usuario | Não aplicável (bloqueado em A2) | Sem acesso | N/A |
| A6.7 | Tentativa direta de DELETE via API por não-admin | RLS rejeita | Erro de permissão / 0 linhas afetadas | Linha permanece no banco |

## A7 — Identificação do usuário e rodapé

Objetivo: confirmar regra de "rodapé exibe nome e perfil logado".

| # | Usuário | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|---|
| A7.1 | admin | Abrir hub Procedimentos | Rodapé exibe nome + "admin" | Texto correto |
| A7.2 | senior | Idem | Rodapé exibe nome + "senior" | Texto correto |
| A7.3 | cliente_usuario | Portal cliente | Rodapé exibe nome + identificação de cliente | Texto correto |

## A8 — Regressão de navegação

| # | Ação | Resultado esperado | Critério de aceite |
|---|---|---|---|
| A8.1 | Navegar Hub → ODI → Detalhe → Voltar → outro Hub | Sem erros no console; sem `flash` de dados de outro usuário | Console limpo; estado coerente |
| A8.2 | Refresh em `/procedimentos-auxiliares?tipo=ordens_imobilizacao` | Sessão preservada; lista recarrega com mesmo filtro | Filtro e dados consistentes |
| A8.3 | Logout no meio do fluxo | Redireciona para `/auth`; ao logar com outro perfil, lista respeita o novo escopo | Sem leak de dados do perfil anterior |

## Checklist de evidências por caso

Para cada caso registrar:
1. Usuário logado (nome + perfil).
2. URL completa.
3. Screenshot da tela.
4. Resultado observado.
5. Aprovado / Reprovado / Bloqueado.
6. Observações (latência, console, erros 401/403).

## Saídas esperadas do Bloco A

- Matriz preenchida (A1.1 … A8.3) com status e evidências.
- Lista de divergências entre comportamento observado e esperado.
- Lista de eventuais ajustes mínimos para o Bloco PE-ODI.1 (apenas registro — nada implementado nesta fase).

## Próximo passo após Bloco A

Seguir para Bloco B — Seleção do trabalho, somente após fechar todas as divergências críticas de A2, A3, A5 e A6 (impacto direto em segurança/RLS).

## Confirmação

Plano somente de execução de testes manuais. Nenhum código, banco, SQL, migration, `types.ts` ou tela será alterado.
