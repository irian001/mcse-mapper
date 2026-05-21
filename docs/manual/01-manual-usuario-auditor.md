# Manual do Usuário Auditor

Este manual descreve o uso operacional do sistema pelo auditor interno. O foco é orientar a execução diária dos trabalhos de auditoria, sem substituir a validação técnica do banco, das permissões e das políticas de RLS.

Observação: inferido a partir do código e do inventário técnico-funcional da Fase D.1.

## 1. Objetivo do manual

Orientar o auditor no uso dos módulos atuais do sistema: clientes, auditores, trabalhos, equipe, planejamento, materialidade, bases de materialidade, matriz de riscos, balancetes, PTA, solicitações documentais, portal do cliente, procedimentos auxiliares e faturas em aberto.

Este documento separa funcionalidade atual de limitações e backlog. Quando uma regra depender de confirmação no Supabase real, ela é marcada como observação ou limitação.

## 2. Público-alvo

- Auditores internos que executam trabalhos de auditoria.
- Seniors, gerentes, sócios e administradores que revisam, aprovam ou acompanham trabalhos.
- Usuários responsáveis por gerar PTA, solicitações e procedimentos auxiliares.

Perfis de cliente não são o foco deste manual. O acesso do cliente está descrito em `02-manual-usuario-cliente.md`.

## 3. Visão geral do fluxo do auditor

O fluxo operacional esperado é:

1. Cadastrar ou consultar cliente e exercício.
2. Cadastrar ou consultar auditores.
3. Criar o trabalho de auditoria.
4. Vincular a equipe do trabalho.
5. Abrir e preencher o planejamento.
6. Definir materialidade.
7. Cadastrar bases de materialidade.
8. Registrar matriz de riscos.
9. Importar ou consultar balancetes.
10. Gerar ou editar PTA.
11. Gerar e acompanhar solicitações documentais.
12. Acompanhar respostas do cliente.
13. Executar procedimentos auxiliares, quando aplicável.
14. Analisar faturas em aberto, quando o procedimento for desse tipo.

Observação: o sistema já possui os módulos principais desse fluxo, mas algumas integrações entre riscos, PTA, solicitações e evidências ainda não estão formalmente implementadas.

## 4. Acesso ao sistema

**Caminho:** tela inicial de login.

**Objetivo:** autenticar o usuário e direcioná-lo para a área compatível com seu perfil.

**Passo a passo:**

1. Abra o sistema.
2. Informe e-mail e senha.
3. Confirme o acesso.
4. Verifique se o sistema abriu o painel correto.

**Validações importantes:**

- O usuário precisa existir na autenticação.
- O usuário auditor precisa estar vinculado a um cadastro de auditor.
- O usuário cliente precisa estar vinculado a um cliente.

**Resultado esperado:** auditor autenticado acessa os módulos internos permitidos.

**Limitações atuais:** a matriz completa de permissões ainda precisa ser validada contra a RLS real do Supabase.

## 5. Dashboard inicial

**Caminho:** `Dashboard`.

**Objetivo:** consultar visão geral dos cadastros e atividades.

**Uso operacional:**

1. Acesse o dashboard após o login.
2. Verifique indicadores de clientes, auditores, trabalhos, solicitações e pendências.
3. Use os atalhos ou menus laterais para navegar aos módulos.

**Limitações atuais:** os indicadores devem ser validados por perfil, principalmente para auditor sem vínculo ao trabalho e `cliente_usuario`.

## 6. Cadastro e consulta de clientes

**Caminho:** `Cadastros > Clientes`.

**Objetivo:** manter a base de clientes usada nos trabalhos, solicitações, balancetes e portal.

**Quando usar:**

- Antes de criar um trabalho para cliente novo.
- Para revisar dados cadastrais.
- Para consultar exercícios e parâmetros vinculados.

**Passo a passo:**

1. Acesse a tela de clientes.
2. Pesquise o cliente existente ou crie um novo cadastro.
3. Informe os dados cadastrais exigidos pela tela.
4. Registre ou confira os exercícios vinculados.
5. Salve as alterações.

**Campos principais:** identificação do cliente, dados cadastrais, status, exercícios e parâmetros relacionados.

**Resultado esperado:** cliente disponível para criação de trabalhos e vínculos com usuários do portal.

**Observação:** inferido a partir do código. Os campos exatos podem variar conforme a tela e o schema real.

## 7. Cadastro e consulta de auditores

**Caminho:** `Cadastros > Auditores`.

**Objetivo:** manter a equipe interna que pode ser vinculada aos trabalhos.

**Quando usar:**

