# AudiFlow Onda 0 — Contenção de Segurança Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conter o acesso cruzado confirmado, remover as RPCs de elevação/vazamento, restringir os dois buckets e comprovar por testes negativos que identidades não autorizadas recebem zero acesso.

**Architecture:** A autorização passa a ser `default deny`, baseada em helpers privados e no pai autoritativo do recurso. A correção é desenvolvida e testada em banco local/cópia isolada, aplicada primeiro em staging e somente depois no projeto ativo mediante checkpoint explícito.

**Tech Stack:** PostgreSQL 17, Supabase CLI 2.109.1, pgTAP, Supabase Auth/RLS/Storage, React 18, TypeScript 5.8, Vitest 3.

## Global Constraints

- Não executar SQL mutável no projeto ativo antes de backup, staging verde e aprovação go/no-go.
- Não aplicar as 48 migrations locais antigas com `db push --include-all`; o histórico remoto está vazio e o schema diverge.
- Não inativar usuários-cliente como contenção antes da normalização de RLS; helpers antigos podem interpretar cliente inativo como usuário interno.
- Não registrar senhas, tokens, e-mails, URLs assinadas ou conteúdo de documentos no Git.
- Usar apenas a chave publicável/`anon` no frontend; nunca `service_role` ou secret key.
- Criar migration sempre com `npm exec -- supabase migration new <name>`; usar o caminho impresso pelo CLI.
- Toda policy de `UPDATE` deve possuir `USING` e `WITH CHECK`.
- Toda função `SECURITY DEFINER` deve ficar em schema não exposto, usar `SET search_path = ''` e grants mínimos.
- Regra temporária da contenção: admin ativo acessa administração; auditor ativo acessa apenas trabalhos com equipe ativa; cliente ativo acessa apenas seu cliente.
- Referência confirmada do projeto ativo usado pela aplicação: `zqoywwtdsbtqtytvyzwl`. O `project_id` de `supabase/config.toml` não prova vínculo remoto.

---

## Mapa de arquivos

- Create: `docs/security/2026-07-13-p0-incident-log.md` — registro operacional, backups, decisões e evidências.
- Create: `supabase/tests/database/000_security_test_helpers.sql` — fixtures e autenticação pgTAP.
- Create: `supabase/tests/database/010_identity_access.test.sql` — matriz de identidades e clientes.
- Create: `supabase/tests/database/020_privileged_functions.test.sql` — grants e RPCs.
- Create: `supabase/tests/database/030_storage_scope.test.sql` — predicados dos buckets.
- Create via CLI: o caminho impresso por `supabase migration new p0_authorization_containment` — helpers, grants e policies.
- Modify: `src/components/cliente/ClienteItemDocumentos.tsx` — usar RPC estreita e tratar erro de status.
- Modify: `src/integrations/supabase/types.ts` — incluir RPC segura após geração local.
- Modify: `docs/manual/06-matriz-permissoes-rls.md` — matriz realmente aplicada.
- Modify: `docs/manual/09-runbook-implantacao.md` — deploy, verificação e rollback P0.
- Modify: `docs/manual/11-inventario-p0-supabase.md` — evidência pós-correção.

## Ordem operacional conjunta

1. Executar imediatamente Tasks 1 e 2 deste plano.
2. Executar Tasks 1–3 do plano da Onda 1 para disponibilizar npm/Supabase CLI/Docker/local DB.
3. Retornar às Tasks 3–8 deste plano.
4. Concluir Tasks 4–8 da Onda 1.

### Task 1: Abrir incidente, congelar exposição e registrar backup

**Files:**
- Create: `docs/security/2026-07-13-p0-incident-log.md`
- Reference: `docs/superpowers/specs/2026-07-13-audiflow-recuperacao-finalizacao-design.md`

**Interfaces:**
- Consumes: achados P0 confirmados na SDD.
- Produces: evidência de backup, janela de mudança e decisão go/no-go.

- [ ] **Step 1: Criar o registro do incidente**

Usar este conteúdo inicial, sem inserir PII:

