# Manual do Administrador do Sistema

Este manual orienta a administração funcional e técnica leve do sistema de auditoria. Ele deve ser usado por pessoas responsáveis por usuários, clientes, auditores, trabalhos, parametrizações, permissões, Supabase, SQLs manuais e rotinas de manutenção.

Observação: inferido a partir do código, dos SQLs locais e do inventário técnico-funcional da Fase D.1.

## 1. Objetivo do manual

Orientar o administrador a operar o sistema com segurança, mantendo cadastros coerentes, vínculos corretos, permissões revisadas e rastreabilidade de mudanças.

Este manual não autoriza execução de SQL, alteração de banco, criação de migrations ou mudanças técnicas fora de fase própria.

## 2. Público-alvo

- Administrador funcional do sistema.
- Administrador técnico responsável por Supabase, RLS, storage e SQLs.
- Sócios, gerentes ou responsáveis por parametrizações críticas.
- Agentes técnicos que precisem entender riscos administrativos antes de alterar o sistema.

## 3. Papel do administrador

O termo administrador pode ter dois sentidos:

| Papel | Responsabilidades principais |
|---|---|
| Administrador funcional | Gerencia usuários, clientes, auditores, trabalhos, equipes, cadastros, regras e parametrizações operacionais |
| Administrador técnico | Cuida de Supabase, SQLs, RLS, storage, tipos, migrations, variáveis de ambiente e integrações |

No código, o administrador interno é tratado como auditor com `perfil_acesso = admin`.

Observação: a separação entre administrador funcional e administrador técnico deve ser validada no ambiente real.

## 4. Visão geral das responsabilidades administrativas

O administrador deve garantir que:

- Usuários internos tenham vínculo correto com auditores.
- Usuários do cliente tenham vínculo correto com clientes.
- Clientes e exercícios estejam consistentes.
- Trabalhos tenham equipe definida.
- Alçadas e perfis estejam coerentes.
- Regras MCSE e documentos solicitáveis estejam revisados.
- Solicitações documentais sejam geradas e acompanhadas corretamente.
- Cliente veja apenas sua área.
- SQLs manuais não sejam executados sem revisão.
- Storage e documentos estejam protegidos por policies.
- Mudanças relevantes sejam registradas.

## 5. Acesso administrativo

O administrador acessa o layout interno do sistema, não o Portal do Cliente.

Menus internos identificados:

- `Dashboard`
- `Cadastros`
- `Contratos`
- `Trabalhos`
- `Procedimentos`
- `Solicitações`
- `Parâmetros`

Observação: inferido a partir do código.

O acesso administrativo depende de usuário autenticado vinculado a um cadastro em `auditores`, com perfil compatível. O perfil `admin` libera ações administrativas observadas no frontend.

## 6. Gestão de usuários internos

Usuário interno é a conta de autenticação usada para entrar no sistema. O cadastro funcional do auditor fica separado na tabela `auditores`.

Diferença operacional:

| Conceito | Finalidade |
|---|---|
| Usuário autenticado | Conta usada no login |
| Auditor | Registro funcional com nome, cargo, perfil, status e vínculo com trabalhos |
| `auditores.auth_user_id` | Campo que vincula o usuário autenticado ao auditor |

Fluxo identificado:

1. Criar ou localizar a conta de autenticação do usuário.
2. Cadastrar o auditor em `Cadastros > Auditores`.
3. Informar nome, e-mail, cargo, perfil de acesso e status.
4. Vincular o usuário autenticado ao auditor pelo e-mail.
5. Testar login e acesso.

Observação: o código cita RPCs como `get_auth_users_for_linking`, `link_auditor_account` e `link_auditor_by_email`. Se essas funções não existirem no banco, a vinculação pode falhar com erro de schema cache ou função não encontrada.

## 7. Gestão de auditores

**Caminho:** `Cadastros > Auditores`.

Auditor é a pessoa interna que executa, revisa ou administra trabalhos.

Campos observados:

- Nome.
- E-mail.
- Cargo.
- Perfil de acesso.
- Ativo.
- Observações.
- Vínculo com usuário autenticado.

Cargos identificados:

- `assistente`
- `senior`
- `gerente`
- `socio`
- `revisor`

Perfis de acesso identificados:

- `assistente`
- `senior`
- `gerente`
- `socio`
- `admin`

Cuidados administrativos:

- Mantenha como `admin` somente usuários realmente autorizados.
- Antes de inativar auditor, verifique trabalhos em andamento.
- Antes de excluir auditor, verifique vínculos em `trabalho_auditores`.
- O código remove alocações em trabalhos ao excluir auditor pela tela.
- Troca de perfil pode alterar alçada e visibilidade operacional.
- Remover vínculo Auth impede que aquele cadastro funcione como usuário logado.

Observação: inferido a partir do código.

## 8. Perfis de acesso e alçadas

Perfis observados:

| Perfil | Uso esperado |
|---|---|
| `assistente` | Execução operacional sem alçada especial identificada |
| `senior` | Execução e possível aprovação de planejamento quando responsável principal |
| `gerente` | Alçada observada para planejamento/materialidade |
| `socio` | Alçada observada para planejamento/materialidade |
| `admin` | Administração e acesso ampliado |

Alçadas observadas:

- Planejamento: `admin`, `socio`, `gerente` e `senior` quando responsável principal.
- Materialidade: `admin`, `socio` e `gerente`.

Observação: inferido a partir do código. Alçadas identificadas no frontend precisam ser validadas server-side em RLS/RPC/policies.

## 9. Gestão de clientes

**Caminho:** `Cadastros > Clientes`.

Cliente é a entidade auditada. Ele é usado em trabalhos, exercícios, solicitações, portal do cliente, balancetes e procedimentos.

Campos observados:

- Razão social.
- Nome fantasia.
- CNPJ.
- Status: `ativo`, `inativo` ou `prospecto`.
- Segmento, quando as tabelas estiverem disponíveis.
- Endereço.
- Contato contábil.
- E-mail de contato.

Cuidados:

- Validar CNPJ e razão social antes de criar trabalhos.
- Confirmar status do cliente antes de liberar novos trabalhos.
- Conferir segmento quando o módulo de estruturas por segmento estiver ativo.
- Evitar alterar cliente de um trabalho já em execução sem revisão.

Observação: algumas telas são tolerantes à ausência de `segmentos` e `estruturas_auditoria`.

## 10. Gestão de usuários do cliente

**Caminho:** `Cadastros > Usuários do Cliente`.

Usuário do cliente é a pessoa externa que acessa o Portal do Cliente.

A tabela `cliente_usuarios` vincula um usuário autenticado a um cliente.

Campos observados:

- Nome.
- E-mail.
- Cliente.
- Ativo.
- `auth_user_id`, quando vinculado.

Cuidados:

- Confirmar que o usuário está vinculado ao cliente correto.
- Não reutilizar o mesmo usuário Auth em cliente diferente.
- O código bloqueia vínculo se o usuário já estiver vinculado como auditor ou a outro cliente.
- Ao trocar o cliente de um usuário, testar acesso imediatamente.
- Inativar usuários que não devem mais acessar o portal.

O cliente deve acessar apenas:

- `Minhas Solicitações`.
- `Pendências`.
- Documentos e solicitações do próprio cliente.

O cliente não deve acessar:

- Planejamento.
- Materialidade.
- Bases de materialidade.
- Matriz de riscos.
- PTA.
- Revisão interna.
- QA.
- Dados de outros clientes.

Teste recomendado: entrar como `cliente_usuario`, abrir o portal, tentar acessar rota interna e tentar consultar dados de outro cliente.

## 11. Gestão de trabalhos de auditoria

**Caminho:** `Trabalhos > Trabalhos de Auditoria`.

Campos principais observados:

- Cliente.
- Exercício.
- Nome do trabalho.
- Descrição.
- Datas previstas e reais.
- Status.
- Observações.
- Contrato.
- Produto do contrato.
- Controle de horas.
- Tipo de controle de horas.

Status identificados:

- `planejado`
- `iniciado`
- `em_execucao`
- `revisao_1`
- `revisao_2`
- `finalizado_para_parecer`
- `encerrado`