- Para cadastrar novo auditor.
- Para alterar cargo, perfil, status ou vínculo de autenticação.
- Para consultar auditores disponíveis para equipe do trabalho.

**Passo a passo:**

1. Acesse a tela de auditores.
2. Pesquise o auditor existente ou crie um novo.
3. Informe nome, e-mail, cargo/perfil e status.
4. Vincule o cadastro ao usuário de autenticação, quando necessário.
5. Salve.

**Validações importantes:**

- O auditor precisa estar ativo para ser usado operacionalmente.
- O vínculo com autenticação é essencial para permissões por usuário.

**Limitações atuais:** permissões por perfil e RLS precisam ser testadas no Supabase real.

## 8. Trabalhos de auditoria

O trabalho de auditoria é o centro do fluxo. A partir dele são vinculados equipe, planejamento, materialidade, riscos, balancetes, PTA, solicitações e procedimentos.

### Fluxo A - Criar ou editar trabalho de auditoria

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` |
| Objetivo | Criar ou manter o registro do trabalho de auditoria |
| Quando usar | No início de um novo trabalho ou quando dados do trabalho precisarem de ajuste |

**Passo a passo:**

1. Acesse a tela de trabalhos.
2. Clique na ação de novo trabalho ou edição.
3. Selecione o cliente.
4. Selecione o exercício.
5. Informe nome e descrição do trabalho.
6. Informe datas e status, quando a tela solicitar.
7. Se aplicável, selecione contrato e produto.
8. Revise observações e parâmetros adicionais.
9. Salve.

**Campos principais:**

- Cliente.
- Exercício.
- Nome do trabalho.
- Descrição.
- Datas.
- Status.
- Contrato e produto, quando existirem.
- Controle de horas, quando habilitado.
- Observações.

**Status conhecidos do trabalho:**

- `planejado`
- `iniciado`
- `em_execucao`
- `revisao_1`
- `revisao_2`
- `finalizado_para_parecer`
- `encerrado`

Observação: inferido a partir do código.

**Validações importantes:**

- Trabalho deve estar vinculado a cliente e exercício.
- Contrato e produto dependem de cadastro prévio.
- Alterações em status podem impactar acompanhamento operacional.

**Resultado esperado:** trabalho salvo e disponível para equipe, planejamento, balancetes, PTA, solicitações e procedimentos.

**Limitações atuais:** regras finais de status e transições ainda não estão formalizadas como workflow completo.

## 9. Equipe do trabalho

### Fluxo B - Vincular equipe ao trabalho

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > ação de equipe do trabalho |
| Objetivo | Definir auditores responsáveis pela execução, revisão e gestão do trabalho |
| Quando usar | Após criar o trabalho e antes de aprovar planejamento ou executar atividades críticas |

**Passo a passo:**

1. Abra o trabalho.
2. Acesse a gestão de equipe.
3. Adicione um auditor.
4. Defina o papel no trabalho.
5. Marque responsável principal, quando aplicável.
6. Salve.

**Papéis identificados:**

- `elaborador`
- `revisor_1`
- `revisor_2`
- `gerente`
- `socio`

Observação: inferido a partir do código.

**Campos principais:** auditor, papel, responsável principal, status do vínculo.

**Validações importantes:**

- O auditor deve existir no cadastro.
- A aprovação de planejamento por perfil senior depende do vínculo como responsável principal, conforme regra observada no frontend.

**Resultado esperado:** equipe vinculada ao trabalho.

**Limitações atuais:** regras de alçada precisam ser validadas no banco/RLS, não apenas na interface.

## 10. Planejamento do trabalho

O planejamento registra o objetivo, escopo, estratégia, premissas e responsáveis do trabalho. Ele deve ser preenchido antes da execução mais aprofundada do PTA, matriz de riscos e solicitações.

### Fluxo C - Abrir Planejamento do Trabalho

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > ação de planejamento |
| Objetivo | Abrir o diálogo/painel de planejamento do trabalho selecionado |
| Quando usar | Após criar o trabalho e vincular equipe |

**Passo a passo:**

1. Localize o trabalho.
2. Abra a ação de planejamento.
3. Verifique se o painel mostra planejamento, materialidade, bases e riscos.
4. Confira o status atual do planejamento.

**Resultado esperado:** tela de planejamento disponível para edição ou consulta.

### Fluxo D - Criar ou editar Planejamento

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` |
| Objetivo | Registrar o planejamento operacional do trabalho |
| Quando usar | Antes de aprovação e antes de iniciar execução estruturada |

**Passo a passo:**

