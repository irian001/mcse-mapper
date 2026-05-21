# Manual do Usuario Cliente

Este documento descreve o uso inicial do portal do cliente.

Observacao: inferido a partir do codigo.

## Acesso do cliente

1. O cliente acessa o sistema com email e senha.
2. O sistema verifica se o usuario esta vinculado a `cliente_usuarios`.
3. Quando o vinculo esta ativo, o usuario entra no layout do cliente.
4. O cliente visualiza apenas rotas do portal.

## Menus disponiveis

- Minhas Solicitacoes.
- Pendencias.

## Solicitacoes

1. Acesse `Minhas Solicitacoes`.
2. Consulte a lista de solicitacoes documentais.
3. Use filtros por status e busca por titulo.
4. Abra uma solicitacao para ver os itens solicitados.
5. Consulte instrucoes do auditor, instrucoes MCSE e trilhas de emissao ERP quando existirem.

## Pendencias

1. Acesse `Pendencias`.
2. Consulte documentos que ainda precisam de acao.
3. Priorize itens pendentes, rejeitados ou com complementacao solicitada.
4. Observe o prazo do item quando exibido.

## Envio de documentos

1. Abra a solicitacao ou pendencia.
2. Localize o item solicitado.
3. Clique em anexar PDF.
4. Se desejar, preencha uma observacao.
5. Envie o arquivo.

Regras observadas:

- Apenas PDF e aceito para documentos da solicitacao.
- O limite identificado no codigo e 20 MB por arquivo.
- Cada novo envio cria uma nova versao do documento.

## Reenvio e correcao

1. Quando o auditor recusa ou solicita complementacao, o item aparece como pendente.
2. Leia a observacao do auditor.
3. Clique em reenviar documento.
4. Anexe novo PDF.
5. O sistema registra nova versao.

## Status visiveis

- Aguardando envio.
- Em analise.
- Aceito.
- Necessita reenvio.
- Complementar.

Observacao: os nomes exibidos podem variar conforme o status interno da solicitacao, item ou documento.

## Limitacoes do `cliente_usuario`

- Nao acessa o layout completo de auditor.
- Nao acessa cadastros internos.
- Nao cria trabalhos, balancetes, PTA, regras, riscos ou procedimentos.
- Nao altera matriz de riscos, planejamento ou materialidade.
- Pode visualizar solicitacoes do seu cliente e enviar documentos.
- Pode atualizar itens e documentos apenas dentro do escopo permitido por RLS.

## Pontos que precisam de validacao

- Confirmar no ambiente real se todos os filtros de RLS impedem acesso cruzado entre clientes.
- Confirmar se arquivos antigos permanecem acessiveis por signed URL apenas para usuarios autorizados.
- Confirmar politica de prazo e notificacao, pois nao foi encontrada automacao formal no inventario.
