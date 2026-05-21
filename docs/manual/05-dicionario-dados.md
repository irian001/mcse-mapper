# Dicionario de Dados Inicial

Este dicionario e inicial e foi criado a partir do codigo, migrations e SQLs locais.

Observacao: inferido a partir do codigo. Deve ser validado contra o Supabase real.

## Base cadastral

### `clientes`

- Finalidade: cadastro de clientes auditados.
- Modulo: clientes, trabalhos, portal, balancetes, solicitacoes, procedimentos.
- Principais campos: `id`, `razao_social`, `nome_fantasia`, `cnpj`, `segmento`, `segmento_id`, `status`, endereco e contato.
- Relacao principal: pai de exercicios, trabalhos, usuarios cliente e parametrizacoes.
- RLS: leitura filtrada para `cliente_usuario`; escrita depende de policies por perfil.

### `exercicios`

- Finalidade: exercicios por cliente.
- Modulo: clientes, trabalhos, balancetes, PTA, solicitacoes.
- Principais campos: `cliente_id`, `ano_exercicio`, `data_inicio`, `data_fim`, `status`.
- Relacao principal: pertence a `clientes`.
- RLS: cliente acessa exercicios do proprio cliente.

### `auditores`

- Finalidade: cadastro da equipe de auditoria.
- Modulo: auditores, trabalhos, planejamento, riscos, empresa.
- Principais campos: `nome`, `email`, `cargo`, `perfil`, `perfil_acesso`, `auth_user_id`, `ativo`.
- Relacao principal: vincula usuario Auth e equipe de trabalhos.
- RLS: admin possui escrita ampla; usuario pode ter autoedicao limitada.

### `cliente_usuarios`

- Finalidade: usuarios externos vinculados a clientes.
- Modulo: portal cliente e administracao.
- Principais campos: `cliente_id`, `auth_user_id`, `nome`, `email`, `ativo`.
- Relacao principal: pertence a `clientes`.
- RLS: cliente deve acessar apenas usuarios do proprio cliente.

### `empresa_auditoria`

- Finalidade: dados cadastrais da empresa de auditoria.
- Modulo: empresa de auditoria.
- Principais campos: razao social, CNPJ, endereco, contatos, registros profissionais, auditor responsavel.
- Relacao principal: referencia `auditores`.
- RLS: escrita admin conforme migrations identificadas.

### `produtos_auditoria`

- Finalidade: catalogo de produtos/servicos de auditoria.
- Modulo: produtos, contratos, trabalhos.
- Principais campos: codigo, nome, categoria, segmento, subtipo, complexidade, risco, horas base, ativo.
- Relacao principal: usado em `contrato_produtos`.
- RLS: escrita admin identificada.

## Trabalhos

### `trabalhos_auditoria`

- Finalidade: cabecalho do trabalho de auditoria.
- Modulo: trabalhos, planejamento, balancetes, PTA, solicitacoes, procedimentos.
- Principais campos: `cliente_id`, `exercicio_id`, `nome_trabalho`, datas, `status_trabalho`, contrato/produto, controle de horas.
- Relacao principal: pertence a cliente/exercicio e concentra os objetos operacionais.
- RLS: acesso por admin ou trabalho acessivel; cliente tem leitura filtrada.

### `trabalho_auditores`

- Finalidade: equipe vinculada ao trabalho.
- Modulo: trabalhos/equipe, RLS.
- Principais campos: `trabalho_auditoria_id`, `auditor_id`, `papel_no_trabalho`, `responsavel_principal`, `ativo`.
- Relacao principal: tabela de vinculo entre trabalhos e auditores.
- RLS: usada por `get_accessible_trabalho_ids`.

### `contratos`

- Finalidade: contratos por cliente.
- Modulo: contratos e trabalhos.
- Principais campos observados no frontend: cliente, numero, descricao, datas, valor, tipo contratacao, forma pagamento, gestor, status.
- Relacao principal: pertence a cliente; pode ser associado a trabalhos.
- Observacao: tabela usada pelo codigo, mas `CREATE TABLE` local nao foi encontrado.

### `contrato_produtos`

- Finalidade: produtos vinculados a contrato.
- Modulo: contratos e trabalhos.
- Principais campos observados: contrato, produto, horas previstas, horas limite, quantidade, obrigatoriedade, ativo.
- Relacao principal: vinculo entre `contratos` e `produtos_auditoria`.
- Observacao: tabela usada pelo codigo, mas `CREATE TABLE` local nao foi encontrado.

