# Fluxos e Status

Este documento registra os status conhecidos e lacunas de formalizacao.

Observacao: inferido a partir do codigo.

## Trabalho de auditoria

Status conhecidos:

- `planejado`
- `iniciado`
- `em_execucao`
- `revisao_1`
- `revisao_2`
- `finalizado_para_parecer`
- `encerrado`

Fluxo operacional observado:

1. Criar trabalho como planejado.
2. Alocar equipe.
3. Avancar conforme execucao e revisoes.
4. Encerrar ao final.

Regra ainda nao formalizada.

## Planejamento

Status conhecidos:

- `rascunho`
- `aprovado`

Fluxo observado:

1. Criar ou editar rascunho.
2. Validar campos obrigatorios.
3. Aprovar conforme alcada.
4. Planejamento aprovado fica restrito para edicao direta.

Regra de nova versao ainda nao formalizada.

## Materialidade

Status conhecidos:

- `rascunho`
- `aprovada`
- `substituida`

Campos de controle:

- `versao`
- `vigente`
- `data_aprovacao`
- `aprovado_por`

Fluxo observado:

1. Criar rascunho.
2. Informar base, percentual e valores.
3. Validar coerencia dos valores.
4. Aprovar e marcar como vigente.
5. Substituicao/nova versao aparece prevista, mas nao como fluxo completo.

Regra de versionamento completa ainda nao formalizada.

## Bases de materialidade

Status formal:

- Campo `ativo`.

Fluxo observado:

1. Criar base vinculada a materialidade.
2. Usar valor manual ou snapshot de balancete.
3. Manter no maximo tres bases ativas, conforme codigo.
4. Usar apenas bases ativas de materialidade aprovada/vigente no PTA.

Regra ainda nao formalizada em documento final.

## PTA

Status conhecidos:

- `pendente`
- `em_analise`
- `em_revisao`
- `concluido`
- `finalizado`

Campos adicionais:

- `fechado`
- `conclusao_preliminar`
- `conclusao_final`
- `comentario_auditor`
- `comentario_revisor`

Fluxo observado:

1. Criar PTA automatico ou manual.
2. Vincular linhas.
3. Atualizar saldos e diferencas.
4. Informar materialidade.
5. Registrar conclusoes.
6. Fechar ou reabrir PTA.

Regra de revisao formal ainda nao formalizada.

## Solicitacao documental

Status conhecidos:

- `rascunho`
- `revisada`
- `enviada`
- `parcialmente_respondida`
- `parcialmente_atendida`
- `respondida`
- `atendida`
- `concluida`
- `encerrada`
- `cancelada`

Fluxo observado:

1. Gerar solicitacao a partir de trabalho, balancete e regras.
2. Revisar itens.
3. Salvar rascunho.
4. Marcar como revisada.
5. Cliente envia documentos.
6. Auditor analisa documentos.
7. Solicitação pode evoluir para respondida, atendida, concluida ou encerrada.

Regra automatica de transicao de cabecalho ainda nao formalizada.

## Item de solicitacao

Status conhecidos:

- `pendente`
- `recebido`
- `aceito`
- `rejeitado`
- `dispensado`

Fluxo observado:

1. Item nasce pendente.
2. Upload de documento muda para recebido.
3. Analise do auditor muda para aceito, rejeitado ou pendente em caso de complementar.
4. Item pode ser dispensado.

Regra ainda nao formalizada.

## Documento do cliente

Status conhecidos:

- `enviado`
- `em_analise`
- `aceito`
- `recusado`
- `complementar`

Fluxo observado:

1. Cliente envia PDF.
2. Documento recebe versao.
3. Auditor analisa.
4. Se aceito, pode ser vinculado ao balancete.
5. Se recusado ou complementar, cliente reenvia nova versao.

## Procedimento auxiliar

Status conhecidos:

- `planejado`
- `em_execucao`
- `aguardando_documentos`
- `em_revisao`
- `concluido`
- `encerrado`

Fluxo observado:

1. Criar cabecalho.
2. Executar painel especifico.
3. Anexar evidencias.
4. Registrar conclusao.
5. Atualizar status.

Regra ainda nao formalizada.

## Risco de auditoria

Status inicial observado:

- `identificado`

Campos de classificacao:

- probabilidade
- impacto
- nivel_risco
- risco_significativo
- risco_fraude
- resposta_planejada
- risco_residual
- revisado_por
- data_revisao

Fluxo observado:

1. Cadastrar risco.
2. Classificar risco.
3. Definir resposta.
4. Registrar conclusao e revisao quando aplicavel.

Regra ainda nao formalizada.

Ainda nao implementado: vinculo formal do risco com PTA, procedimentos, solicitacoes e evidencias.