```markdown
# Incidente P0 — isolamento AudiFlow

- Detectado em: 2026-07-13
- Projeto ativo: zqoywwtdsbtqtytvyzwl
- Classificação: P0 — confidencialidade e elevação de perfil
- Estado: aberto
- Mudanças funcionais: congeladas
- Portal do cliente: acesso externo suspenso na camada de aplicação
- Novos cadastros públicos: desabilitados
- Backup pré-correção: não confirmado
- Staging isolado: não confirmado
- Go/no-go produção: NO-GO

## Evidências sem PII

- sessão de cliente alcançou registros de outros clientes;
- RPC antiga permitia vínculo com auditor livre;
- RPC de listagem de usuários estava executável por anon;
- policies de documentos e Storage não isolavam cliente/trabalho.

## Registro de mudanças

| Data UTC | Ação | Ambiente | Resultado | Evidência |
|---|---|---|---|---|
```

- [ ] **Step 2: Suspender entrada externa sem inativar registros de cliente**

No Dashboard do Supabase, desabilitar novos sign-ups em Authentication e registrar a alteração. Na camada de hospedagem, retirar temporariamente as rotas `/cliente/solicitacoes` e `/cliente/pendencias` da publicação externa. Não alterar `cliente_usuarios.ativo` antes da nova RLS.

Expected: novos usuários não conseguem se cadastrar; usuários-clientes não recebem uma nova versão externa do portal.

- [ ] **Step 3: Criar backup gerenciado e registrar o identificador**

Criar backup/snapshot pelo mecanismo disponível no plano Supabase antes de qualquer DDL. Registrar horário UTC, tipo e identificador no incidente; não copiar dados para o repositório.

Expected: campo `Backup pré-correção` passa para `confirmado` com evidência privada.

- [ ] **Step 4: Confirmar o projeto antes de vincular CLI**

Run:

```powershell
npm exec -- supabase projects list
npm exec -- supabase link --project-ref zqoywwtdsbtqtytvyzwl
npm exec -- supabase migration list --linked
```

Expected: nome `AudiFlow`, ref `zqoywwtdsbtqtytvyzwl` e coluna REMOTE vazia. Se a ref divergir, parar sem executar `db push`.

- [ ] **Step 5: Commit do registro sem segredos**

```powershell
git add docs/security/2026-07-13-p0-incident-log.md
git commit -m "docs: open P0 authorization incident"
```

### Task 2: Capturar baseline estrutural somente leitura

**Files:**
- Create: `artifacts/security/2026-07-13/.gitkeep`
- Modify: `.gitignore`
- Reference: `docs/sql/p0-diagnostico-supabase.sql`

**Interfaces:**
- Consumes: projeto vinculado e backup confirmado.
- Produces: dumps locais não versionados e inventário sanitizado.

- [ ] **Step 1: Ignorar artefatos potencialmente sensíveis**

Adicionar a `.gitignore` e criar o arquivo vazio `artifacts/security/2026-07-13/.gitkeep` com `apply_patch`:

```gitignore
# Security incident evidence — local/private
artifacts/security/**
!artifacts/security/**/.gitkeep
```

- [ ] **Step 2: Descobrir a sintaxe instalada antes do dump**

Run:

```powershell
npm exec -- supabase db dump --help
npm exec -- supabase db lint --help
```

Expected: ambos retornam exit 0 e exibem `--linked`.

- [ ] **Step 3: Exportar schema sem dados**

Run:

```powershell
New-Item -ItemType Directory -Path artifacts\security\2026-07-13 -Force
npm exec -- supabase db dump --linked --schema public,storage -f artifacts/security/2026-07-13/remote-schema.sql
npm exec -- supabase db lint --linked --fail-on error
```

Expected: arquivo SQL criado, nenhum `COPY public.` ou `INSERT INTO auth.users`, e lint sem erro estrutural. Não commitar o dump.

- [ ] **Step 4: Executar o diagnóstico somente leitura**

Executar `docs/sql/p0-diagnostico-supabase.sql` pelo canal de administração somente leitura e salvar a saída privada em `artifacts/security/2026-07-13/p0-diagnostico.txt`.

