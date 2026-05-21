# Backlog e Dividas Tecnicas

Este documento lista pendencias identificadas na Fase D.1.

## Documentacao

- README desatualizado: descreve dashboard de permissionaria/conselho, nao o sistema atual de auditoria.
- `docs/sistema` ausente.
- Manual de usuario ainda inicial.
- Manual tecnico ainda inicial.
- Dicionario de dados precisa ser validado contra Supabase real.
- Matriz de permissoes precisa de testes reais de RLS.
- Roteiros de teste ainda precisam ser detalhados por modulo.

## Schema e banco

- `types.ts` desatualizado.
- Uso frequente de `as any`.
- Drift de schema entre codigo, migrations, `docs/sql` e Supabase real.
- SQLs manuais em `docs/sql` nao convertidos formalmente em migrations.
- Tabelas usadas sem `CREATE TABLE` local encontrado:
  - `contratos`
  - `contrato_produtos`
  - `procedimentos_auxiliares`
  - `procedimento_auxiliar_documentos`
  - `procedimento_contagem_caixa_itens`
  - `procedimento_contagem_caixa_detalhes`
- Necessidade de validar RLS dessas tabelas no ambiente real.

## Seguranca e permissoes

- Parte das alcadas de planejamento/materialidade parece implementada no frontend.
- Necessario confirmar se o banco bloqueia as mesmas operacoes.
- Necessario testar acesso cruzado entre clientes.
- Necessario testar acesso de auditor sem vinculo ao trabalho.
- Necessario revisar storage policies para documentos.

## Modulos e funcionalidades

- Riscos sem vinculo formal com PTA, procedimentos, solicitacoes, evidencias ou bases de materialidade.
- Workflow de revisao, eventos, notas e gates ainda nao encontrado como implementado.
- Ordens de compra aparecem no hub, mas execucao especifica ainda nao implementada.
- Ordens de imobilizacao aparecem no hub, mas execucao especifica ainda nao implementada.
- Relatorios persistidos centralizados ainda nao implementados.
- Automacoes de notificacao/prazo nao foram identificadas.

## Qualidade tecnica

- Client Supabase duplicado:
  - um client hardcoded em `src/lib/supabase-client.ts`;
  - um client por env em `src/integrations/supabase/client.ts`.
- Encoding quebrado em textos do repositorio.
- Comentarios e textos podem estar divergentes do comportamento atual.
- Falta padrao unico para SQL manual versus migration.
- Falta padrao de testes automatizados por fluxo critico.

## Backlog sugerido

1. Validar schema real do Supabase.
2. Gerar dicionario de dados a partir do schema real.
3. Regenerar `types.ts` em fase autorizada.
4. Reduzir `as any` por modulo.
5. Consolidar client Supabase.
6. Converter SQLs manuais aprovados em migrations, quando apropriado.
7. Atualizar README.
8. Corrigir encoding.
9. Formalizar matriz de permissoes.
10. Criar testes por perfil e por fluxo.
11. Integrar riscos com PTA/procedimentos/solicitacoes/evidencias.
12. Implementar ou remover placeholders de ordens de compra e imobilizacao.

## Validacoes humanas necessarias

- Confirmar quais SQLs de `docs/sql` ja foram aplicados no Supabase externo.
- Confirmar se tabelas sem `CREATE TABLE` local existem no Supabase.
- Confirmar se RLS real corresponde ao codigo local.
- Confirmar se contratos e procedimentos auxiliares fazem parte do escopo final do produto.
- Confirmar nomenclatura oficial dos modulos para o manual final.
