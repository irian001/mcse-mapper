# Manual do Usuário Cliente

Este manual orienta o uso da Área do Cliente para consultar solicitações documentais, verificar pendências e enviar documentos para a auditoria.

Observação: inferido a partir do código.

## 1. Objetivo do manual

Explicar, em linguagem simples, como o usuário do cliente deve acessar o portal, localizar solicitações, entender pendências, enviar documentos em PDF e acompanhar o que já foi enviado.

Este manual não descreve a área interna da auditoria.

## 2. Público-alvo

- Usuários do cliente cadastrados para responder solicitações documentais.
- Pessoas responsáveis por separar, emitir ou enviar documentos para a auditoria.
- Contatos operacionais do cliente que acompanham prazos e pendências.

## 3. Visão geral da Área do Cliente

A Área do Cliente é um portal restrito. Nela, o cliente visualiza somente solicitações documentais vinculadas à sua empresa.

O fluxo principal é:

1. Entrar no sistema.
2. Abrir `Minhas Solicitações`.
3. Localizar a solicitação documental.
4. Abrir a solicitação.
5. Ler os itens solicitados e instruções.
6. Anexar PDF em cada item.
7. Acompanhar se o documento ficou enviado, em análise, aceito ou se precisa de complemento.
8. Usar `Pendências` para ver o que ainda precisa de ação.

## 4. Acesso ao sistema

O cliente acessa o sistema com e-mail e senha.

Depois do login, o sistema verifica se o usuário está vinculado a um cadastro ativo de `cliente_usuario`. Quando o vínculo existe, o usuário entra na Área do Cliente.

Rotas identificadas:

- `/cliente/solicitacoes`
- `/cliente/pendencias`

Observação: inferido a partir do código.

O cliente visualiza apenas informações vinculadas ao seu cliente. Ele não acessa a área interna de auditoria e não altera dados internos do trabalho.

## 5. Tela inicial do cliente

Ao entrar como cliente, o sistema direciona o usuário para `Minhas Solicitações`.

Na tela, o cliente vê:

- Nome do portal: `Portal do Cliente`.
- Nome da empresa vinculada ao usuário.
- Menu lateral.
- Nome do usuário do cliente.
- Botão de saída.

Observação: inferido a partir do código.

## 6. Menu da Área do Cliente

Menus disponíveis:

| Menu | Para que serve |
|---|---|
| Minhas Solicitações | Lista as solicitações documentais vinculadas ao cliente |
| Pendências | Mostra itens que precisam de envio, reenvio ou complementação |

## 7. Solicitações documentais

Uma solicitação documental é um pedido formal da auditoria para receber documentos ou informações do cliente.

Cada item representa um documento ou informação que a auditoria precisa receber.

**Caminho:** `/cliente/solicitacoes` ou menu `Minhas Solicitações`.

**Como as solicitações aparecem:**

- Título da solicitação.
- Trabalho de auditoria relacionado.
- Exercício.
- Data de emissão.
- Prazo de resposta, quando preenchido.
- Quantidade de itens.
- Quantidade de pendências.
- Status da solicitação.

**Como consultar:**

1. Acesse `Minhas Solicitações`.
2. Use a busca por título, se necessário.
3. Use o filtro de status, se necessário.
4. Clique na solicitação desejada.
5. Leia os dados gerais da solicitação.
6. Consulte os documentos solicitados.

**Agrupamento dos itens:**

Os itens podem aparecer agrupados por conta MCSE ou como documentos gerais, conforme a configuração da solicitação.

Observação: inferido a partir do código.

## 8. Pendências

Pendências são itens que precisam de alguma ação do cliente.

**Caminho:** `/cliente/pendencias` ou menu `Pendências`.

A tela de pendências reúne:

- Itens ainda não enviados.
- Itens recusados pela auditoria.
- Itens que precisam de complementação.

Os itens são ordenados por prazo quando essa informação está disponível.

**Como usar:**

1. Acesse `Pendências`.
2. Veja quantos itens precisam de atenção.
3. Abra o item pendente.
4. Leia a descrição do documento.
5. Veja o prazo, quando exibido.
6. Leia a observação do auditor, se houver.
7. Anexe ou reenvie o PDF.

## 9. Itens solicitados

Cada item solicitado mostra as informações necessárias para o envio correto.

Campos que podem aparecer:

| Campo | Significado |
|---|---|
| Documento solicitado | Nome ou descrição do documento que deve ser enviado |
| Tipo de documento | Categoria do documento solicitada pela auditoria |
| Obrigatório | Indica se o item precisa obrigatoriamente de resposta |
| Situação | Status atual do item |
| Prazo | Data limite para envio, quando preenchida |
| Código MCSE | Conta ou agrupamento relacionado, quando aplicável |
| Instruções ao cliente | Orientações da auditoria para preparar o documento |
| Como emitir no sistema | Trilha de emissão em ERP, quando configurada |

Observação: inferido a partir do código.

## 10. Como interpretar status

Os nomes abaixo foram identificados no código. Os nomes exatos dos status devem ser validados no ambiente real.

### Status da solicitação

| Status exibido | Significado para o cliente | Ação esperada |
|---|---|---|
| Em preparação | A solicitação ainda está sendo preparada pela auditoria | Aguardar liberação/orientação da auditoria |
| Revisada | A solicitação foi revisada internamente | Aguardar envio/liberação pela auditoria |
| Aguardando envio | Há documentos aguardando resposta do cliente | Abrir a solicitação e enviar os documentos |
| Parcialmente atendida | Parte dos itens foi respondida | Enviar o que ainda estiver pendente |
| Respondida | A solicitação recebeu resposta | Acompanhar análise da auditoria |
| Atendida | A solicitação foi atendida | Nenhuma ação imediata, salvo nova orientação |
| Concluída | Solicitação concluída | Nenhuma ação imediata |
| Encerrada | Solicitação encerrada | Nenhuma ação imediata |
| Cancelada | Solicitação cancelada | Não enviar documentos, salvo orientação da auditoria |

### Status do item solicitado

| Status exibido | Significado para o cliente | Ação esperada |
|---|---|---|
| Aguardando envio | O item ainda não recebeu documento | Enviar o PDF solicitado |
| Em análise | Documento recebido e em análise pela auditoria | Aguardar retorno |
| Aceito | Documento aceito pela auditoria | Nenhuma ação imediata |
| Precisa complementar | Auditoria solicitou correção ou complemento | Ler observação e reenviar/complementar |
| Dispensado | Item dispensado pela auditoria | Nenhuma ação imediata |

### Status do documento enviado

| Status exibido | Significado para o cliente | Ação esperada |
|---|---|---|
| Enviado | Arquivo enviado ao sistema | Aguardar análise |
| Em análise | Arquivo em análise pela auditoria | Aguardar retorno |
| Aceito | Arquivo aceito pela auditoria | Nenhuma ação imediata |
| Necessita reenvio | Arquivo recusado | Enviar novo PDF corrigido |
| Complementar | Auditoria pediu complemento | Enviar complemento ou nova versão |

## 11. Como enviar documentos

**Caminhos possíveis:**

- `Minhas Solicitações` > abrir solicitação > item solicitado.
- `Pendências` > abrir item pendente.

**Passo a passo:**

1. Abra a solicitação ou pendência.
2. Localize o item solicitado.
3. Leia a descrição, instruções e prazo.
4. Clique em `Anexar PDF`.
5. Escolha o arquivo no computador.
6. Se necessário, preencha uma observação sobre o documento.
7. Aguarde a conclusão do envio.
8. Confira se o item mostra arquivo enviado.

**Regras observadas:**

- Apenas arquivos PDF são aceitos.
- O limite identificado no código é 20 MB por arquivo.
- Cada novo envio cria uma nova versão do documento.
- O documento enviado fica com status inicial `Enviado`.

Observação: inferido a partir do código.

## 12. Como substituir ou complementar documentos

Quando a auditoria recusa um documento ou pede complemento, o item aparece como pendente ou complementar.

**Passo a passo:**

1. Acesse `Pendências`.
2. Localize o item recusado ou complementar.
3. Leia a observação do auditor.
4. Prepare o arquivo correto.
5. Clique em `Reenviar documento`.
6. Se necessário, escreva uma observação.
7. Envie o novo PDF.
8. Confira se uma nova versão foi registrada.

O sistema mantém histórico de versões enviadas para o item.

Observação: inferido a partir do código.

## 13. Como acompanhar respostas enviadas

Após enviar um arquivo:

1. Abra a solicitação.
2. Localize o item.
3. Clique na área de arquivos enviados, quando disponível.
4. Confira a quantidade de arquivos enviados.
5. Verifique a versão, data e status de cada arquivo.
6. Abra o documento pelo botão de visualização, quando necessário.