## Planejamento, materialidade e riscos

### `trabalho_planejamento`

- Finalidade: planejamento do trabalho.
- Modulo: planejamento.
- Principais campos: objetivo, escopo, estrategia, responsavel, status, aprovador, premissas, limitacoes.
- Relacao principal: pertence a `trabalhos_auditoria`, `clientes`, `exercicios`.
- RLS: SQL manual define acesso por admin ou trabalho acessivel, bloqueando cliente.

### `trabalho_materialidade`

- Finalidade: materialidade do trabalho.
- Modulo: materialidade.
- Principais campos: base_calculo, percentual, materialidade_global, desempenho, trivialidade, justificativa, status, versao, vigente.
- Relacao principal: pertence ao trabalho; pode ter materialidade anterior.
- RLS: SQL manual define acesso por admin ou trabalho acessivel, bloqueando cliente.

### `trabalho_materialidade_bases`

- Finalidade: bases especificas de materialidade.
- Modulo: bases de materialidade e PTA.
- Principais campos: materialidade, trabalho, nome_base, balancete, linha, snapshots, criterio, percentual, valor, ativo.
- Relacao principal: filha de `trabalho_materialidade`; opcionalmente vinculada a `balancetes` e `balancete_linhas`.
- RLS: SQL manual define acesso por admin ou trabalho acessivel.

### `trabalho_riscos_auditoria`

- Finalidade: matriz de riscos do trabalho.
- Modulo: matriz de riscos.
- Principais campos: area, conta MCSE, assertiva, risco, tipo, causa, impacto, probabilidade, nivel, resposta, responsavel, status, revisao.
- Relacao principal: pertence ao trabalho; pode referenciar `mcse_contas` e `auditores`.
- RLS: SQL manual define acesso por admin ou trabalho acessivel; cliente bloqueado.

## MCSE, plano e regras

### `mcse_grupos`, `mcse_subgrupos`, `mcse_contas`

- Finalidade: estrutura de referencia contabil.
- Modulo: MCSE, mapeamento, regras, balancetes e PTA.
- Principais campos: codigos, descricoes, natureza, nivel, conta critica, ativo, estrutura_id.
- Relacao principal: grupos contem subgrupos e contas.
- RLS: leitura autenticada; escrita geralmente admin.

### `cliente_contas_origem`

- Finalidade: plano de contas do cliente.
- Modulo: plano de contas, mapeamento, balancetes.
- Principais campos: cliente, id/codigo conta, descricao, classificacao, analitica, grau, status mapeamento.
- Relacao principal: pertence a cliente e se mapeia para MCSE.
- RLS: cliente filtrado por `cliente_id`; escrita por auditor/admin conforme policies.

### `cliente_mapeamento_mcse`

- Finalidade: vinculo entre conta origem e conta MCSE.
- Modulo: mapeamento.
- Principais campos: cliente, conta_origem, conta_mcse, tipo, confianca, homologado, observacao.
- Relacao principal: vincula `cliente_contas_origem` a `mcse_contas`.
- RLS: cliente filtrado por `cliente_id`; escrita por auditor/admin.

### `mcse_regras_conta`

- Finalidade: regras por conta MCSE.
- Modulo: regras e solicitacoes.
- Principais campos: conta_mcse, materialidade padrao, limites, flags, codigo_mcse, descricao_mcse, conta_critica, gera_solicitacao_automatica, ativo.
- Relacao principal: pai de documentos, instrucoes e trilhas ERP.
- RLS: leitura autenticada; escrita admin.

### `mcse_regras_documentos`

- Finalidade: documentos solicitaveis por regra.
- Modulo: regras e solicitacoes.
- Principais campos: regra_mcse, conta_mcse, tipo_documento, descricao_documento, obrigatorio, ordem, formato, ativo.
- Relacao principal: filha de `mcse_regras_conta`.
- RLS: leitura autenticada; escrita admin.

### `mcse_regras_instrucoes`

- Finalidade: instrucoes ao cliente/auditor por regra.
- Modulo: regras, solicitacoes e portal.
- Principais campos: regra_mcse, titulo, texto, publico_alvo, ordem, ativo.
- Relacao principal: filha de `mcse_regras_conta`.
- RLS: leitura autenticada; escrita admin.

