# AudiFlow Onda 1 — Fundação Reproduzível Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer um clone limpo instalar dependências, reconstruir o schema canônico com seed controlado, executar testes locais e bloquear regressões em CI.

**Architecture:** npm/Node e Supabase CLI ficam fixados; o estado remoto é capturado como baseline auditável sem reaplicar migrations históricas. O frontend usa um único cliente configurado por ambiente, e CI executa banco, tipos, testes, build e baseline de qualidade.

**Tech Stack:** Node.js 24.15.0, npm 11.12.1, Supabase CLI 2.109.1, Docker Desktop, PostgreSQL 17, React 18, Vite 5, TypeScript 5.8, Vitest 3, Playwright 1.57, GitHub Actions.

## Global Constraints

- Usar somente npm; remover `bun.lock` e `bun.lockb` após `package-lock.json` reproduzível.
- Fixar `packageManager: npm@11.12.1`, Node 24.15.0 e Supabase CLI 2.109.1.
- Docker é pré-requisito local; `supabase start` não deve ser exposto à rede pública.
- Não commitar `.env`, tokens, senha do banco, dump de dados ou credenciais locais.
- O schema remoto pré-P0 é fonte para o baseline estrutural; a migration P0 permanece separada e posterior.
- Não usar `db pull` antes de decidir o histórico: ele pode propor reparo remoto automaticamente.
- Não usar `db push --include-all` contra o projeto ativo.
- Mudança no histórico remoto por `migration repair` exige backup, diff zero e checkpoint explícito.
- Grants da Data API são explícitos e versionados; grants não substituem RLS.
- CI não esconderá o legado de lint: bloqueará aumento acima do baseline e reduzirá o baseline nas ondas seguintes até zero.

---

## Mapa de arquivos

- Create: `.nvmrc` — versão Node canônica.
- Modify: `package.json` — identidade, engines, packageManager, scripts e CLI.
- Modify: `package-lock.json` — único lockfile.
- Delete: `bun.lock`, `bun.lockb`.
- Modify: `supabase/config.toml` — stack local e seed.
- Create: `supabase/legacy-migrations/README.md` — motivo do arquivamento.
- Move: `supabase/migrations/*.sql` → `supabase/legacy-migrations/`.
- Create via CLI: o caminho impresso por `supabase migration new audiflow_canonical_baseline`.
- Create via CLI: o caminho impresso por `supabase migration new audiflow_structural_data`.
- Create: `supabase/seed.sql` — fixtures locais, nunca produção.
- Create: `scripts/check-runtime.mjs`.
- Create: `scripts/generate-supabase-types.mjs`.
- Create: `scripts/check-eslint-baseline.mjs`.
- Create: `quality/eslint-baseline.json`.
- Create: `.env.example`.
- Create: `src/integrations/supabase/config.ts`.
- Create: `src/integrations/supabase/config.test.ts`.
- Modify: `src/integrations/supabase/client.ts`.
- Delete: `src/lib/supabase-client.ts` após migração dos imports.
- Modify: `src/integrations/supabase/types.ts`.
- Modify: `playwright.config.ts`.
- Create: `tests/e2e/auth-smoke.spec.ts`.
- Create: `.github/workflows/quality.yml`.
- Modify: `docs/manual/04-manual-tecnico.md`.
- Modify: `docs/manual/09-runbook-implantacao.md`.

## Ordem conjunta com a Onda 0

1. Onda 0 Tasks 1–2: congelamento, backup e dump somente leitura.
2. Onda 1 Tasks 1–3: ferramenta, baseline canônico e banco local.
3. Onda 0 Tasks 3–8: testes, correção P0 e promoção.
4. Onda 1 Tasks 4–8: frontend canônico, qualidade e CI.

### Task 1: Fixar runtime, npm e Supabase CLI

**Files:**
- Create: `.nvmrc`
- Create: `scripts/check-runtime.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Delete: `bun.lock`
- Delete: `bun.lockb`

**Interfaces:**
- Produces: `npm ci` determinístico e comando `npm run preflight`.

- [ ] **Step 1: Escrever o verificador de runtime**

Criar `scripts/check-runtime.mjs`:

```js
const expectedNode = "24.15.0";
const expectedNpm = "11.12.1";
const actualNode = process.versions.node;
const actualNpm = process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1];