Observação: inferido a partir do código.

Antes de liberar um trabalho para execução, validar:

- Cliente correto.
- Exercício correto.
- Contrato/produto correto, se aplicável.
- Equipe vinculada.
- Responsável principal definido.
- Permissões esperadas.
- Planejamento iniciado.

## 12. Gestão de equipe do trabalho

**Caminho:** `Trabalhos > Trabalhos de Auditoria` > ação de equipe.

A equipe é registrada em `trabalho_auditores`.

Papéis identificados:

- `elaborador`
- `revisor_1`
- `revisor_2`
- `gerente`
- `socio`

Também existe marcação de `responsavel_principal`.

Cuidados:

- Definir ao menos um responsável principal quando o fluxo exigir alçada.
- Evitar remover auditor de trabalho em execução sem revisar pendências, PTA e solicitações.
- Verificar se o auditor deve continuar vendo o trabalho após alteração de equipe.
- A função `get_accessible_trabalho_ids` é usada como base técnica para acesso por trabalho.

Observação: inferido a partir do código e das policies locais.

## 13. Exercícios e períodos

**Caminho:** `Cadastros > Clientes` > cliente > exercícios.

Exercício define o período auditado para um cliente.

Campos observados:

- Ano do exercício.
- Data de início.
- Data de fim.
- Status.

Status de exercício identificados no código:

- `aberto`
- `em_andamento`
- `fechado`
- `arquivado`

Cuidados:

- Criar o exercício correto antes de criar trabalho.
- Evitar duplicidade de exercício para o mesmo cliente.
- Conferir período antes de gerar solicitações e importar balancetes.

## 14. Planejamento, materialidade e riscos — visão administrativa

### Planejamento

O planejamento registra objetivo, escopo, estratégia, responsável e status.

Cuidados:

- Verificar se a equipe está vinculada antes da aprovação.
- Validar campos obrigatórios.
- Confirmar alçada do usuário que aprova.
- Planejamento aprovado tende a ficar bloqueado para edição direta.

Observação: aprovação foi identificada no frontend e precisa de validação server-side.

### Materialidade

Materialidade registra base de cálculo, percentual, valores, justificativa técnica e responsável.

Cuidados:

- Verificar se existe materialidade vigente.
- Evitar múltiplas materialidades vigentes para o mesmo trabalho.
- Confirmar justificativa técnica antes da aprovação.
- Validar alçada do aprovador.

Status e conceitos identificados:

- `rascunho`.
- `aprovada`.
- `vigente`.
- Substituição/nova versão ainda não encontrada como fluxo completo.

Ainda não implementado: fluxo completo de nova versão de materialidade aprovada/substituída.

### Bases de materialidade

Bases de materialidade servem para referenciar saldos ou valores usados no PTA.

Características observadas:

- Podem ser manuais ou vinculadas a linha de balancete.
- Preservam snapshots de conta, saldo, percentual, valor e critério.
- A interface limita a 3 bases ativas.
- Bases aprovadas/vinculadas tornam-se referência para PTA.

Observação: o limite de 3 bases ativas foi identificado na UI e deve ser validado no banco.

### Matriz de riscos

A matriz usa a tabela `trabalho_riscos_auditoria`.

Objetivo:

- Registrar risco por área/ciclo, conta, assertiva, probabilidade, impacto, nível, resposta e responsável.

Cuidados:

- Evitar tratar a matriz como ciclo completo de evidência.
- Revisar riscos sem resposta planejada.
- Validar riscos críticos, significativos e de fraude.

Ainda não implementado: vínculos formais de risco com PTA, procedimentos, solicitações, evidências, regras ou bases de materialidade.

## 15. MCSE, plano de contas e regras de auditoria

**Caminhos relacionados:** `Parâmetros > MCSE`, `Parâmetros > Plano de Contas`, `Parâmetros > Mapeamento`, `Parâmetros > Regras`.

Componentes administrativos:

| Item | Finalidade |
|---|---|
| Base MCSE | Estrutura contábil de referência |
| Contas MCSE | Contas usadas para mapeamento, regras e análises |
| Plano de contas do cliente | Contas de origem importadas ou cadastradas |
| Mapeamento | Relação entre plano do cliente e MCSE |
| Regras por conta | Parâmetros de criticidade, materialidade, revisão e solicitação |
| Regras de documentos | Documentos solicitáveis por regra |
| Instruções ao cliente | Orientações exibidas ao cliente |
| Emissão ERP | Trilha de emissão de relatório no sistema do cliente |

Campos e flags observados em regras:

- Conta crítica.
- Documento obrigatório.
- Revisão humana.
- Conciliação REG/SOC.
- Materialidade padrão.
- Limite de variação.
- Grupo documental.
- Gera solicitação automática.
- Ativo.

Cuidados ao alterar regras:

- Pode afetar solicitações futuras.
- Pode alterar itens gerados automaticamente.
- Pode afetar entendimento do PTA.
- Pode alterar instruções exibidas ao cliente.
- Pode afetar análise automática e seleção de contas.

Relação futura: regras e matriz de riscos ainda não possuem vínculo formal completo.

## 16. Solicitações documentais

**Caminho:** `Solicitações > Solicitações`.

Tabelas principais:

| Tabela | Finalidade |
|---|---|
| `solicitacoes_documentos` | Cabeçalho da solicitação |
| `solicitacao_itens` | Itens/documentos solicitados |
| `solicitacao_item_documentos` | Arquivos enviados e analisados |

Fluxo administrativo:

1. Gerar solicitação a partir de trabalho, balancete e regras.
2. Revisar itens gerados.
3. Salvar rascunho.
4. Finalizar revisão quando aplicável.
5. Acompanhar resposta do cliente.
6. Analisar documentos enviados.
7. Aceitar, recusar ou pedir complemento.
8. Vincular documento aceito ao balancete quando aplicável.

Cuidados:

- Solicitações dependem de regras MCSE e balancete mapeado.
- Status incorreto pode confundir cliente.
- Documento recusado deve ter observação clara.
- Documento aceito deve ser conferido antes de ser tratado como evidência.

## 17. Portal do cliente — visão administrativa

O cliente acessa rotas restritas:

- `/cliente/solicitacoes`
- `/cliente/pendencias`

O administrador deve validar:

- Usuário cliente está ativo.
- Usuário está vinculado ao cliente correto.
- Solicitações aparecem para o cliente correto.
- Pendências mostram itens pendentes, rejeitados ou complementares.
- Upload de PDF funciona.
- Cliente não acessa rotas internas.
- Cliente não acessa dados de outro cliente.

Observação: inferido a partir do código.

## 18. Procedimentos auxiliares

Procedimentos auxiliares complementam o trabalho de auditoria.

Exemplos identificados:

- Faturas em aberto.
- Contagem de caixa.
- Contagem de estoque.
- Outros hubs ou placeholders.

Cuidados administrativos:

- Procedimento deve estar vinculado ao trabalho correto.
- Importações devem ser testadas com arquivo de amostra.
- Dashboards dependem de dados consistentes.
- Procedimentos ainda não implementados não devem ser apresentados como prontos.

Ainda não implementado: execução específica completa para ordens de compra e ordens de imobilização, conforme backlog atual.

## 19. Supabase externo e cuidados de banco

O sistema usa Supabase externo como backend. Isso inclui autenticação, banco relacional, RLS e storage.

Cuidados essenciais:

- Não executar SQL sem revisão.
- Confirmar o projeto Supabase correto.
- Não presumir que o Supabase real está igual ao repositório.
- Diferenciar schema real, `docs/sql`, `supabase/migrations`, `types.ts` e frontend.
- Validar PostgREST/schema cache quando funções, tabelas ou colunas forem criadas.
- Nunca expor credenciais, tokens, service role key ou URLs sensíveis em documentação pública.

Riscos de drift:

- SQL aplicado no Supabase e não versionado.
- SQL em `docs/sql` ainda não aplicado.
- Migration existente, mas Supabase real desatualizado.
- `types.ts` desatualizado.
- Frontend usando tabela/campo por `as any`.

## 20. SQLs manuais em docs/sql