Expected: inventário contém tabelas, policies, funções, ACLs e buckets, sem linhas de negócio.

- [ ] **Step 5: Commit apenas do ignore e marcador**

```powershell
git add .gitignore artifacts/security/2026-07-13/.gitkeep
git commit -m "chore: isolate private security evidence"
```

### Task 3: Escrever testes de segurança que reproduzem as falhas

**Files:**
- Create: `supabase/tests/database/000_security_test_helpers.sql`
- Create: `supabase/tests/database/010_identity_access.test.sql`
- Create: `supabase/tests/database/020_privileged_functions.test.sql`
- Create: `supabase/tests/database/030_storage_scope.test.sql`

**Interfaces:**
- Consumes: banco local reconstruído/cópia isolada e fixtures de dois clientes.
- Produces: testes pgTAP vermelhos contra o estado vulnerável e verdes após a migration.

- [ ] **Step 1: Criar helpers de claims locais**

Conteúdo essencial de `000_security_test_helpers.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

create or replace function tests.authenticate_as(target_user uuid)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', target_user, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace function tests.clear_authentication()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;
rollback;
```

- [ ] **Step 2: Criar matriz de leitura cruzada**

Em `010_identity_access.test.sql`, inserir fixtures fixas dentro de `BEGIN`, autenticar como cliente A e usar `is(..., 0::bigint, ...)` para cliente B em `clientes`, `trabalhos_auditoria`, `balancetes`, `papeis_trabalho`, `solicitacoes_documentos` e `auditores`. Repetir para autenticado sem vínculo e auditor não alocado. Encerrar com `finish()` e `ROLLBACK`.

IDs fixos:

```sql
-- cliente A auth: a0000000-0000-4000-8000-000000000001
-- cliente B auth: b0000000-0000-4000-8000-000000000001
-- auditor alocado: c0000000-0000-4000-8000-000000000001
-- auditor não alocado: d0000000-0000-4000-8000-000000000001
-- sem vínculo: e0000000-0000-4000-8000-000000000001
```

- [ ] **Step 3: Criar testes de grants privilegiados**

Em `020_privileged_functions.test.sql`, verificar:

```sql
select ok(
  not has_function_privilege('anon', 'public.get_auth_users_for_linking()', 'EXECUTE'),
  'anon não executa listagem de auth users'
);
select ok(
  to_regprocedure('public.link_auditor_account(uuid)') is null
  or not has_function_privilege('authenticated', 'public.link_auditor_account(uuid)', 'EXECUTE'),
  'overload vulnerável não é executável'
);
```

- [ ] **Step 4: Criar testes dos predicados de Storage**

Em `030_storage_scope.test.sql`, testar os paths:

```text
<solicitacao-a>/<item-a>/arquivo.pdf       → cliente A: true
<solicitacao-b>/<item-b>/arquivo.pdf       → cliente A: false
<solicitacao-a>/<item-b>/arquivo.pdf       → cliente A: false
path-sem-tres-segmentos                     → false
```

- [ ] **Step 5: Executar para comprovar o vermelho**

Run: `npm run test:db`

Expected: FAIL nos casos de acesso cruzado, grants e Storage; salvar a saída privada no incidente.

- [ ] **Step 6: Commit dos testes vermelhos**

```powershell
git add supabase/tests/database
git commit -m "test: reproduce P0 authorization failures"
```

### Task 4: Criar helpers privados e remover RPCs vulneráveis

**Files:**
- Create via CLI: o caminho impresso por `supabase migration new p0_authorization_containment`
- Test: `supabase/tests/database/020_privileged_functions.test.sql`

**Interfaces:**
- Produces: `private.is_active_internal_auditor()`, `private.is_active_admin()`, `private.current_client_id()`, `private.can_access_client(uuid)` e `private.can_access_work(uuid)`.

- [ ] **Step 1: Criar a migration pelo CLI**

Run: `npm exec -- supabase migration new p0_authorization_containment`

Expected: CLI imprime um único caminho de migration. Guardar o caminho retornado como `$P0_MIGRATION` na sessão de execução.

- [ ] **Step 2: Implementar identidade sem ambiguidade**