1. Abra o planejamento do trabalho.
2. Preencha objetivo geral da auditoria.
3. Preencha escopo resumido.
4. Preencha estratégia resumida.
5. Registre premissas, limitações e observações quando aplicável.
6. Selecione responsável/equipe responsável.
7. Salve como rascunho.

**Campos principais:**

- Objetivo geral da auditoria.
- Escopo resumido.
- Estratégia resumida.
- Premissas.
- Limitações.
- Responsável/equipe responsável.
- Status do planejamento.

**Validações importantes:**

- Para aprovação, objetivo, escopo, estratégia e responsável são obrigatórios.
- Planejamento aprovado tende a ficar bloqueado para edição direta.

**Resultado esperado:** planejamento salvo como `rascunho` ou atualizado.

**Limitações atuais:** regras formais de nova versão de planejamento não foram identificadas como fluxo completo.

### Fluxo E - Aprovar Planejamento

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > ação de aprovação |
| Objetivo | Marcar o planejamento como aprovado |
| Quando usar | Quando o planejamento estiver completo e revisado |

**Passo a passo:**

1. Abra o planejamento.
2. Confira campos obrigatórios.
3. Confirme objetivo, escopo, estratégia e responsável.
4. Acione a aprovação.
5. Confirme a operação.

**Validações importantes:**

- O planejamento precisa estar em `rascunho`.
- Usuários `admin`, `socio` e `gerente` possuem alçada observada no frontend.
- Perfil `senior` pode aprovar somente quando for responsável principal do trabalho.

Observação: inferido a partir do código. A validação equivalente em RLS precisa ser confirmada.

**Resultado esperado:** planejamento muda para `aprovado`, com registro de aprovador e data.

**Limitações atuais:** workflow de revisão com eventos, notas e gates ainda não está implementado.

## 11. Materialidade

Materialidade é o conjunto de parâmetros usado para orientar a relevância dos saldos, análises e possíveis diferenças no trabalho.

**Conceitos principais:**

| Conceito | Uso operacional |
|---|---|
| Materialidade global | Valor de referência geral para o trabalho |
| Materialidade de desempenho | Valor mais restritivo usado para orientar execução e seleção |
| Trivialidade | Limite para diferenças consideradas pequenas no contexto do trabalho |

### Fluxo F - Criar Materialidade

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > `Materialidade` |
| Objetivo | Registrar parâmetros de materialidade do trabalho |
| Quando usar | Após definir o planejamento e antes de usar bases no PTA |

**Passo a passo:**

1. Abra o planejamento do trabalho.
2. Acesse a área de materialidade.
3. Informe base de cálculo.
4. Informe percentual aplicado.
5. Informe materialidade global.
6. Informe materialidade de desempenho.
7. Informe limite de trivialidade.
8. Registre justificativa técnica.
9. Selecione responsável pela definição.
10. Salve como rascunho.

**Campos principais:**

- Base de cálculo.
- Percentual aplicado.
- Materialidade global.
- Materialidade de desempenho.
- Limite de trivialidade.
- Justificativa técnica.
- Responsável pela definição.
- Observações.

**Validações importantes:**

- Valores numéricos devem ser válidos.
- Justificativa técnica e responsável são exigidos para aprovação.
- A criação de nova versão quando já existe materialidade vigente é tratada como limitação atual.

**Resultado esperado:** materialidade salva como `rascunho`.

### Fluxo H - Aprovar Materialidade

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > `Materialidade` > ação de aprovação |
| Objetivo | Tornar a materialidade aprovada e vigente |
| Quando usar | Quando valores, base e justificativa técnica estiverem revisados |

**Passo a passo:**

1. Abra a materialidade em rascunho.
2. Confirme base de cálculo, valores e justificativa.
3. Confirme responsável pela definição.
4. Revise as bases de materialidade, se existirem.
5. Acione a aprovação.
6. Confirme a operação.

**Validações importantes:**

- A materialidade precisa estar em `rascunho`.
- Não pode existir outra materialidade vigente para o mesmo trabalho.
- Perfis `admin`, `socio` e `gerente` possuem alçada observada no frontend.
- A aprovação pode alertar quando não houver bases específicas cadastradas.

Observação: inferido a partir do código. A validação equivalente em RLS precisa ser confirmada.

**Resultado esperado:** materialidade muda para `aprovada` e `vigente`.

**Limitações atuais:**

- Nova versão de materialidade aprovada ainda não está implementada como fluxo completo.
- Alçada server-side precisa ser validada.
- Tipagem Supabase pode estar desatualizada para tabelas recentes.

## 12. Bases de materialidade

Bases de materialidade são referências específicas que podem ser usadas para calcular ou justificar materialidade por conta, saldo ou valor manual. Elas podem ser vinculadas ao PTA e preservadas como snapshot.