O sistema gera um link temporário para visualização do documento.

Observação: inferido a partir do código.

## 14. Mensagens, instruções e prazos

Antes de enviar qualquer arquivo, leia:

- Instruções do próprio item.
- Instruções ao cliente.
- Orientações de emissão no ERP, quando exibidas.
- Observações gerais da solicitação.
- Prazo da solicitação.
- Prazo do item, quando existir.
- Observação do auditor em caso de recusa ou complementação.

Se a instrução não estiver clara, entre em contato com a equipe de auditoria antes de enviar documento incorreto.

## 15. Boas práticas para envio de documentos

- Envie arquivos legíveis.
- Evite fotos tremidas ou cortadas.
- Prefira PDF quando solicitado.
- Use Excel apenas se a auditoria orientar fora do upload atual, pois o portal identificado aceita PDF.
- Nomeie arquivos com clareza.
- Envie documentos completos.
- Observe o período ou competência solicitada.
- Evite enviar documentos duplicados.
- Responda dentro do prazo.
- Use o campo de observação para explicar exceções.
- Entre em contato com a auditoria em caso de dúvida.

## 16. O que o cliente não consegue acessar

O cliente não acessa:

- Lista interna de trabalhos.
- Planejamento da auditoria.
- Materialidade.
- Bases de materialidade.
- Matriz de riscos.
- PTA.
- Comentários internos.
- Revisão interna.
- QA.
- Alçadas.
- Dashboards internos.
- Cadastros internos.
- Balancetes internos.
- Procedimentos auxiliares internos.
- Dados de outros clientes.

O cliente também não aprova planejamento, materialidade, matriz de riscos, PTA ou QA, e não altera dados internos do trabalho.

## 17. Erros comuns e como tratar

| Situação | Causa provável | Ação recomendada |
|---|---|---|
| Não consigo acessar o portal | Usuário sem vínculo ativo com cliente ou senha incorreta | Conferir login e solicitar apoio da auditoria/administrador |
| Não vejo solicitações | Não há solicitação liberada para o cliente ou vínculo incorreto | Confirmar com a auditoria se existe solicitação para sua empresa |
| O arquivo não carrega | Arquivo não é PDF, excede 20 MB ou houve falha de conexão | Converter para PDF, reduzir tamanho e tentar novamente |
| Enviei arquivo errado | Documento foi anexado em item incorreto ou conteúdo não corresponde | Avisar a auditoria e reenviar versão correta quando necessário |
| O prazo está vencido | Resposta não foi enviada dentro do prazo | Entrar em contato com a auditoria e enviar o documento assim que possível |
| Não sei qual documento enviar | Instrução insuficiente ou dúvida sobre período/competência | Ler instruções e solicitar esclarecimento à auditoria |
| O sistema mostra pendência mesmo após envio | Documento pode estar em análise, recusado ou com complemento solicitado | Verificar status e observação do auditor |
| Documento foi rejeitado | Arquivo ilegível, incompleto, incorreto ou fora do período | Ler observação do auditor e reenviar documento corrigido |
| Complementação solicitada | Auditoria precisa de informação adicional | Enviar complemento ou nova versão conforme orientação |

## 18. Checklist do cliente antes de enviar documentos

Antes de enviar:

- [ ] Li as instruções da solicitação?
- [ ] Li as instruções do item?
- [ ] O documento pertence ao período solicitado?
- [ ] O arquivo está legível?
- [ ] O arquivo está completo?
- [ ] O formato está adequado?
- [ ] O arquivo está em PDF?
- [ ] O arquivo tem até 20 MB?
- [ ] O nome do arquivo é claro?
- [ ] Preenchi observação quando necessário?
- [ ] Conferi se o upload concluiu?
- [ ] Verifiquei se ainda há pendências?

## 19. Limitações atuais

- O portal identificado aceita PDF para upload de documentos.
- A política final de formato e tamanho deve ser validada pela equipe administradora.
- Não foi identificada automação formal de notificação de prazos nesta etapa.
- Os nomes exatos dos status devem ser validados no ambiente real.
- O isolamento entre clientes deve ser validado por testes no ambiente real.
- Links de documentos são temporários para visualização.
- Funcionalidades internas de auditoria não fazem parte da Área do Cliente.