Adicionar à migration funções `STABLE SECURITY DEFINER SET search_path = ''` que consultem `public.auditores`, `public.cliente_usuarios` e `public.trabalho_auditores`. Cada função deve retornar falso/nulo quando a mesma `auth.uid()` possuir dois papéis ou quando o registro estiver inativo.

Assinaturas exatas:

```sql
private.is_active_internal_auditor() returns boolean
private.is_active_admin() returns boolean
private.current_client_id() returns uuid
private.can_access_client(target_client uuid) returns boolean
private.can_access_work(target_work uuid) returns boolean
```

- [ ] **Step 3: Fixar grants mínimos**

```sql
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_active_internal_auditor() to authenticated;
grant execute on function private.is_active_admin() to authenticated;
grant execute on function private.current_client_id() to authenticated;
grant execute on function private.can_access_client(uuid) to authenticated;
grant execute on function private.can_access_work(uuid) to authenticated;

revoke all on function public.get_auth_users_for_linking() from public, anon, authenticated;
revoke all on function public.link_auditor_account(uuid) from public, anon, authenticated;
drop function if exists public.link_auditor_account(uuid);
```

- [ ] **Step 4: Aplicar apenas no banco local**

Run:

```powershell
npm exec -- supabase db reset
npm exec -- supabase test db supabase/tests/database/020_privileged_functions.test.sql
```

