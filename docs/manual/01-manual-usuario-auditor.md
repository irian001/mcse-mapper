# Manual do Usuario Auditor

Este documento descreve o uso operacional inicial do sistema pelo auditor interno.

Observacao: inferido a partir do codigo.

## Login

1. Acesse a tela inicial do sistema.
2. Informe email e senha.
3. O sistema identifica se o usuario esta vinculado a um auditor.
4. Se nao houver vinculo, sera exibida mensagem de acesso nao configurado.

## Dashboard

1. Acesse `Dashboard`.
2. Consulte indicadores de clientes, auditores, trabalhos, solicitacoes e itens pendentes.
3. Use os atalhos para navegar aos principais modulos.

## Clientes

1. Acesse `Cadastros > Clientes`.
2. Cadastre ou edite dados do cliente.
3. Registre exercicios vinculados ao cliente.
4. Configure parametros do cliente quando aplicavel.

## Auditores

1. Acesse `Cadastros > Auditores`.
2. Consulte a equipe cadastrada.
3. Cadastre novos auditores quando tiver permissao.
4. Defina cargo, perfil de acesso e status ativo.
5. Vincule o auditor a um usuario de autenticacao quando necessario.

## Trabalhos

1. Acesse `Trabalhos > Trabalhos de Auditoria`.
2. Clique em novo trabalho.
3. Selecione cliente e exercicio.
4. Informe nome, descricao, datas e status.
5. Quando aplicavel, selecione contrato e produto contratado.
6. Salve o trabalho.

## Equipe do trabalho

1. Na lista de trabalhos, abra a gestao de equipe.
2. Adicione auditores ao trabalho.
3. Defina o papel no trabalho: elaborador, revisor, gerente ou socio.
4. Marque o responsavel principal quando aplicavel.

## Planejamento

1. Abra o dialogo de planejamento a partir do trabalho.
2. Preencha objetivo geral, escopo, estrategia, premissas e limitacoes.
3. Salve como rascunho.
4. Quando os campos obrigatorios estiverem preenchidos, aprove o planejamento se tiver alcada.

Observacao: a alcada de aprovacao foi identificada no frontend. A validacao equivalente em RLS precisa ser confirmada.

## Materialidade

1. Abra a aba de materialidade no planejamento do trabalho.
2. Defina base de calculo, percentual aplicado e valores.
3. Registre justificativa tecnica e observacoes.
4. Salve como rascunho.
5. Aprove quando os valores estiverem consistentes e o usuario tiver alcada.

## Bases de materialidade

1. Acesse o painel de bases dentro da materialidade.
2. Cadastre ate tres bases ativas, conforme a regra atual observada.
3. Use valor manual ou selecione linha do balancete quando disponivel.
4. Confirme snapshots de conta, saldo, percentual e valor.

Observacao: inferido a partir do codigo.

## Matriz de riscos

1. Abra a aba de riscos no planejamento.
2. Cadastre risco por area/ciclo, conta MCSE, assertiva e descricao do risco.
3. Informe probabilidade, impacto, nivel de risco, tipo de risco e resposta planejada.
4. Defina responsavel e status.

Ainda nao implementado: vinculo formal do risco com PTA, procedimento, solicitacao, evidencia ou base de materialidade.

## Balancetes

1. Acesse `Trabalhos > Balancetes`.
2. Inicie a importacao.
3. Selecione trabalho, tipo de balancete e arquivo.
4. Mapeie colunas.
5. Revise a pre-visualizacao.
6. Confirme a importacao.
7. Valide linhas, saldos, diferencas, pendencias e documentos.

## PTA

1. Acesse `Trabalhos > Papeis de Trabalho`.
2. Gere PTA automaticamente por conta MCSE ou crie manualmente.
3. Vincule linhas do balancete.
4. Se aplicavel, selecione base de materialidade aprovada.
5. Registre comentarios, conclusoes e status.
6. Feche o PTA quando a analise estiver concluida.

## Solicitacoes documentais

1. Acesse `Solicitacoes > Solicitacoes`.
2. Gere solicitacao a partir de um trabalho com balancete e regras aplicaveis.
3. Revise os itens gerados.
4. Salve como rascunho.
5. Marque como revisada quando aplicavel.
6. Gere PDF/HTML para envio ou registro.
7. Acompanhe documentos enviados pelo cliente.
8. Analise documentos como aceito, recusado, complementar ou em analise.
9. Quando aceito, vincule o documento a linhas do balancete quando aplicavel.

## Procedimentos auxiliares

1. Acesse `Procedimentos`.
2. Escolha o tipo: caixa, estoque, faturas em aberto ou outro.
3. Crie o cabecalho do procedimento.
4. Abra o detalhe.
5. Use a aba de execucao do tipo selecionado.
6. Anexe evidencias.
7. Registre conclusao preliminar, final e status.

## Faturas em aberto

1. Crie procedimento do tipo `faturas_em_aberto`.
2. Abra a execucao do procedimento.
3. Importe arquivo CSV, XLS ou XLSX.
4. Mapeie colunas obrigatorias.
5. Corrija erros antes de importar.
6. Revise alertas, lotes, itens, classes e municipios.
7. Use o dashboard para analisar aging, situacao, classe e valores.

## Limitacoes para o auditor

- Algumas telas dependem de tabelas ou colunas criadas por SQL manual.
- Certos recursos usam tolerancia a ambientes legados.
- Ordens de compra e ordens de imobilizacao aparecem no hub, mas a execucao especifica ainda nao foi encontrada como implementada.
