# Roteiro Inicial de Testes

Este roteiro é inicial. Roteiros detalhados devem ser criados por módulo.

Escopo desta versão: organizar os testes mínimos por fluxo crítico e reforçar os pontos de Planejamento, Materialidade, Bases de Materialidade, Matriz de Riscos e PTA documentados no manual do auditor.

## Login e perfis

1. Entrar como admin.
2. Entrar como auditor comum.
3. Entrar como cliente_usuario.
4. Entrar com usuário sem vínculo.
5. Confirmar redirecionamento correto por perfil.

## Trabalhos

1. Criar trabalho com cliente e exercício.
2. Editar datas, descrição e status.
3. Vincular contrato/produto quando existirem.
4. Adicionar auditor na equipe.
5. Marcar responsável principal.
6. Remover auditor da equipe.
7. Confirmar status conhecidos do trabalho.
8. Confirmar que trabalho criado aparece nos módulos dependentes.

## Planejamento

1. Abrir planejamento do trabalho.
2. Salvar rascunho incompleto.
3. Preencher campos obrigatórios: objetivo, escopo, estratégia e responsável.
4. Aprovar com usuário autorizado.
5. Tentar aprovar com usuário sem alçada.
6. Testar regra de senior como responsável principal.
7. Confirmar comportamento de planejamento aprovado.
8. Confirmar se a regra de alçada existe apenas no frontend ou também no banco/RLS.

## Materialidade

1. Criar materialidade em rascunho.
2. Informar base de cálculo, percentual, materialidade global, desempenho e trivialidade.
3. Testar valores válidos.
4. Testar valores inválidos.
5. Aprovar com perfil autorizado.
6. Confirmar `vigente`.
7. Confirmar bloqueio/edição após aprovação.
8. Testar tentativa de aprovar quando já existir materialidade vigente.
9. Confirmar comportamento de nova versão, se a tela apresentar essa opção.

## Bases de materialidade

1. Criar base manual.
2. Criar base a partir de linha de balancete.
3. Inativar base.
4. Tentar exceder limite de bases ativas.
5. Reativar base respeitando limite de 3 bases ativas.
6. Confirmar exibição da base no PTA somente quando materialidade estiver aprovada e vigente.
7. Confirmar snapshots de nome, valor, percentual, saldo, conta e critério no PTA.
8. Confirmar se o limite de 3 bases é apenas frontend ou também banco/RLS.

## Matriz de riscos

1. Criar risco por trabalho.
2. Vincular conta MCSE quando aplicável.
3. Preencher área/ciclo, assertiva, risco identificado, tipo, probabilidade, impacto, nível e resposta planejada.
4. Confirmar sugestão de nível por probabilidade x impacto.
5. Alterar manualmente o nível sugerido.
6. Marcar risco significativo.
7. Marcar risco de fraude.
8. Editar risco existente.
9. Inativar risco.
10. Reativar risco.
11. Testar filtros por texto, status, nível, significativo, fraude e ativos/inativos.
12. Conferir indicadores: ativos, críticos, alto/crítico, significativos, fraude, sem resposta e percentual com resposta.
13. Confirmar que ainda não há vínculo formal com PTA, procedimento, solicitação ou evidência.
14. Testar acesso como cliente_usuario.

## Balancete

1. Importar arquivo válido.
2. Mapear colunas obrigatórias.
3. Validar totais.
4. Atualizar mapeamento MCSE.
5. Abrir linha.
6. Informar valor validado.
7. Criar pendência.
8. Anexar documento de referência.
9. Excluir balancete em ambiente de teste.

## PTA

1. Gerar PTA automático por conta MCSE.
2. Confirmar prevenção de duplicidade.
3. Criar PTA manual.
4. Vincular linhas.
5. Selecionar base de materialidade.
6. Confirmar sugestão de limite de materialidade a partir da base.
7. Confirmar que limite de variação permanece manual.
8. Confirmar snapshot da base selecionada.
9. Testar PTA sem base vinculada.
10. Registrar conclusões.
11. Fechar e reabrir PTA.
12. Confirmar restrições de PTA fechado, concluído ou finalizado.

## Solicitações

1. Gerar solicitação a partir de trabalho com balancete.
2. Aplicar filtros de geração.
3. Revisar itens gerados.
4. Salvar rascunho.
5. Marcar como revisada.
6. Gerar PDF/HTML.
7. Analisar documentos recebidos.
8. Vincular documento aceito ao balancete.

## Portal cliente

1. Entrar como cliente_usuario.
2. Visualizar somente solicitações do próprio cliente.
3. Enviar PDF válido.
4. Tentar enviar arquivo inválido.
5. Reenviar documento recusado.
6. Verificar pendências.
7. Tentar acessar dados de outro cliente.

## Procedimentos auxiliares

1. Criar procedimento de caixa.
2. Criar procedimento de estoque.
3. Criar procedimento de faturas em aberto.
4. Anexar evidência.
5. Registrar conclusão.
6. Alterar status.
7. Testar exclusao com e sem registros vinculados.

## Contagem de caixa

1. Criar item de caixa.
2. Inserir cedulas/moedas.
3. Conferir total contado e diferença.
4. Gerar termo.
5. Anexar termo assinado.

Observação: tabelas de caixa precisam de validação contra schema real.

## Contagem de estoque

1. Criar bloco.
2. Importar itens.
3. Registrar contagem manual.
4. Registrar contagem rapida por codigo.
5. Conferir divergências.
6. Abrir dashboard de estoques.

## Faturas em aberto

1. Importar CSV/XLS/XLSX.
2. Mapear colunas obrigatorias.
3. Validar erros e alertas.
4. Importar lote.
5. Conferir itens.
6. Conferir dashboard de aging.
7. Validar cadastros auxiliares de classes e municípios.
8. Testar filtros por lote, situação, classe, município, vencimento, aging e busca.
9. Conferir indicadores de valor em aberto, faturas, UCs, lotes, classes não cadastradas, municípios não cadastrados e linhas com erro.

## RLS e segurança

1. Testar acesso com admin.
2. Testar acesso com auditor vinculado.
3. Testar acesso com auditor nao vinculado.
4. Testar acesso com cliente_usuario.
5. Testar storage de documentos.

## Observações

- Este roteiro não substitui testes automatizados.
- Ainda não há roteiro detalhado por módulo.
- Ainda não há matriz completa de massa de dados de teste.
- Roteiros detalhados por módulo devem ser mantidos separadamente ou ampliados em fase futura.
- Testes de RLS devem ser executados contra o Supabase real antes de considerar a matriz de permissões validada.