Expected: reset passa; testes de grants passam; testes de RLS ainda falham.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations supabase/tests/database/020_privileged_functions.test.sql
git commit -m "fix: revoke vulnerable authorization RPCs"
```

### Task 5: Normalizar RLS sem shadow policies

**Files:**
- Modify: migration criada na Task 4
- Test: `supabase/tests/database/010_identity_access.test.sql`

**Interfaces:**
- Consumes: helpers privados da Task 4.
- Produces: uma policy por operação e escopo explícito.

- [ ] **Step 1: Remover todas as policies existentes dos alvos P0**

Adicionar um bloco `DO` que percorre `pg_policies` e executa `DROP POLICY` para:

```text
auditores, clientes, cliente_usuarios, exercicios,
trabalhos_auditoria, trabalho_auditores,
balancetes, balancete_linhas, balancete_linha_documentos,
papeis_trabalho, papel_trabalho_linhas,
solicitacoes_documentos, solicitacao_itens, solicitacao_item_documentos,
trabalho_planejamento, trabalho_materialidade, trabalho_materialidade_bases,
trabalho_riscos_auditoria, trabalho_planejamento_modalidades,
procedimentos_auxiliares, procedimento_auxiliar_documentos,
procedimento_contagem_caixa_itens, procedimento_contagem_caixa_detalhes,
procedimento_contagem_estoque_blocos, procedimento_contagem_estoque_itens,
procedimento_faturas_aberto_lotes, procedimento_faturas_aberto_itens
```

O bloco deve falhar se uma tabela esperada não existir; não usar `WHEN undefined_table THEN NULL`.

- [ ] **Step 2: Criar policies por pai autoritativo**

Mapa obrigatório:

| Recurso | Predicado de leitura |
|---|---|
| `clientes` | `private.can_access_client(id)` |
| `exercicios` | `private.can_access_client(cliente_id)` |
| `trabalhos_auditoria` | `private.can_access_work(id)` |
| tabelas com `trabalho_auditoria_id` | `private.can_access_work(trabalho_auditoria_id)` |
| `balancete_linha_documentos` | `EXISTS` via `balancete_linhas` e trabalho |
| `papel_trabalho_linhas` | `EXISTS` via `papeis_trabalho` e trabalho |
| `solicitacao_itens` | `EXISTS` via `solicitacoes_documentos` e trabalho |
| `solicitacao_item_documentos` | `EXISTS` via item → solicitação → trabalho |
| `auditores` | `private.is_active_internal_auditor()` |
| `cliente_usuarios` | admin ativo ou o próprio `auth_user_id` |

Escrita administrativa exige `private.is_active_admin()`. Escrita de auditor exige `private.can_access_work(...)` e vínculo interno ativo. Cliente não recebe `UPDATE` direto de `solicitacao_itens` nem campos de análise em documentos.

- [ ] **Step 3: Incluir `USING` e `WITH CHECK` em toda escrita**

Exemplo obrigatório:

```sql
create policy trabalho_update_scoped
on public.trabalhos_auditoria for update to authenticated
using (private.can_access_work(id) and private.is_active_internal_auditor())
with check (private.can_access_work(id) and private.is_active_internal_auditor());
```

- [ ] **Step 4: Executar reset e matriz completa**

Run: `npm exec -- supabase db reset` e depois `npm run test:db`.

Expected: todos os testes de identidade passam; nenhum usuário sem vínculo vê linhas; auditor não alocado vê zero trabalhos.

- [ ] **Step 5: Executar advisors/lint local**

Run:

```powershell
npm exec -- supabase db lint --local --fail-on error
npm exec -- supabase inspect db table-sizes
```

Expected: lint exit 0; nenhuma policy sempre verdadeira nos alvos P0.

- [ ] **Step 6: Commit**

```powershell
git add supabase/migrations supabase/tests/database/010_identity_access.test.sql
git commit -m "fix: enforce work and client isolation"
```

### Task 6: Restringir Storage pelos pais reais

**Files:**
- Modify: migration criada na Task 4
- Test: `supabase/tests/database/030_storage_scope.test.sql`

**Interfaces:**
- Produces: `private.can_access_solicitacao_object(text)` e `private.can_access_balancete_object(text)`.

- [ ] **Step 1: Implementar parser estrito de path**

`solicitacao-documentos` deve aceitar exatamente `<solicitacao_uuid>/<item_uuid>/<arquivo>`, converter os dois primeiros segmentos com tratamento seguro e verificar item → solicitação → trabalho. Path inválido retorna `false`, nunca exceção visível.

- [ ] **Step 2: Remover policies antigas apenas dos dois buckets**

Remover policies de `storage.objects` cuja definição/nome pertença a `solicitacao-documentos` ou `documentos-balancete`. Não remover policies de buckets alheios.

- [ ] **Step 3: Criar policies SELECT/INSERT/UPDATE/DELETE separadas**

Para cada operação, exigir `bucket_id` correto e helper do path. Em `UPDATE`, usar o helper em `USING` e `WITH CHECK`. Cliente pode inserir/ler objeto de solicitação própria; somente auditor interno com trabalho acessível remove. Bucket de balancete é exclusivo de auditor interno com trabalho acessível.

- [ ] **Step 4: Executar testes**

Run: `npm exec -- supabase test db supabase/tests/database/030_storage_scope.test.sql`

Expected: paths próprios passam; cliente B, IDs mistos e path malformado falham.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations supabase/tests/database/030_storage_scope.test.sql
git commit -m "fix: scope audit document storage"
```

### Task 7: Substituir atualização direta do item por RPC estreita

**Files:**
- Modify: migration criada na Task 4
- Modify: `src/components/cliente/ClienteItemDocumentos.tsx`
- Modify: `src/integrations/supabase/types.ts`
- Test: `src/components/cliente/ClienteItemDocumentos.test.tsx`

**Interfaces:**
- Produces: `public.marcar_item_solicitacao_recebido(target_item_id uuid) returns void`.

- [ ] **Step 1: Escrever teste frontend falhando**

Mockar upload, insert e RPC. Verificar que sucesso exige `rpc('marcar_item_solicitacao_recebido', { target_item_id: itemId })` e que erro da RPC produz toast de erro, não sucesso.

Run: `npm test -- src/components/cliente/ClienteItemDocumentos.test.tsx`

Expected: FAIL porque o componente ainda faz `.update()` e ignora o erro.

- [ ] **Step 2: Criar RPC segura**

A função deve validar cliente ativo, item pertencente ao cliente, solicitação liberada ao portal e existência de documento recém-enviado do mesmo item. Deve atualizar somente `status_item`, usar `SECURITY DEFINER SET search_path = ''`, revogar `PUBLIC`/`anon` e conceder `EXECUTE` a `authenticated`.

- [ ] **Step 3: Trocar chamada do componente**