### Fluxo G - Cadastrar Bases de Materialidade

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > `Materialidade` > `Bases de Materialidade` |
| Objetivo | Cadastrar bases específicas para uso no PTA |
| Quando usar | Durante a definição de materialidade, antes da aprovação ou antes de gerar PTA com base vinculada |

**Passo a passo:**

1. Abra a materialidade do trabalho.
2. Acesse o painel de bases.
3. Crie uma nova base.
4. Informe nome e descrição.
5. Escolha o critério da base.
6. Para base manual, informe o valor/saldo base.
7. Para base ligada ao balancete, selecione balancete e linha.
8. Informe percentual aplicado, quando necessário.
9. Revise valor de materialidade calculado ou informado.
10. Salve.

**Campos principais:**

- Nome da base.
- Descrição.
- Critério do saldo base.
- Balancete.
- Linha do balancete.
- Código e descrição da conta em snapshot.
- Saldo base em snapshot.
- Percentual aplicado.
- Valor da materialidade.
- Observações.
- Status ativo/inativo.

**Validações importantes:**

- Nome e critério são obrigatórios.
- Base manual exige valor/saldo base.
- Base por balancete exige linha do balancete.
- A interface limita a 3 bases ativas.

Observação: o limite de 3 bases ativas foi identificado no frontend. Confirmar se existe bloqueio equivalente no banco.

**Resultado esperado:** base ativa disponível para seleção no PTA, desde que a materialidade esteja aprovada e vigente.

**Snapshots:** quando uma base é selecionada no PTA, o sistema preserva dados da base naquele momento, como nome, valor, percentual, saldo e conta. Isso evita que alterações futuras na base mudem o histórico do PTA já salvo.

## 13. Matriz de riscos

A matriz de riscos registra riscos por trabalho, área/ciclo, conta, assertiva, probabilidade, impacto, resposta planejada e responsável. Ela apoia o planejamento e a definição de respostas de auditoria.

**Finalidade:** organizar riscos identificados e documentar a resposta planejada do auditor.

**Relação com o planejamento:** a matriz faz parte do planejamento do trabalho e deve refletir os riscos relevantes para o escopo aprovado.

**Relação futura com PTA, regras, solicitações e evidências:** ainda não há vínculo formal completo entre risco e PTA, procedimento, solicitação, evidência, regra ou base de materialidade.

Ainda não implementado: ciclo formal risco -> resposta -> PTA/procedimento -> solicitação/evidência -> conclusão.

### Campos da matriz de riscos

| Campo | Uso operacional |
|---|---|
| Área/Ciclo | Área auditada ou ciclo relacionado ao risco |
| Conta MCSE | Conta de referência, quando o risco estiver associado a uma conta |
| Assertiva | Assertiva de auditoria afetada pelo risco |
| Risco identificado | Descrição objetiva do risco |
| Tipo de risco | Classificação do risco, como inerente, controle, distorção relevante ou fraude |
| Causa | Origem provável do risco |
| Impacto potencial | Consequência esperada caso o risco se materialize |
| Probabilidade | Chance de ocorrência: baixa, média ou alta |
| Impacto | Severidade: baixo, médio ou alto |
| Nível de risco | Classificação final: baixo, médio, alto ou crítico |
| Risco significativo | Indica risco relevante para acompanhamento diferenciado |
| Risco de fraude | Indica risco com componente de fraude |
| Resposta planejada | Procedimento ou resposta prevista pelo auditor |
| Evidência esperada | Evidência que deve suportar a resposta |
| Responsável | Auditor responsável pelo acompanhamento |
| Status | Situação do risco no fluxo de trabalho |

Observação: inferido a partir do código.

### Nível de risco sugerido

O sistema sugere o nível de risco a partir da combinação entre probabilidade e impacto.

- Probabilidade baixa, média ou alta.
- Impacto baixo, médio ou alto.
- Resultado sugerido: baixo, médio, alto ou crítico.
- O usuário pode ajustar o nível manualmente.

Observação: inferido a partir do código. O cálculo é apoio operacional e não substitui julgamento profissional.

### Indicadores da matriz

A tela apresenta indicadores para acompanhamento:

- Riscos ativos.
- Riscos críticos.
- Riscos alto/crítico.
- Riscos significativos.
- Riscos de fraude.
- Riscos sem resposta planejada.
- Percentual de riscos com resposta.

### Filtros disponíveis

Os filtros observados incluem:

- Busca textual.
- Status.
- Nível de risco.
- Risco significativo.
- Risco de fraude.
- Ativos, inativos ou todos.

