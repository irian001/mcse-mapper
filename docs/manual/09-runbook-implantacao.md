# Runbook Inicial de Implantacao

Este documento registra cuidados operacionais iniciais para evoluir e implantar o sistema.

## Principio geral

Toda alteracao deve ser tratada como mudanca controlada:

1. Alterar.
2. Testar localmente.
3. Validar comportamento funcional.
4. Revisar impacto em banco/RLS.
5. Criar commit.
6. Fazer push.
7. Validar no ambiente de destino.

## Cuidados com SQL manual

- Nunca executar SQL sem revisar o conteudo completo.
- Confirmar ambiente Supabase antes de executar.
- Confirmar que a aplicacao usa Supabase externo e que o SQL sera executado no projeto correto.
- Nunca executar SQL no Lovable Cloud quando a aplicacao usa Supabase externo.
- Confirmar se o SQL e idempotente.
- Confirmar impacto em tabelas existentes.
- Confirmar impacto em RLS.
- Confirmar se ha backup ou forma de rollback.
- Executar validacoes pos-SQL.
- Registrar quando, onde e por quem o SQL foi aplicado.
- Avaliar se o PostgREST precisa de reload schema.
- Avaliar se `types.ts` deve ser regenerado em fase propria.

Checklist minimo antes de SQL manual:

- [ ] Projeto Supabase correto.
- [ ] Backup ou ambiente de teste disponivel.
- [ ] Script revisado.
- [ ] Script versionado no GitHub.
- [ ] Idempotencia avaliada.
- [ ] Dependencias e ordem avaliadas.
- [ ] Validacoes pos-execucao definidas.
- [ ] Plano de rollback ou reversao documentado.
- [ ] Necessidade de reload schema avaliada.
- [ ] Necessidade de regenerar `types.ts` registrada.

## `docs/sql` versus `supabase/migrations`

- `supabase/migrations` contem migrations versionadas do projeto.
- `docs/sql` contem scripts manuais e documentos de fases recentes.
- Nem todo script em `docs/sql` deve ser tratado automaticamente como migration.
- Antes de converter script manual em migration, revisar ordem, idempotencia, dependencias e ambiente.

## Validacao pos-SQL

Apos SQL manual, validar:

1. Tabelas criadas.
2. Colunas adicionadas.
3. Constraints.
4. Indices.
5. Triggers.
6. Policies RLS.
7. Storage buckets e policies.
8. Cache PostgREST quando aplicavel.
9. Funcionalidade da tela correspondente.
10. Acesso com admin, auditor e cliente.

## Uso do GitHub

- Manter alteracoes versionadas.
- Fazer commits pequenos e descritivos.
- Evitar commits com codigo, SQL e documentacao misturados sem necessidade.
- Conferir `git status` antes de commit.
- Conferir diff antes de push.

## Uso do Lovable

- Validar o que foi gerado antes de aceitar como definitivo.
- Conferir se alterou arquivos fora do escopo.
- Conferir se criou novas dependencias ou scripts.
- Conferir se o banco real precisa de SQL manual.

## Uso do Codex Desktop/local

- Preferir tarefas com escopo claro.
- Separar fases de analise, documentacao, codigo e banco.
- Antes de editar, confirmar restricoes da tarefa.
- Depois de editar, revisar arquivos alterados e status Git.

## Fluxo recomendado

1. Definir objetivo da fase.
2. Levantar estado atual do repositorio.
3. Implementar ou documentar somente o escopo autorizado.
4. Rodar validacoes permitidas.
5. Revisar diffs.
6. Commit local somente quando solicitado.
7. Push somente quando solicitado.
8. Validar ambiente remoto apos deploy.

## Quando envolver banco

Banco deve ser tratado em fase propria quando houver:

- nova tabela;
- nova coluna;
- alteracao de enum;
- policy RLS;
- trigger;
- funcao;
- bucket de storage;
- migracao de dados.

Nesta fase D.2, banco nao foi alterado.

## Pontos pendentes para runbook futuro

- Definir ambientes oficiais.
- Definir responsaveis por execucao de SQL.
- Definir checklist formal de rollback.
- Definir como regenerar `types.ts`.
- Definir estrategia de migrations para scripts em `docs/sql`.
- Definir politica de versionamento de documentacao.