### `mcse_regras_emissao_erp`

- Finalidade: trilhas de emissao em ERP por regra.
- Modulo: regras, solicitacoes e portal.
- Principais campos: ERP, relatorio, modulo, caminho, filtros, campos minimos, formato, ordem.
- Relacao principal: filha de `mcse_regras_conta`.
- RLS: leitura autenticada; escrita admin.

## Balancetes e PTA

### `balancetes`

- Finalidade: cabecalho de importacao de balancete.
- Modulo: balancetes.
- Principais campos: trabalho, cliente, exercicio, arquivo, tipo, totais, status_importacao.
- Relacao principal: pai de `balancete_linhas`.
- RLS: cliente tem leitura filtrada; escrita por auditor/admin com trabalho acessivel.

### `balancete_linhas`

- Finalidade: linhas importadas do balancete.
- Modulo: balancetes, PTA, solicitacoes.
- Principais campos: contas, saldos, variacao, MCSE, status de mapeamento, validacao, comentarios, pendencias, severidade.
- Relacao principal: filha de `balancetes`; pode ser vinculada a PTA e documentos.
- RLS: cliente tem leitura filtrada; escrita por auditor/admin.

### `documentos_referencia_balancete`

- Finalidade: documentos de referencia anexados a linha do balancete.
- Modulo: balancetes e PTA.
- Principais campos: linha, trabalho, cliente, exercicio, arquivo, caminho, upload, ativo.
- Relacao principal: filha de `balancete_linhas`.
- RLS: storage e tabela com restricoes por trabalho/cliente.

### `papeis_trabalho`

- Finalidade: PTA por trabalho/conta.
- Modulo: PTA.
- Principais campos: trabalho, cliente, exercicio, conta MCSE, saldos, diferencas, status, comentarios, conclusoes, materialidade, fechado.
- Relacao principal: pai de `papel_trabalho_linhas`; pode referenciar base de materialidade.
- RLS: cliente tem leitura filtrada; escrita por auditor/admin.

### `papel_trabalho_linhas`

- Finalidade: linhas do balancete vinculadas ao PTA.
- Modulo: PTA e balancetes.
- Principais campos: papel_trabalho, balancete_linha, trabalho, saldos e snapshots.
- Relacao principal: vinculo entre PTA e linha do balancete.
- RLS: derivada por trabalho.

## Solicitacoes

### `solicitacoes_documentos`

- Finalidade: cabecalho de solicitacao documental ao cliente.
- Modulo: solicitacoes e portal.
- Principais campos: trabalho, cliente, exercicio, titulo, origem, prazo, status, observacoes.
- Relacao principal: pai de `solicitacao_itens`.
- RLS: cliente acessa solicitacoes do proprio cliente.

### `solicitacao_itens`

- Finalidade: itens/documentos solicitados.
- Modulo: solicitacoes e portal.
- Principais campos: solicitacao, regra MCSE, conta MCSE, tipo, descricao, instrucoes, prazo, obrigatorio, status.
- Relacao principal: filha de `solicitacoes_documentos`.
- RLS: cliente atualiza itens do proprio cliente dentro da policy observada.

### `solicitacao_item_documentos`

- Finalidade: documentos enviados por item.
- Modulo: portal cliente e auditoria documental.
- Principais campos: item, nome_arquivo, url, uploaded_by, status_documento, observacoes, versao.
- Relacao principal: filha de `solicitacao_itens`.
- RLS: cliente pode inserir/atualizar documentos do proprio cliente; auditor/admin conforme trabalho.

### `balancete_linha_documentos`

- Finalidade: vinculo entre documento recebido e linha do balancete.
- Modulo: solicitacoes e balancetes.
- Principais campos: balancete_linha, documento, trabalho, cliente, valor, tipo_vinculo, aceito.
- Relacao principal: vinculo entre `balancete_linhas` e `solicitacao_item_documentos`.
- RLS: escrita por auditor/admin conforme trabalho.

## Procedimentos auxiliares

### `procedimentos_auxiliares`

- Finalidade: cabecalho de procedimento auxiliar.
- Modulo: procedimentos.
- Principais campos observados: trabalho, cliente, exercicio, tipo, titulo, datas, conta MCSE, responsaveis, status, conclusoes.
- Relacao principal: pai de procedimentos especificos.
- Observacao: tabela usada pelo codigo, mas `CREATE TABLE` local nao foi encontrado.