Remover o `.from('solicitacao_itens').update(...)`; chamar a RPC e lançar erro quando `error` existir. Não alterar `observacao_auditor`, `status_documento`, `url_arquivo` ou `uploaded_by` pelo cliente.

- [ ] **Step 4: Executar testes**

Run:

```powershell
npm test -- src/components/cliente/ClienteItemDocumentos.test.tsx
npm run test:db
```

Expected: ambos passam.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations src/components/cliente/ClienteItemDocumentos.tsx src/components/cliente/ClienteItemDocumentos.test.tsx src/integrations/supabase/types.ts
git commit -m "fix: constrain client document status transition"
```

### Task 8: Promover com staging, canário e rollback verificável

**Files:**
- Modify: `docs/security/2026-07-13-p0-incident-log.md`
- Modify: `docs/manual/06-matriz-permissoes-rls.md`
- Modify: `docs/manual/09-runbook-implantacao.md`
- Modify: `docs/manual/11-inventario-p0-supabase.md`

- [ ] **Step 1: Revisar SQL e dry-run**

Run:

```powershell
npm exec -- supabase db reset
npm run test:db
npm exec -- supabase db lint --local --fail-on error
npm exec -- supabase db push --linked --dry-run
```

Expected: local verde; dry-run lista somente a migration P0. Se listar as 48 migrations históricas, NO-GO e retornar à Onda 1 para baseline.

- [ ] **Step 2: Aplicar primeiro em staging isolado**

Vincular explicitamente ao ref de staging, executar `migration list`, `db push --dry-run`, `db push` e a matriz autenticada. Registrar ref e resultados no incidente.

Expected: cliente A vê somente A; auditor não alocado vê zero; RPCs/grants bloqueados; Storage cruzado negado.

- [ ] **Step 3: Preparar rollback sem reabrir vulnerabilidades**

Rollback permitido: restaurar snapshot pré-correção apenas se o ambiente permanecer fora de acesso externo. Não criar migration que restaure policies permissivas ou RPC vulnerável.

- [ ] **Step 4: Checkpoint go/no-go do projeto ativo**

Exigir: backup confirmado, staging verde, revisão do SQL, plano de comunicação e responsável presente. Sem os cinco itens, não executar mutação remota.

- [ ] **Step 5: Aplicar migration no ativo**

Após aprovação explícita:

```powershell
npm exec -- supabase link --project-ref zqoywwtdsbtqtytvyzwl
npm exec -- supabase migration list --linked
npm exec -- supabase db push --linked --dry-run
npm exec -- supabase db push --linked
```

Expected: somente migration P0 aplicada e registrada. Caso o histórico vazio tente reaplicar legado, abortar.

- [ ] **Step 6: Executar verificação pós-deploy**

Executar a mesma matriz com identidades reais de teste, verificar advisors e consultar ACLs. Não usar contas/dados de clientes reais como fixture.

Expected: zero acesso cruzado, zero RPC interna para anon, zero policy P0 sempre verdadeira.

- [ ] **Step 7: Atualizar documentação e commit**

Registrar comportamento real, comandos, evidências sanitizadas, risco residual e estado do incidente.

```powershell
git add docs/security docs/manual/06-matriz-permissoes-rls.md docs/manual/09-runbook-implantacao.md docs/manual/11-inventario-p0-supabase.md
git commit -m "docs: record P0 containment evidence"
```

## Gate de conclusão da Onda 0

- [ ] Backup pré-mudança confirmado.
- [ ] Projeto ativo e staging identificados sem ambiguidade.
- [ ] Todos os testes pgTAP passam.
- [ ] Cliente A e B não acessam recursos cruzados.
- [ ] Sem vínculo/inativo recebe zero linhas.
- [ ] Auditor não alocado recebe zero trabalhos.
- [ ] `anon` não executa funções internas.
- [ ] Overload vulnerável de vínculo removida/bloqueada.
- [ ] Dois buckets negam paths cruzados e malformados.
- [ ] Nenhuma migration histórica foi reaplicada cegamente.
- [ ] Incidente contém evidência sanitizada e riscos residuais.
