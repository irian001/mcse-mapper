# Matriz de Permissoes e RLS

Este documento registra o entendimento inicial de perfis, bloqueios e policies.

Observacao: inferido a partir do codigo e SQLs locais.

## Perfis funcionais

### Auditor interno

- Identificado quando o usuario Auth esta vinculado a `auditores.auth_user_id`.
- Acessa o layout interno.
- Pode acessar dashboard, cadastros, trabalhos, balancetes, PTA, solicitacoes, procedimentos e parametros, conforme RLS.
- Escrita operacional depende de policies por trabalho/cliente acessivel.

### `cliente_usuario`

- Identificado quando o usuario Auth esta vinculado a `cliente_usuarios.auth_user_id` ativo.
- Acessa apenas o portal do cliente.
- Consulta solicitacoes e pendencias do proprio cliente.
- Envia documentos em solicitacoes.
- Nao deve acessar dados de outros clientes.

### Admin

- Auditor com `perfil_acesso = admin`.
- Possui acesso amplo no frontend e em RLS.
- Pode gerir usuarios, auditores, estruturas, produtos e cadastros sensiveis.

## Perfis de auditor

Perfis identificados em `perfil_acesso`:

- `assistente`
- `senior`
- `gerente`
- `socio`
- `admin`

Uso observado:

- `admin`: administracao e escrita ampla.
- `socio` e `gerente`: alçada no fluxo de planejamento/materialidade.
- `senior`: pode aprovar planejamento quando responsavel principal, conforme frontend.
- `assistente`: perfil operacional sem alçada especial observada.

Observacao: regras finas de alçada foram identificadas no frontend e precisam de validacao no banco.

## Funcoes RLS conhecidas

### `is_admin`

Verifica se o usuario Auth esta vinculado a auditor com `perfil_acesso = admin`.

### `is_cliente_usuario`

Verifica se o usuario Auth esta vinculado a usuario de cliente ativo.

### `get_accessible_trabalho_ids`

Retorna trabalhos acessiveis ao auditor por vinculo em `trabalho_auditores`, com regra especial para socio em alguns casos.

### `get_accessible_cliente_ids`

Retorna clientes associados aos trabalhos acessiveis.

### `get_cliente_usuario_cliente_id`

Retorna o cliente associado ao usuario cliente logado.

### `get_my_auditor_id`

Retorna o auditor vinculado ao usuario Auth.

### `can_access_storage_doc`

Controla acesso a objetos do bucket `documentos-balancete`.

### `can_access_sol_storage_doc`

Controla acesso a objetos do bucket `solicitacao-documentos`.

## Bloqueios no frontend

Bloqueios identificados:

- Roteamento separa auditor, cliente e sem vinculo.
- Cliente nao ve layout interno.
- `AuditoresPage` restringe acoes administrativas por `perfil_acesso = admin`.
- `ClienteUsuariosPage` restringe criacao/acoes por admin.
- `EmpresaAuditoriaPage` restringe edicao por admin.
- `TrabalhoPlanejamentoDialog` aplica alçadas para planejamento e materialidade.
- `TrabalhoRiscosPanel` verifica se o usuario e auditor.

## Bloqueios no banco/RLS

Padroes identificados:

- Admin possui acesso amplo.
- Cliente le apenas registros do proprio `cliente_id` em tabelas sensiveis.
- Auditor nao cliente escreve em tabelas operacionais se o trabalho ou cliente estiver acessivel.
- Cliente pode inserir/atualizar documentos de solicitacao dentro do proprio escopo.
- SQLs de faturas em aberto bloqueiam `cliente_usuario` nesta etapa.
- SQLs de planejamento/materialidade/riscos bloqueiam `cliente_usuario`.

## Diferencas entre frontend e RLS

- O frontend melhora a experiencia e esconde acoes.
- A RLS deve ser a barreira real de seguranca.
- Quando a regra existe apenas no frontend, o risco e que chamadas diretas ao Supabase ignorem a interface.

## Riscos identificados

- Alçada de aprovacao de planejamento/materialidade pode estar apenas no frontend.
- `types.ts` desatualizado dificulta validacao estatica de tabelas protegidas.
- Tabelas usadas sem `CREATE TABLE` local encontrado podem ter RLS desconhecida.
- SQLs manuais em `docs/sql` podem nao estar aplicados em todos os ambientes.
- E necessario testar acesso cruzado entre clientes.

## Validacoes recomendadas

1. Login como admin.
2. Login como auditor vinculado a apenas um trabalho.
3. Login como auditor nao vinculado ao trabalho.
4. Login como cliente de um cliente.
5. Tentar acessar solicitacao de outro cliente.
6. Tentar baixar documento de outro cliente.
7. Tentar atualizar planejamento/materialidade sem alçada.
8. Tentar acessar tabelas de faturas como `cliente_usuario`.