### Fluxo J - Criar risco na Matriz de Riscos

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > `Matriz de Riscos` |
| Objetivo | Registrar um novo risco do trabalho |
| Quando usar | Após identificar risco relevante no planejamento ou na execução |

**Passo a passo:**

1. Abra o planejamento do trabalho.
2. Acesse a matriz de riscos.
3. Clique para adicionar risco.
4. Informe área/ciclo.
5. Se aplicável, selecione conta MCSE.
6. Informe assertiva e risco identificado.
7. Informe tipo de risco, causa e impacto potencial.
8. Defina probabilidade e impacto.
9. Revise o nível sugerido ou ajuste manualmente.
10. Marque risco significativo ou fraude, quando aplicável.
11. Registre resposta planejada e evidência esperada.
12. Informe responsável e status.
13. Salve.

**Validações importantes:**

- Área/ciclo, assertiva, tipo, probabilidade, impacto, nível e resposta planejada são tratados como campos críticos.
- Risco identificado deve ser preenchido de forma objetiva.

**Resultado esperado:** risco criado como ativo e exibido na matriz.

### Fluxo K - Editar risco

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > `Matriz de Riscos` |
| Objetivo | Atualizar risco já registrado |
| Quando usar | Quando houver mudança de resposta, status, responsável ou classificação |

**Passo a passo:**

1. Localize o risco na matriz.
2. Abra a ação de edição.
3. Ajuste os campos necessários.
4. Revise probabilidade, impacto e nível.
5. Salve.

**Resultado esperado:** risco atualizado mantendo o histórico operacional do trabalho.

**Limitações atuais:** histórico formal de alterações por `review_events` ou trilha específica ainda não está implementado.

### Fluxo L - Inativar/Reativar risco

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > `Matriz de Riscos` |
| Objetivo | Remover temporariamente risco da visão ativa ou restaurá-lo |
| Quando usar | Quando um risco não deve mais ser tratado como ativo, mas precisa permanecer registrado |

**Passo a passo:**

1. Localize o risco.
2. Use a ação de inativar.
3. Para restaurar, altere o filtro para exibir inativos ou todos.
4. Use a ação de reativar.

**Resultado esperado:** risco muda entre ativo e inativo sem ser excluído.

### Fluxo M - Usar filtros da Matriz de Riscos

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Trabalhos de Auditoria` > `Planejamento` > `Matriz de Riscos` |
| Objetivo | Localizar riscos específicos e acompanhar concentração de risco |
| Quando usar | Durante revisão, acompanhamento ou análise por área |

**Passo a passo:**

1. Digite termo na busca textual.
2. Filtre por status.
3. Filtre por nível de risco.
4. Filtre por risco significativo ou fraude.
5. Alterne entre ativos, inativos e todos.
6. Revise os indicadores após aplicar filtros.

**Resultado esperado:** lista reduzida aos riscos compatíveis com os critérios.

**Limitações atuais da matriz de riscos:**

- Sem vínculo formal com PTA.
- Sem vínculo formal com regra documental.
- Sem vínculo formal com solicitação ou evidência.
- Sem vínculo formal com base de materialidade.
- Sem `review_events`, `review_notes` ou gates de QA.

## 14. Balancetes

Balancetes alimentam análises contábeis, mapeamento MCSE, geração de PTA e solicitações.

### Fluxo N - Importar ou consultar Balancetes

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Balancetes` |
| Objetivo | Importar, consultar e validar balancetes do trabalho |
| Quando usar | Após criar trabalho e antes de gerar PTA ou solicitações baseadas em contas |

**Passo a passo:**

1. Acesse balancetes.
2. Inicie importação.
3. Selecione trabalho e tipo de balancete.
4. Selecione arquivo CSV, XLS ou XLSX, quando aceito pela tela.
5. Mapeie colunas.
6. Revise pré-visualização.
7. Confirme importação.
8. Consulte linhas importadas.
9. Revise saldos, mapeamento, pendências e documentos vinculados.

**Campos principais:** trabalho, arquivo, tipo, código da conta, descrição da conta, saldos, mapeamento MCSE, status de validação e observações.

**Validações importantes:**

- Colunas obrigatórias precisam ser mapeadas.
- Diferenças aceitas devem ter justificativa, quando a tela exigir.
- PTAs fechados podem restringir alterações em linhas vinculadas.

Observação: inferido a partir do código.

**Resultado esperado:** balancete importado e disponível para PTA, regras e análises.

## 15. PTA / Papéis de trabalho

PTA é o conjunto de papéis de trabalho usados para documentar análises por conta ou tema. Pode ser gerado automaticamente a partir do balancete/MCSE ou criado manualmente.