`docs/sql` contém scripts manuais e documentos de fases recentes. Nem todo SQL manual é migration formal.

Regras administrativas:

- SQLs não devem ser executados sem revisão.
- SQLs devem ser executados apenas no ambiente correto.
- Toda execução deve ser registrada.
- Validar antes e depois da execução.
- Nunca executar SQL no Lovable Cloud quando a aplicação usa Supabase externo.
- Não converter SQL manual em migration sem revisar ordem, idempotência e dependências.

Checklist antes de executar SQL manual:

- [ ] Estou no projeto Supabase correto?
- [ ] Tenho backup ou ambiente de teste?
- [ ] O SQL é idempotente?
- [ ] O SQL foi revisado?
- [ ] Há `BEGIN`/`COMMIT` quando adequado?
- [ ] Há validações pós-execução?
- [ ] O PostgREST precisa reload schema?
- [ ] O GitHub tem o arquivo versionado?
- [ ] `types.ts` precisa ser regenerado depois?
- [ ] A documentação precisa ser atualizada?

## 21. Storage e documentos

Buckets identificados:

- `documentos-balancete`
- `solicitacao-documentos`

Observação: inferido a partir do código e migrations locais.

Cuidados:

- Revisar policies antes de liberar acesso.
- Evitar bucket público sem necessidade.
- Segregar arquivos por trabalho, solicitação, item ou cliente conforme regra do sistema.
- Validar signed URLs e tempo de expiração.
- Validar se cliente não baixa documento de outro cliente.
- Validar se auditor sem vínculo não acessa documento de trabalho indevido.
- Não criar novos buckets sem política de acesso definida.

Funções relacionadas identificadas:

- `can_access_storage_doc`
- `can_access_sol_storage_doc`

Policies de storage precisam ser revisadas em ambiente real.

## 22. Segurança, RLS e isolamento de dados

Frontend esconde botões e rotas, mas a barreira crítica deve estar no banco.

Diferença prática:

| Camada | Função |
|---|---|
| Frontend | Melhora experiência, oculta ações e reduz erro operacional |
| RLS/policies | Deve impedir acesso indevido mesmo fora da interface |

Funções conhecidas:

- `is_admin`
- `is_cliente_usuario`
- `get_accessible_trabalho_ids`
- `get_accessible_cliente_ids`
- `get_cliente_usuario_cliente_id`
- `get_my_auditor_id`
- `can_access_storage_doc`
- `can_access_sol_storage_doc`

Testes obrigatórios:

- Auditor sem vínculo tentando acessar trabalho.
- Auditor vinculado acessando trabalho permitido.
- Cliente acessando outro cliente.
- Cliente tentando rota interna.
- Admin acessando cadastros administrativos.
- Perfis `assistente`, `senior`, `gerente`, `socio` e `admin` em fluxos de alçada.
- Storage de documentos por cliente e trabalho.

Alçadas implementadas no frontend precisam validação server-side.

## 23. Rotinas de manutenção

Rotinas recomendadas:

1. Revisar usuários ativos.
2. Revisar auditores inativos.
3. Revisar vínculos de clientes.
4. Revisar trabalhos abertos.
5. Revisar trabalhos sem equipe.
6. Revisar SQLs manuais aplicados.
7. Revisar divergência entre Supabase real e repositório.
8. Revisar `types.ts`.
9. Revisar uso de `as any`.
10. Revisar RLS e storage policies.
11. Revisar documentos armazenados e acesso.
12. Rodar testes básicos após mudanças.
13. Conferir GitHub após alterações.
14. Registrar mudanças relevantes.

## 24. Erros comuns e tratamento