if (actualNode !== expectedNode) {
  console.error(`Node ${expectedNode} required; found ${actualNode}`);
  process.exit(1);
}
if (actualNpm !== expectedNpm) {
  console.error(`npm ${expectedNpm} required; found ${actualNpm ?? "unknown"}`);
  process.exit(1);
}
console.log(`runtime ok: node ${actualNode}, npm ${actualNpm}`);
```

- [ ] **Step 2: Confirmar que o preflight ainda não existe**

Run: `npm run preflight`

Expected: FAIL com `Missing script: preflight`.

- [ ] **Step 3: Fixar metadados e scripts**

Em `package.json`, alterar nome para `audiflow`, adicionar:

```json
"packageManager": "npm@11.12.1",
"engines": { "node": "24.15.0", "npm": "11.12.1" },
"scripts": {
  "preflight": "node scripts/check-runtime.mjs",
  "typecheck": "tsc -b --pretty false",
  "test:unit": "vitest run",
  "test:e2e": "playwright test",
  "test:db": "supabase test db",
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:lint": "supabase db lint --local --fail-on error"
}
```

Preservar scripts existentes e fazer `test` apontar para `npm run test:unit`. Criar `.nvmrc` com `apply_patch`; o arquivo deve conter exatamente `24.15.0` seguido de nova linha.

- [ ] **Step 4: Fixar CLI e reconstruir lockfile**

Run:

```powershell
npm.cmd install --save-dev --save-exact supabase@2.109.1
git rm bun.lock bun.lockb
npm.cmd install --package-lock-only
```

Expected: `supabase` aparece com `2.109.1` exato e apenas `package-lock.json` permanece.

- [ ] **Step 5: Provar instalação limpa**

Run:

```powershell
npm.cmd ci
npm.cmd run preflight
npm.cmd exec -- supabase --version
```

Expected: três comandos exit 0; CLI imprime `2.109.1`.

- [ ] **Step 6: Commit**

```powershell
git add .nvmrc scripts/check-runtime.mjs package.json package-lock.json bun.lock bun.lockb
git commit -m "build: pin AudiFlow runtime and package manager"
```

### Task 2: Criar baseline canônico sem reaplicar o legado

**Files:**
- Move: `supabase/migrations/*.sql` → `supabase/legacy-migrations/`
- Create: `supabase/legacy-migrations/README.md`
- Create via CLI: o caminho impresso por `supabase migration new audiflow_canonical_baseline`
- Create via CLI: o caminho impresso por `supabase migration new audiflow_structural_data`
- Reference: `artifacts/security/2026-07-13/remote-schema.sql`

**Interfaces:**
- Consumes: backup e dump remoto da Onda 0 Task 2.
- Produces: sequência ativa mínima que reconstrói o estado remoto pré-P0.

- [ ] **Step 1: Validar que o dump é somente schema**

Run:

```powershell
rg -n "COPY auth\.users|INSERT INTO auth\.users|COPY public\." artifacts/security/2026-07-13/remote-schema.sql
```

Expected: nenhuma ocorrência. Se houver dados, apagar o artefato e refazer `db dump` sem `--data-only`/`--use-copy`.

- [ ] **Step 2: Arquivar migrations históricas preservando auditoria**

Run:

```powershell
New-Item -ItemType Directory -Path supabase\legacy-migrations -Force
git mv supabase/migrations/*.sql supabase/legacy-migrations/
New-Item -ItemType Directory -Path supabase\migrations -Force
```

Criar README explicando: 48 arquivos preservados; remoto sem histórico; não executar; baseline de 2026-07-13 substitui replay cronológico.

- [ ] **Step 3: Gerar baseline pelo CLI, sem inventar timestamp**

Run:

```powershell
Get-Content -Raw artifacts/security/2026-07-13/remote-schema.sql | npm exec -- supabase migration new audiflow_canonical_baseline
```

Expected: um arquivo novo com o SQL do dump. Inspecionar e remover apenas comandos de ownership/ACL incompatíveis com Supabase gerenciado; não remover RLS, funções, policies, triggers ou constraints.

- [ ] **Step 4: Criar migration de dados estruturais**

Run: `npm exec -- supabase migration new audiflow_structural_data`

Adicionar inserts idempotentes apenas para estruturas necessárias ao schema, incluindo buckets:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documentos-balancete', 'documentos-balancete', false, 20971520, array['application/pdf']),
  ('solicitacao-documentos', 'solicitacao-documentos', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

- [ ] **Step 5: Comparar baseline com remoto antes de tocar histórico**

Com stack local iniciada, executar:

```powershell
npm exec -- supabase db reset
npm exec -- supabase db diff --linked --schema public,storage
```

Expected: diff vazio, exceto dados não estruturais e objetos explicitamente documentados. Qualquer diferença de tabela, função, policy ou constraint bloqueia o avanço.

- [ ] **Step 6: Checkpoint para reparar somente o histórico remoto**

Obter mecanicamente o timestamp do arquivo criado pelo CLI. Com backup confirmado e diff estrutural zero, executar:

```powershell
$baselineFile = Get-ChildItem -LiteralPath supabase\\migrations -Filter '*_audiflow_canonical_baseline.sql' | Select-Object -First 1
$baselineVersion = $baselineFile.BaseName.Split('_')[0]
npm exec -- supabase migration repair $baselineVersion --status applied --linked
npm exec -- supabase migration list --linked
```

Expected: apenas o baseline aparece em LOCAL e REMOTE. O valor do timestamp não é inventado; é copiado do caminho criado pelo CLI.

- [ ] **Step 7: Commit**

```powershell
git add supabase/migrations supabase/legacy-migrations
git commit -m "db: establish canonical AudiFlow baseline"
```

### Task 3: Subir banco local e seed determinístico

**Files:**
- Modify: `supabase/config.toml`
- Create: `supabase/seed.sql`
- Test: `supabase/tests/database/001_seed_contract.test.sql`

**Interfaces:**
- Produces: dois clientes, perfis e dados mínimos usados pelas suítes.

- [ ] **Step 1: Instalar e validar Docker Desktop**

Run: `docker --version`

Expected: Docker disponível. Estado observado em 2026-07-13: comando ausente; esta etapa é bloqueante e requer instalação aprovada pelo usuário.

- [ ] **Step 2: Configurar seed local**

Em `supabase/config.toml`, manter o project id local e adicionar:

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

O project id local deve ser `audiflow-local`; o vínculo remoto continua em `.supabase/`, ignorado pelo Git.

- [ ] **Step 3: Criar seed sem dados reais**

`supabase/seed.sql` deve usar UUIDs fixos documentados na Onda 0, criar dois clientes, dois exercícios/trabalhos, admin, auditor alocado/não alocado, cliente A/B e sem vínculo. Senhas de teste devem ser `local-only-not-a-secret` e nunca usadas fora do stack local.

- [ ] **Step 4: Escrever contrato pgTAP do seed**

Verificar exatamente dois clientes fixture, dois trabalhos e todos os auth UUIDs esperados. Envolver teste em `BEGIN`/`ROLLBACK`.

- [ ] **Step 5: Iniciar e reconstruir duas vezes**

Run:

```powershell
npm run db:start
npm run db:reset
npm run test:db
npm run db:reset
npm run test:db
```

Expected: as duas execuções produzem o mesmo total e passam; seed é idempotente no ciclo de reset.

- [ ] **Step 6: Commit**

```powershell
git add supabase/config.toml supabase/seed.sql supabase/tests/database/001_seed_contract.test.sql
git commit -m "test: add reproducible local audit fixtures"
```

### Task 4: Substituir configuração Playwright herdada do Lovable

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/auth-smoke.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run test:e2e` independente de `lovable-agent-playwright-config`.

- [ ] **Step 1: Escrever smoke test**

```ts
import { expect, test } from "@playwright/test";

test("renders the authentication entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/auth|\/$/);
  await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
});
```

- [ ] **Step 2: Confirmar falha da configuração antiga**

Run: `npm run test:e2e -- --list`

Expected: FAIL mencionando `lovable-agent-playwright-config`.

- [ ] **Step 3: Usar configuração Playwright nativa**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 4: Instalar navegador e testar**

Run:

```powershell
npm exec -- playwright install chromium
npm run test:e2e -- --list
npm run test:e2e
```

Expected: um teste listado e um teste passando.

- [ ] **Step 5: Commit**

```powershell
git add playwright.config.ts tests/e2e/auth-smoke.spec.ts package.json package-lock.json
git commit -m "test: replace Lovable Playwright configuration"
```

### Task 5: Unificar cliente Supabase e configuração por ambiente

**Files:**
- Create: `.env.example`
- Create: `src/integrations/supabase/config.ts`
- Create: `src/integrations/supabase/config.test.ts`
- Modify: `src/integrations/supabase/client.ts`
- Modify: imports em `src/**/*.ts` e `src/**/*.tsx`
- Delete: `src/lib/supabase-client.ts`

**Interfaces:**
- Produces: `getSupabaseConfig(env)` e singleton `supabase` canônico.

- [ ] **Step 1: Escrever testes de configuração**

```ts
import { describe, expect, it } from "vitest";
import { getSupabaseConfig } from "./config";