### `procedimento_auxiliar_documentos`

- Finalidade: evidencias/documentos anexados a procedimento.
- Modulo: procedimentos.
- Principais campos observados: procedimento, tipo_documento, arquivo, url, upload, observacao, status.
- Relacao principal: filha de `procedimentos_auxiliares`.
- Observacao: tabela usada pelo codigo, mas `CREATE TABLE` local nao foi encontrado.

### `procedimento_contagem_caixa_itens`

- Finalidade: caixas contados em procedimento de caixa.
- Modulo: contagem de caixa.
- Principais campos observados: procedimento, identificacao do caixa, local, responsavel, valor informado, valor contado, diferenca.
- Relacao principal: filha de `procedimentos_auxiliares`.
- Observacao: tabela usada pelo codigo, mas `CREATE TABLE` local nao foi encontrado.

### `procedimento_contagem_caixa_detalhes`

- Finalidade: cedulas/moedas por item de caixa.
- Modulo: contagem de caixa.
- Principais campos observados: item de caixa, tipo, denominacao, quantidade, valor total.
- Relacao principal: filha de `procedimento_contagem_caixa_itens`.
- Observacao: tabela usada pelo codigo, mas `CREATE TABLE` local nao foi encontrado.

### `procedimento_contagem_estoque_blocos`

- Finalidade: blocos de contagem de estoque.
- Modulo: contagem de estoque.
- Principais campos: procedimento, filial, setor, tipo, categoria, descricao, responsavel, datas.
- Relacao principal: filha de `procedimentos_auxiliares`.
- RLS: SQL manual define policies; cliente bloqueado conforme padrao.

### `procedimento_contagem_estoque_itens`

- Finalidade: itens contados em estoque.
- Modulo: contagem de estoque.
- Principais campos: bloco, codigo, descricao, unidade, quantidades, valores, diferencas, status, contado.
- Relacao principal: filha de `procedimento_contagem_estoque_blocos`.
- RLS: SQL manual define policies.

### `cliente_classes_faturamento`

- Finalidade: cadastro auxiliar de classes para faturas em aberto.
- Modulo: faturas em aberto.
- Principais campos: cliente, codigo, descricao, grupo, ativo.
- Relacao principal: pertence a cliente.
- RLS: cliente_usuario bloqueado na etapa identificada.

### `cliente_municipios_faturamento`

- Finalidade: cadastro auxiliar de municipios para faturas em aberto.
- Modulo: faturas em aberto.
- Principais campos: cliente, codigo municipio, nome, UF, IBGE, regional, ativo.
- Relacao principal: pertence a cliente.
- RLS: cliente_usuario bloqueado na etapa identificada.

### `procedimento_faturas_aberto_lotes`

- Finalidade: lotes de importacao de faturas.
- Modulo: faturas em aberto.
- Principais campos: procedimento, cliente, trabalho, arquivo, totais, status, mapeamento, metadata.
- Relacao principal: pai de `procedimento_faturas_aberto_itens`.
- RLS: SQL manual bloqueia cliente_usuario nesta etapa.

### `procedimento_faturas_aberto_itens`

- Finalidade: faturas/titulos importados.
- Modulo: faturas em aberto.
- Principais campos: procedimento, lote, UC, consumidor, fatura/documento, datas, valor em aberto, aging, classe, municipio.
- Relacao principal: filha de lote e procedimento.
- RLS: SQL manual bloqueia cliente_usuario nesta etapa.

## Portal cliente

O portal usa principalmente:

- `cliente_usuarios`
- `solicitacoes_documentos`
- `solicitacao_itens`
- `solicitacao_item_documentos`
- bucket `solicitacao-documentos`

## Storage

### `documentos-balancete`

- Finalidade: documentos de referencia de balancete e documentos de procedimentos.
- Modulo: balancetes, PTA e procedimentos.
- RLS/storage: policies usam `can_access_storage_doc` em migrations recentes.

### `solicitacao-documentos`

- Finalidade: PDFs enviados pelo cliente em solicitacoes.
- Modulo: portal cliente e solicitacoes.
- RLS/storage: policies usam `can_access_sol_storage_doc`.
