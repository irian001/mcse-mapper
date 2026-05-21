# Roteiro Inicial de Testes

Este roteiro e inicial. Roteiros detalhados devem ser criados por modulo.

## Login e perfis

1. Entrar como admin.
2. Entrar como auditor comum.
3. Entrar como cliente_usuario.
4. Entrar com usuario sem vinculo.
5. Confirmar redirecionamento correto por perfil.

## Trabalhos

1. Criar trabalho com cliente e exercicio.
2. Editar datas, descricao e status.
3. Vincular contrato/produto quando existirem.
4. Adicionar auditor na equipe.
5. Marcar responsavel principal.
6. Remover auditor da equipe.

## Planejamento

1. Abrir planejamento do trabalho.
2. Salvar rascunho incompleto.
3. Preencher campos obrigatorios.
4. Aprovar com usuario autorizado.
5. Tentar aprovar com usuario sem alcada.
6. Confirmar comportamento de planejamento aprovado.

## Materialidade

1. Criar materialidade em rascunho.
2. Informar valores validos.
3. Testar valores invalidos.
4. Aprovar com perfil autorizado.
5. Confirmar `vigente`.
6. Confirmar bloqueio/edicao apos aprovacao.

## Bases de materialidade

1. Criar base manual.
2. Criar base a partir de linha de balancete.
3. Inativar base.
4. Tentar exceder limite de bases ativas.
5. Confirmar exibicao da base no PTA.

## Matriz de riscos

1. Criar risco por trabalho.
2. Vincular conta MCSE quando aplicavel.
3. Alterar probabilidade, impacto e resposta.
4. Alterar status.
5. Testar acesso como cliente_usuario.

## Balancete

1. Importar arquivo valido.
2. Mapear colunas obrigatorias.
3. Validar totais.
4. Atualizar mapeamento MCSE.
5. Abrir linha.
6. Informar valor validado.
7. Criar pendencia.
8. Anexar documento de referencia.
9. Excluir balancete em ambiente de teste.

## PTA

1. Gerar PTA automatico por conta MCSE.
2. Confirmar prevencao de duplicidade.
3. Criar PTA manual.
4. Vincular linhas.
5. Selecionar base de materialidade.
6. Registrar conclusoes.
7. Fechar e reabrir PTA.
8. Confirmar restricoes de PTA fechado.

## Solicitacoes

1. Gerar solicitacao a partir de trabalho com balancete.
2. Aplicar filtros de geracao.
3. Revisar itens gerados.
4. Salvar rascunho.
5. Marcar como revisada.
6. Gerar PDF/HTML.
7. Analisar documentos recebidos.
8. Vincular documento aceito ao balancete.

## Portal cliente

1. Entrar como cliente_usuario.
2. Visualizar somente solicitacoes do proprio cliente.
3. Enviar PDF valido.
4. Tentar enviar arquivo invalido.
5. Reenviar documento recusado.
6. Verificar pendencias.
7. Tentar acessar dados de outro cliente.

## Procedimentos auxiliares

1. Criar procedimento de caixa.
2. Criar procedimento de estoque.
3. Criar procedimento de faturas em aberto.
4. Anexar evidencia.
5. Registrar conclusao.
6. Alterar status.
7. Testar exclusao com e sem registros vinculados.

## Contagem de caixa

1. Criar item de caixa.
2. Inserir cedulas/moedas.
3. Conferir total contado e diferenca.
4. Gerar termo.
5. Anexar termo assinado.

Observacao: tabelas de caixa precisam de validacao contra schema real.

## Contagem de estoque

1. Criar bloco.
2. Importar itens.
3. Registrar contagem manual.
4. Registrar contagem rapida por codigo.
5. Conferir divergencias.
6. Abrir dashboard de estoques.

## Faturas em aberto

1. Importar CSV/XLS/XLSX.
2. Mapear colunas obrigatorias.
3. Validar erros e alertas.
4. Importar lote.
5. Conferir itens.
6. Conferir dashboard de aging.
7. Validar cadastros auxiliares de classes e municipios.

## RLS e seguranca

1. Testar acesso com admin.
2. Testar acesso com auditor vinculado.
3. Testar acesso com auditor nao vinculado.
4. Testar acesso com cliente_usuario.
5. Testar storage de documentos.

## Observacoes

- Este roteiro nao substitui testes automatizados.
- Ainda nao ha roteiro detalhado por modulo.
- Ainda nao ha matriz completa de massa de dados de teste.