### Fluxo I - Selecionar Base de Materialidade no PTA

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Papéis de Trabalho` > detalhe do PTA > seleção de base |
| Objetivo | Vincular uma base de materialidade aprovada ao PTA |
| Quando usar | Quando o PTA deve usar um limite de materialidade derivado de base específica |

**Passo a passo:**

1. Abra o PTA.
2. Localize o campo de base de materialidade.
3. Selecione uma base ativa de materialidade aprovada e vigente.
4. Confira os parâmetros preenchidos.
5. Salve o PTA.

**O que ocorre ao selecionar a base:**

- O sistema salva o vínculo com a base.
- O limite de materialidade pode ser sugerido a partir do valor da base.
- Dados da base são gravados como snapshot.
- O limite de variação permanece manual.

**Resultado esperado:** PTA passa a exibir a base selecionada e seus parâmetros preservados.

**Limitações atuais:** se não houver materialidade aprovada e vigente ou base ativa, a seleção não fica disponível.

### Fluxo O - Gerar PTA

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Papéis de Trabalho` |
| Objetivo | Criar papéis de trabalho para análise |
| Quando usar | Após importar balancete e revisar mapeamento necessário |

**Passo a passo:**

1. Acesse Papéis de Trabalho.
2. Escolha gerar automaticamente ou criar manualmente.
3. Para geração automática, selecione trabalho e critérios disponíveis.
4. Revise contas e linhas incluídas.
5. Se aplicável, selecione base de materialidade.
6. Confirme a geração.

**Validações importantes:**

- O sistema evita duplicidade de PTA para a mesma conta/trabalho.
- A geração depende de balancete e mapeamentos disponíveis.

**Resultado esperado:** PTA criado para acompanhamento e edição.

