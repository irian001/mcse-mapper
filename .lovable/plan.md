
# Plano — Servidor MCP (Agent Integrations) com OAuth do Supabase externo

## Contexto

O app roda em Supabase externo (`zqoywwtdsbtqtytvyzwl.supabase.co`) — é lá que estão auth e dados reais. Assumindo que o OAuth 2.1 do Supabase externo foi habilitado, o servidor MCP será um resource server que valida tokens emitidos por esse issuer, e a rota de consentimento vai chamar `supabase.auth.oauth.*` do client já existente.

O projeto Lovable Cloud (`zabgpojqeoevttuxpobw`) NÃO será tocado — nenhuma migração nele, nem `configure_oauth_server` (que só afeta o managed Cloud, não o externo).

## Pré-condição a validar antes de codar

1. Confirmar que o Supabase externo publica o OAuth 2.1: buscar `https://zqoywwtdsbtqtytvyzwl.supabase.co/auth/v1/.well-known/oauth-authorization-server` e verificar `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint` (para DCR).
2. Se a resposta vier vazia/404, parar e reportar — o OAuth ainda não está ativo no externo e não há como o Lovable ativar remotamente. Se OK, prosseguir.

## O que será criado / editado

### Novos arquivos

- `src/lib/mcse/tools/list-trabalhos.ts` — tool que lista trabalhos acessíveis ao usuário logado (usa `ctx.getToken()` para instanciar um client Supabase externo com `Authorization: Bearer <token>`, RLS aplica).
- `src/lib/mcse/tools/list-clientes.ts` — tool que lista clientes acessíveis (mesmo padrão).
- `src/lib/mcse/tools/get-mcse-conta.ts` — tool que busca uma conta MCSE por código (leitura de tabela referência).
- `src/lib/mcp/index.ts` — `defineMcp` com `name`, `title`, `version`, `instructions`, `auth: auth.oauth.issuer({ issuer: "https://zqoywwtdsbtqtytvyzwl.supabase.co/auth/v1", acceptedAudiences: "authenticated" })`, e as três tools.
- `src/pages/OAuthConsentPage.tsx` — rota de consentimento em `/.lovable/oauth/consent`, seguindo o shape canônico: lê `authorization_id`, checa sessão (redireciona para `/login?next=...` preservando URL), chama `supabase.auth.oauth.getAuthorizationDetails/approve/deny`, renderiza tela de aprovação com nome do cliente + escopos.
- Wrapper local tipado para `supabase.auth.oauth.*` se o TS não enxergar o namespace beta.

### Arquivos editados

- `package.json` — adicionar `@lovable.dev/mcp-js` e `zod`.
- `vite.config.ts` — importar `mcpPlugin` de `@lovable.dev/mcp-js/stacks/supabase/vite` e adicionar ao array `plugins`.
- `src/App.tsx` — registrar rota pública `/.lovable/oauth/consent` FORA do `AuthGate` (a rota precisa ser acessível sem sessão para redirecionar ao login preservando o `next`), e ajustar `AuthPage` para consumir `?next=` após login bem-sucedido, redirecionando de volta à URL de consentimento.
- `public/favicon.ico` — verificar se já existe um favicon do app; se estiver com o padrão Lovable, gerar um simples com a identidade Audiconsult (o conector MCP usa `/favicon.ico` como ícone).

### Gerado automaticamente (não editar à mão)

- `supabase/functions/mcp/index.ts` — emitido pelo `mcpPlugin` a cada build. Depois de gerado, será deployado no Supabase externo via CLI **pelo usuário** (o `supabase--deploy_edge_functions` do Lovable só publica no projeto Cloud managed, não no externo). O plano documenta o comando: `supabase functions deploy mcp --project-ref zqoywwtdsbtqtytvyzwl --no-verify-jwt`.

## Escolha das tools iniciais (mínimas e seguras)

Tools somente-leitura para a primeira versão, todas com `readOnlyHint: true`:

1. `list_trabalhos_auditoria` — usa RLS existente (`get_accessible_trabalho_ids`), retorna id/cliente/exercício/status.
2. `list_clientes` — respeita RLS, retorna id/razão social/nome fantasia.
3. `get_mcse_conta` — parâmetro `codigo`, retorna a conta canônica MCSE.

Sem tools de escrita nesta primeira leva — evita risco enquanto validamos o fluxo OAuth ponta a ponta.

## Rota de consentimento — pontos críticos

- Preservar `next=` em **todos** os caminhos de auth: login por senha, signup (`emailRedirectTo`), e qualquer OAuth social. `AuthPage` hoje não lê `next`; será atualizado para ler `useSearchParams` e redirecionar após `signInWithPassword`.
- Validar `next` como caminho relativo same-origin antes de usar (proteção contra open redirect).
- Adicionar URL de retorno na allow-list de redirect do Supabase externo — passo manual documentado.

## Verificação (pós-build)

1. `curl` do `.well-known/oauth-authorization-server` do issuer.
2. Abrir `/.lovable/oauth/consent?authorization_id=debug` deslogado — deve redirecionar para `/login?next=...` preservando a URL.
3. Após deploy da função MCP no externo, `curl` de `https://zqoywwtdsbtqtytvyzwl.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource` deve retornar o issuer.
4. Rodar `app_mcp_server--extract_mcp_manifest` para gerar `.lovable/mcp/manifest.json` — necessário para o painel "Agent integrations" listar as tools.

## Fora do escopo desta iteração

- Tools de escrita (criar solicitação, atualizar balancete, etc.) — próxima fase depois de validar OAuth.
- Migrar app do Supabase externo para o Cloud managed — decisão separada.
- Configurar DCR/allow-list no Supabase externo — passos manuais que só o dono do projeto externo executa.

## Confirmação necessária antes de eu implementar

Só uma checagem rápida: você habilitou no Supabase externo (`zqoywwtdsbtqtytvyzwl`) o **OAuth 2.1 authorization server** com **dynamic client registration**? Se sim, sigo direto com o plano acima. Se você não tem certeza, eu começo pelo passo 1 da pré-condição (probe do `.well-known/`) para confirmar antes de mexer no código.
