# Manual do Administrador

Este documento descreve tarefas administrativas identificadas no sistema.

Observacao: inferido a partir do codigo.

## Papel do administrador

O administrador e um auditor com `perfil_acesso = admin`. Ele possui permissoes ampliadas no frontend e nas policies RLS conhecidas.

## Cadastro de auditores

1. Acesse `Cadastros > Auditores`.
2. Cadastre nome, email, cargo, perfil de acesso e status.
3. Mantenha apenas usuarios necessarios como ativos.
4. Defina `perfil_acesso` com cuidado.

Perfis identificados:

- `assistente`
- `senior`
- `gerente`
- `socio`
- `admin`

Cargo tambem inclui `revisor` em parte do schema.

## Vinculacao Auth

1. O usuario precisa existir no Supabase Auth.
2. O administrador pode vincular o usuario Auth a um auditor.
3. As RPCs identificadas incluem `get_auth_users_for_linking`, `link_auditor_account` e `link_auditor_by_email`.
4. Evite vinculos duplicados ou contas sem responsavel.

## Usuarios do cliente

1. Acesse `Cadastros > Usuarios do Cliente`.
2. Cadastre nome, email, cliente e status.
3. Vincule o usuario ao Auth quando aplicavel.
4. Desative usuarios que nao devem mais acessar o portal.

## Clientes e exercicios

1. Acesse `Cadastros > Clientes`.
2. Cadastre dados do cliente.
3. Crie exercicios por ano.
4. Configure parametros quando aplicavel.
5. Quando segmentos estiverem ativos no banco, vincule o cliente ao segmento correto.

## Estruturas de auditoria

1. Acesse `Parametros > Estruturas de Auditoria`.
2. Consulte ou cadastre estruturas por segmento.
3. Use a estrutura MCSE como fallback quando aplicavel.

Observacao: algumas telas sao tolerantes a ausencia das tabelas `segmentos` e `estruturas_auditoria`.

## Produtos e contratos

1. Cadastre produtos em `Cadastros > Produtos de Auditoria`.
2. Configure categoria, segmento, subtipo, complexidade, risco e horas base.
3. Cadastre contratos em `Contratos`.
4. Vincule produtos ao contrato.
5. Use contratos/produtos ao criar trabalhos.

Atencao: `contratos` e `contrato_produtos` sao usados pelo frontend, mas a criacao local dessas tabelas nao foi encontrada no inventario.

## Regras MCSE

1. Acesse `Parametros > Regras de Auditoria`.
2. Selecione a estrutura ativa quando aplicavel.
3. Configure regras por conta MCSE.
4. Cadastre documentos solicitaveis.
5. Cadastre instrucoes ao cliente.
6. Cadastre trilhas de emissao ERP.

## Cuidados com RLS

- A RLS usa funcoes como `is_admin`, `is_cliente_usuario`, `get_accessible_trabalho_ids`, `get_accessible_cliente_ids` e `get_cliente_usuario_cliente_id`.
- O administrador deve validar se usuarios cliente nao conseguem acessar dados de outros clientes.
- O administrador deve validar se auditores acessam apenas trabalhos permitidos, exceto quando a regra permitir acesso ampliado.
- Alçadas de aprovacao de planejamento e materialidade precisam de validacao humana, pois parte da regra foi identificada no frontend.

## Cuidados com scripts SQL manuais

- Nao execute SQL sem revisar o conteudo.
- Diferencie `docs/sql` de `supabase/migrations`.
- SQLs em `docs/sql` podem representar scripts manuais de fases recentes.
- Antes de executar qualquer SQL no Supabase externo, valide ambiente, backup, usuario e impacto.
- Depois de executar SQL, valide tabelas, colunas, policies, constraints e funcionamento das telas.

## Atividades administrativas ainda pendentes

- Criar matriz definitiva de permissoes.
- Validar schema real do Supabase contra o repositorio.
- Formalizar ordem de scripts SQL manuais.
- Atualizar README em etapa futura.
- Regenerar `types.ts` em etapa futura, quando autorizado.