describe("getSupabaseConfig", () => {
  it("returns URL and publishable key", () => {
    expect(getSupabaseConfig({
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "local-publishable-key",
    })).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-publishable-key",
    });
  });

  it("throws when a value is missing", () => {
    expect(() => getSupabaseConfig({ VITE_SUPABASE_URL: "" }))
      .toThrow("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  });
});
```

- [ ] **Step 2: Confirmar vermelho**

Run: `npm test -- src/integrations/supabase/config.test.ts`

Expected: FAIL porque `config.ts` não existe.

- [ ] **Step 3: Implementar configuração e cliente**

`getSupabaseConfig` aceita `Record<string, string | boolean | undefined>`, valida ambas as strings e retorna `{ url, publishableKey }`. `client.ts` usa `getSupabaseConfig(import.meta.env)` e preserva as opções de sessão atuais.

`.env.example`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=replace-with-output-from-supabase-status
```

- [ ] **Step 4: Migrar todos os imports**

Substituir `@/lib/supabase-client` por `@/integrations/supabase/client`. Verificar:

```powershell
rg -n "@/lib/supabase-client" src
```

Expected: nenhuma ocorrência; então remover `src/lib/supabase-client.ts`.

- [ ] **Step 5: Testar**

Run:

```powershell
npm test -- src/integrations/supabase/config.test.ts
npm run typecheck
npm run build
```

Expected: três comandos passam; nenhuma chave fica hardcoded no bundle-fonte.

- [ ] **Step 6: Commit**

```powershell
git add .env.example src package.json package-lock.json
git commit -m "refactor: use one environment-based Supabase client"
```

### Task 6: Gerar tipos e bloquear drift

**Files:**
- Create: `scripts/generate-supabase-types.mjs`
- Modify: `src/integrations/supabase/types.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run types:generate` e `npm run types:check`.

- [ ] **Step 1: Criar gerador cross-platform**

O script usa `spawnSync` com `shell: true` para executar `supabase gen types typescript --local --schema public`, falha se status não zero e grava `stdout` em `src/integrations/supabase/types.ts` como UTF-8.

- [ ] **Step 2: Adicionar scripts**

```json
"types:generate": "node scripts/generate-supabase-types.mjs",
"types:check": "npm run types:generate && git diff --exit-code -- src/integrations/supabase/types.ts"
```

- [ ] **Step 3: Gerar e verificar**

Run:

```powershell
npm run types:generate
npm run typecheck
npm run types:check
```

Expected: tipos incluem as 51 tabelas/RPCs canônicas; três comandos passam e o último não gera diff.

- [ ] **Step 4: Commit**

```powershell
git add scripts/generate-supabase-types.mjs package.json src/integrations/supabase/types.ts
git commit -m "build: generate Supabase types from local schema"
```

### Task 7: Criar baseline de lint sem aceitar regressão

**Files:**
- Create: `scripts/check-eslint-baseline.mjs`
- Create: `quality/eslint-baseline.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run lint:baseline`, que falha se total ou regra aumentar.

- [ ] **Step 1: Exportar resultado atual em JSON**

Run: `npm exec -- eslint . --format json --output-file artifacts/eslint-current.json`

Expected: exit não zero e arquivo com 920 erros/33 avisos observados; contagens reais do momento prevalecem.

- [ ] **Step 2: Criar baseline versionado por ruleId**

`quality/eslint-baseline.json` contém:

```json
{
  "maximumErrors": 920,
  "maximumWarnings": 33,
  "rules": {}
}
```

Preencher `rules` mecanicamente a partir do JSON com contagem por `ruleId`; nenhum valor pode exceder o observado.

- [ ] **Step 3: Implementar verificador**

Executar ESLint via `spawnSync`, parsear JSON mesmo com status 1, contar errors/warnings e cada `ruleId`. Falhar quando total ou regra exceder baseline; passar quando igual ou menor. Imprimir deltas.

- [ ] **Step 4: Adicionar e testar script**

```json
"lint:baseline": "node scripts/check-eslint-baseline.mjs"
```

Run: `npm run lint:baseline`

Expected: PASS com baseline atual. Introduzir temporariamente um erro em arquivo de teste deve falhar; reverter e confirmar PASS.

- [ ] **Step 5: Commit**

```powershell
git add scripts/check-eslint-baseline.mjs quality/eslint-baseline.json package.json
git commit -m "build: prevent new lint debt"
```

### Task 8: Criar CI e runbook executável

**Files:**
- Create: `.github/workflows/quality.yml`
- Modify: `docs/manual/04-manual-tecnico.md`
- Modify: `docs/manual/09-runbook-implantacao.md`

**Interfaces:**
- Consumes: scripts das Tasks 1–7 e testes P0.
- Produces: gates obrigatórios de pull request.

- [ ] **Step 1: Criar workflow de aplicação**

Job `application` em `ubuntu-latest`:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 24.15.0
    cache: npm
- run: npm install --global npm@11.12.1
- run: npm ci
- run: npm run preflight
- run: npm run lint:baseline
- run: npm run typecheck
- run: npm run test:unit
- run: npm run build
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e
```

- [ ] **Step 2: Criar job de banco**

Job `database` em `ubuntu-latest`:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 24.15.0
    cache: npm
- run: npm install --global npm@11.12.1
- run: npm ci
- run: npm exec -- supabase start
- run: npm exec -- supabase db reset
- run: npm run test:db
- run: npm run db:lint
- run: npm run types:check
```

Adicionar `timeout-minutes: 30` e `concurrency` por branch. Não usar credenciais remotas: CI testa apenas local.

- [ ] **Step 3: Validar workflow localmente pelos mesmos comandos**

Run:

```powershell
npm ci
npm run preflight
npm run lint:baseline
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
npm run db:reset
npm run test:db
npm run db:lint
npm run types:check
```

Expected: todos exit 0. Se lint legado ainda exceder baseline ou reset falhar, CI não deve ser marcado verde por `continue-on-error`.

- [ ] **Step 4: Atualizar documentação**

Documentar Node/npm/Docker, bootstrap, `.env`, comandos, vínculo remoto, proibição de `--include-all`, criação de migrations, dry-run, staging, rollback e evidências.

- [ ] **Step 5: Commit**

```powershell
git add .github/workflows/quality.yml docs/manual/04-manual-tecnico.md docs/manual/09-runbook-implantacao.md
git commit -m "ci: verify application and database foundation"
```

## Gate de conclusão da Onda 1

- [ ] `npm ci` passa em clone limpo.
- [ ] Node/npm/CLI estão fixados e verificados.
- [ ] Docker e stack Supabase local iniciam sem exposição pública.
- [ ] Migrations históricas estão preservadas fora da sequência ativa.
- [ ] Baseline canônico reconstrói as 51 tabelas e objetos dependentes.
- [ ] `supabase db reset` passa duas vezes seguidas.
- [ ] Seed contém somente fixtures sintéticas de dois clientes.
- [ ] Playwright usa configuração própria e smoke passa.
- [ ] Um único cliente Supabase usa variáveis de ambiente.
- [ ] Tipos gerados não apresentam drift.
- [ ] Lint legado não pode aumentar; baseline fica explicitamente registrado.
- [ ] CI de aplicação e banco passa sem segredos remotos.
- [ ] Runbook contém bootstrap, deploy, rollback e checkpoints.