| Erro | Possível causa | Ação inicial | Quando escalar |
|---|---|---|---|
| Usuário não consegue acessar | Sem conta Auth, sem vínculo ou inativo | Conferir Auth, `auditores` ou `cliente_usuarios` | Se vínculo não salva ou função RPC falha |
| Cliente não vê solicitações | Cliente sem solicitação, status não liberado ou vínculo incorreto | Conferir `cliente_usuarios` e solicitação | Se RLS bloquear dado correto |
| Auditor não vê trabalho | Não está em `trabalho_auditores` ou RLS restringe | Conferir equipe do trabalho | Se `get_accessible_trabalho_ids` divergir |
| Erro de RLS | Policy bloqueando operação | Testar perfil e registro | Se policy precisar ajuste |
| Tabela não encontrada | SQL não aplicado ou ambiente errado | Confirmar Supabase e scripts | Se schema real divergir do repositório |
| Coluna não encontrada | Migration/SQL pendente ou `types.ts` defasado | Confirmar coluna no schema real | Se exigir SQL controlado |
| Schema cache/PostgREST | Função ou coluna recém-criada não disponível | Recarregar schema conforme procedimento do Supabase | Se persistir após validação |
| Upload falha | Bucket/policy/tamanho/formato | Conferir bucket, arquivo e policy | Se policy ou storage estiver incorreto |
| Planejamento/materialidade/risco não salva | Campo obrigatório, alçada ou RLS | Conferir dados e perfil | Se frontend e banco divergirem |
| TypeScript não reconhece tabela | `types.ts` desatualizado | Registrar pendência de regeneração | Quando fase técnica autorizar |
| Lovable mostra algo diferente do Supabase real | Ambiente ou schema divergente | Conferir configuração e projeto | Se houver risco de alteração no banco errado |
| Codex não consegue push | Permissão, branch ou rede | Conferir status local e remoto | Se houver conflito ou credencial ausente |
| Git local divergiu do GitHub | Branch desatualizada ou commits paralelos | Conferir diff e histórico | Antes de merge/push com conflito |

## 25. Checklist administrativo

Antes de liberar novo trabalho:

- [ ] Cliente cadastrado.
- [ ] Exercício correto.
- [ ] Contrato/produto conferido, se aplicável.
- [ ] Equipe vinculada.
- [ ] Responsável principal definido.
- [ ] Permissões conferidas.
- [ ] Planejamento criado.
- [ ] Materialidade definida.
- [ ] Bases cadastradas, se aplicável.
- [ ] Matriz de riscos iniciada.
- [ ] Solicitações revisadas.

Antes de liberar cliente:

- [ ] Usuário cliente criado.
- [ ] Vínculo `cliente_usuario` correto.
- [ ] Usuário ativo.
- [ ] Acesso testado.
- [ ] Cliente não acessa área interna.
- [ ] Solicitações aparecem corretamente.
- [ ] Pendências aparecem corretamente.
- [ ] Acesso a outro cliente foi testado e bloqueado.

Antes de executar SQL:

- [ ] Projeto Supabase correto.
- [ ] Script versionado.
- [ ] Revisão feita.
- [ ] Backup ou ambiente adequado.
- [ ] Validações preparadas.
- [ ] Schema cache tratado quando necessário.
- [ ] Plano de rollback definido.
- [ ] Documentação atualizada após execução.

## 26. Limitações atuais

- Matriz definitiva de permissões ainda precisa de testes reais.
- Supabase real precisa ser reconciliado com `docs/sql`, migrations e `types.ts`.
- `types.ts` está desatualizado para tabelas recentes.
- Há uso de `as any` em módulos novos.
- Parte das alçadas foi identificada no frontend e precisa validação no banco.
- Alguns SQLs manuais não foram convertidos formalmente em migrations.
- Algumas tabelas usadas pelo frontend não tiveram `CREATE TABLE` local encontrado.
- Vínculo formal de riscos com PTA, procedimentos, solicitações e evidências ainda não está implementado.
- Policies de storage precisam ser revisadas em ambiente real.

## 27. Backlog de administração

- Validar schema real do Supabase.
- Confirmar quais SQLs de `docs/sql` foram aplicados.
- Criar registro administrativo de SQLs aplicados.
- Regenerar `types.ts` em fase autorizada.
- Reduzir uso de `as any` após atualização de tipos.
- Consolidar política de SQL manual versus migrations.
- Validar RLS por perfil.
- Validar acesso cruzado entre clientes.
- Revisar storage policies.
- Formalizar matriz de permissões.
- Atualizar README em fase própria.
- Criar roteiro detalhado de testes administrativos.