### Fluxo P - Editar PTA

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Papéis de Trabalho` > detalhe do PTA |
| Objetivo | Atualizar informações, linhas, comentários, conclusões e status do PTA |
| Quando usar | Durante a execução e revisão do papel de trabalho |

**Passo a passo:**

1. Abra o detalhe do PTA.
2. Revise título, objetivo e conta.
3. Vincule ou revise linhas do balancete.
4. Preencha comentários e conclusões.
5. Ajuste materialidade aplicável e limites.
6. Altere status quando apropriado.
7. Salve.

**Campos principais:** título, objetivo, conta, linhas do balancete, base de materialidade, limite de materialidade, limite de variação, comentários, conclusões e status.

**PTA somente leitura:** PTA fechado ou com status `concluido`/`finalizado` fica somente leitura.

Observação: inferido a partir do código.

**Resultado esperado:** PTA atualizado e consistente com a análise.

### Fluxo Q - Consultar parâmetros de materialidade no PTA

| Item | Descrição |
|---|---|
| Caminho de menu | `Trabalhos > Papéis de Trabalho` > detalhe do PTA |
| Objetivo | Conferir os parâmetros de materialidade usados no papel |
| Quando usar | Durante revisão do PTA ou análise de diferença |

**Passo a passo:**

1. Abra o PTA.
2. Consulte a seção de materialidade.
3. Confira base vinculada, valor, percentual e saldo.
4. Verifique limite de materialidade sugerido.
5. Revise campos manuais, como limite de variação.

**PTA sem base vinculada:** o PTA pode permanecer sem base específica. Nesse caso, os campos de materialidade dependem de preenchimento manual ou ficam sem snapshot de base.

**Snapshots preservados:** nome da base, valor, percentual, saldo, conta e critério ficam preservados no PTA para manter rastreabilidade.

**Limitações atuais:** a base de materialidade não substitui julgamento profissional nem automatiza toda a análise do PTA.

## 16. Solicitações documentais

Solicitações documentais organizam pedidos de documentos ao cliente e acompanhamento das respostas.

### Fluxo R - Gerar ou acompanhar Solicitações Documentais

| Item | Descrição |
|---|---|
| Caminho de menu | `Solicitações > Solicitações` |
| Objetivo | Gerar, revisar e acompanhar solicitações ao cliente |
| Quando usar | Após configurar trabalho, balancete e regras documentais aplicáveis |

**Passo a passo:**

1. Acesse solicitações.
2. Selecione trabalho.
3. Gere solicitação a partir das regras disponíveis.
4. Use filtros de geração, quando aplicável.
5. Revise os itens gerados.
6. Salve como rascunho.
7. Marque como revisada quando aplicável.
8. Gere PDF/HTML ou acompanhe a solicitação pela tela.

**Campos principais:** trabalho, solicitação, itens, regra documental, status, responsável, documentos vinculados.

**Status conhecidos:** `rascunho`, `revisada`, `enviada`, `parcial`, `respondida`, `atendida`, `concluida`, `encerrada`, `cancelada`.

Observação: inferido a partir do código.

**Resultado esperado:** solicitação registrada e pronta para acompanhamento.

### Fluxo S - Acompanhar resposta do cliente

| Item | Descrição |
|---|---|
| Caminho de menu | `Solicitações > Solicitações` > detalhe dos itens/documentos |
| Objetivo | Analisar documentos enviados pelo cliente |
| Quando usar | Após o cliente responder pelo portal |

**Passo a passo:**

1. Abra a solicitação.
2. Acesse os itens e documentos enviados.
3. Analise o arquivo.
4. Classifique como aceito, recusado, complementar ou em análise, conforme a tela permitir.
5. Registre observações.
6. Quando aplicável, vincule documento aceito ao balancete.

**Validações importantes:**

- Documento recusado pode exigir correção ou reenvio.
- Documento aceito deve ser vinculado quando servir como evidência de uma linha ou análise.

**Resultado esperado:** item de solicitação atualizado e documento tratado pelo auditor.

## 17. Portal do cliente, visto pelo auditor

O portal do cliente é a área restrita usada pelo `cliente_usuario` para consultar solicitações e enviar documentos. Para o auditor, o uso principal é acompanhar o que foi respondido e analisar documentos recebidos.

**Uso pelo auditor:**

1. Gere ou revise solicitações.
2. Aguarde envio pelo cliente.
3. Acompanhe status dos itens.
4. Analise documentos recebidos.
5. Solicite correção quando necessário.

**Limitações do cliente_usuario:**

- Deve visualizar apenas solicitações do próprio cliente.
- Não deve acessar módulos internos de auditoria.
- Não deve acessar dados de outros clientes.

Observação: essas restrições precisam ser validadas em RLS e testes reais de acesso cruzado.

## 18. Procedimentos auxiliares

Procedimentos auxiliares complementam o trabalho principal com análises específicas, como contagem de caixa, contagem de estoques e faturas em aberto.

### Fluxo T - Acessar Procedimentos Auxiliares

| Item | Descrição |
|---|---|
| Caminho de menu | `Procedimentos` |
| Objetivo | Criar e executar procedimentos auxiliares vinculados ao trabalho |
| Quando usar | Quando o escopo exigir análise complementar |

**Passo a passo:**

1. Acesse Procedimentos.
2. Crie ou selecione um procedimento.
3. Escolha o tipo.
4. Preencha dados do cabeçalho.
5. Abra o detalhe.
6. Execute a aba específica do procedimento.
7. Anexe evidências, quando aplicável.
8. Registre conclusão e status.

**Tipos citados no sistema:**

- Contagem de caixa.
- Contagem de estoque.
- Faturas em aberto.
- Outros tipos auxiliares conforme cadastro/tela.

**Limitações atuais:**

- Ordens de compra aparecem como possibilidade no hub, mas execução específica ainda não foi identificada como implementada.
- Ordens de imobilização aparecem como possibilidade no hub, mas execução específica ainda não foi identificada como implementada.

## 19. Faturas em aberto

Faturas em aberto são tratadas dentro de procedimento auxiliar específico.

### Fluxo U - Analisar Faturas em Aberto

| Item | Descrição |
|---|---|
| Caminho de menu | `Procedimentos` > procedimento do tipo `faturas_em_aberto` |
| Objetivo | Importar, validar e analisar faturas em aberto por aging, classe, município e situação |
| Quando usar | Quando o escopo exigir análise de recebíveis/faturas pendentes |

**Passo a passo:**

1. Crie ou abra um procedimento do tipo `faturas_em_aberto`.
2. Acesse a execução do procedimento.
3. Importe arquivo CSV, XLS ou XLSX.
4. Mapeie colunas.
5. Corrija erros de validação.
6. Importe o lote.
7. Revise itens importados.
8. Use o dashboard para análise.
9. Consulte lotes, classes e municípios.

**Campos obrigatórios observados:**

- Unidade consumidora ou identificador equivalente.
- Data de vencimento.
- Valor em aberto.
- Número da fatura ou número do documento.

Observação: inferido a partir do código.

**Análises disponíveis no dashboard:**

- Valor em aberto.
- Quantidade de faturas.
- Unidades consumidoras.
- Lotes.
- Classes não cadastradas.
- Municípios não cadastrados.
- Linhas com erro.
- Aging.
- Situação.
- Classe.
- Município.
- Ano/mês.

**Resultado esperado:** lote importado, itens analisáveis e indicadores disponíveis.

**Limitações atuais:** cadastros auxiliares de classes e municípios precisam ser validados contra o schema real e a massa de dados usada no ambiente.

## 20. Boas práticas operacionais

- Crie trabalho somente após confirmar cliente e exercício.
- Vincule equipe antes de aprovar planejamento.
- Registre planejamento em linguagem objetiva.
- Documente justificativa técnica da materialidade.
- Use bases de materialidade com nomes claros e rastreáveis.
- Mantenha matriz de riscos atualizada durante o trabalho.
- Importe balancete antes de gerar PTA automático.
- Revise duplicidades antes de criar PTA manual.
- Analise documentos recebidos antes de marcar itens como atendidos.
- Registre conclusões nos procedimentos auxiliares.
- Não trate alerta de interface como substituto de RLS ou validação de banco.

## 21. Limitações atuais

- Vínculo formal de riscos com PTA, procedimentos, solicitações, evidências, regras ou bases de materialidade ainda não está implementado.
- Workflow completo de revisão com `review_events`, `review_notes` e gates ainda não está implementado.
- Nova versão de materialidade aprovada ainda não está implementada como fluxo completo.
- Algumas alçadas foram identificadas no frontend e precisam de validação server-side.
- `types.ts` do Supabase está desatualizado em relação a tabelas recentes.
- Há uso de `as any` em módulos novos.
- Parte do schema pode depender de SQL manual em `docs/sql`.
- Ordens de compra e ordens de imobilização aparecem como escopo futuro ou placeholder.
- Dicionário de dados ainda precisa ser validado contra o Supabase real.

## 22. Erros comuns e como tratar

| Situação | Causa provável | Como tratar |
|---|---|---|
| Usuário acessa, mas não vê módulos esperados | Vínculo de auditor ou perfil incompleto | Solicitar revisão do cadastro de auditor e usuário Auth |
| Auditor não consegue aprovar planejamento | Campos obrigatórios ausentes ou sem alçada | Completar objetivo, escopo, estratégia e responsável; validar papel/perfil |
| Senior não consegue aprovar planejamento | Não é responsável principal | Conferir equipe do trabalho |
| Materialidade não aprova | Campos ausentes, valores inválidos, sem alçada ou já existe vigente | Revisar dados e verificar materialidade vigente |
| Base não aparece no PTA | Materialidade não está aprovada/vigente ou base está inativa | Aprovar materialidade e ativar base |
| PTA fica somente leitura | PTA fechado, concluído ou finalizado | Confirmar status antes de tentar editar |
| Solicitação não gera itens | Falta regra aplicável, balancete ou filtro restringiu tudo | Revisar regras, balancete e filtros |
| Documento do cliente não resolve item | Documento recusado, complementar ou sem vínculo correto | Reanalisar documento e orientar correção |
| Importação de faturas mostra erro | Colunas obrigatórias ausentes ou dados inválidos | Corrigir mapeamento e arquivo de origem |

## 23. Checklist operacional do auditor

Antes de iniciar execução:

- [ ] Cliente cadastrado.
- [ ] Exercício cadastrado.
- [ ] Trabalho criado.
- [ ] Equipe vinculada.
- [ ] Responsável principal definido, quando aplicável.

Planejamento e materialidade:

- [ ] Planejamento preenchido.
- [ ] Planejamento aprovado, quando aplicável.
- [ ] Materialidade criada.
- [ ] Justificativa técnica preenchida.
- [ ] Bases de materialidade cadastradas, quando aplicável.
- [ ] Materialidade aprovada e vigente, quando aplicável.

Riscos e execução:

- [ ] Matriz de riscos preenchida.
- [ ] Riscos críticos e significativos revisados.
- [ ] Riscos sem resposta identificados.
- [ ] Balancete importado e revisado.
- [ ] PTA gerado ou criado manualmente.
- [ ] Base de materialidade vinculada ao PTA, quando aplicável.
- [ ] Comentários e conclusões registrados no PTA.

Solicitações e procedimentos:

- [ ] Solicitações documentais geradas.
- [ ] Itens revisados antes de envio/acompanhamento.
- [ ] Respostas do cliente analisadas.
- [ ] Documentos aceitos vinculados quando aplicável.
- [ ] Procedimentos auxiliares criados conforme escopo.
- [ ] Faturas em aberto analisadas, quando aplicável.

Encerramento operacional:

- [ ] Pendências documentais revisadas.
- [ ] PTA concluído ou finalizado conforme regra interna.
- [ ] Procedimentos com conclusão registrada.
- [ ] Limitações e pontos de julgamento documentados.
