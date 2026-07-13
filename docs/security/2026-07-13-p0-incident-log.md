# Incidente P0 — isolamento AudiFlow

- Detectado em: 2026-07-13
- Projeto ativo declarado na documentação local: `zqoywwtdsbtqtytvyzwl`
- Classificação: P0 — confidencialidade e elevação de perfil
- Estado: aberto
- Mudanças funcionais: congelamento registrado; aplicação operacional NÃO CONFIRMADA
- Portal do cliente: suspensão externa NÃO CONFIRMADA
- Novos cadastros públicos: desabilitação NÃO CONFIRMADA
- Backup pré-correção: NÃO CONFIRMADO
- Staging isolado: NÃO CONFIRMADO
- Go/no-go produção: NO-GO

## Decisão de contenção

O ambiente ativo deve permanecer fora de qualquer promoção funcional ou mutação de schema até que backup pré-correção, bloqueio de novos cadastros, suspensão externa do portal e staging isolado sejam comprovados por responsáveis com acesso operacional. Este registro não comprova a execução dessas ações: nesta atividade não houve acesso ao Dashboard, à hospedagem, ao Supabase CLI, à rede ou ao ambiente remoto.

Não inativar registros em `cliente_usuarios` como medida de contenção antes da nova RLS, pois os helpers antigos podem interpretar cliente inativo como usuário interno.

## Janela de mudança

- Início: NÃO DEFINIDO
- Responsável operacional: NÃO DEFINIDO
- Ambiente autorizado: nenhum ambiente remoto autorizado nesta atividade
- Condições mínimas para reavaliação: backup confirmado; sign-ups desabilitados; portal externo suspenso; staging isolado identificado e validado; revisão do SQL; plano de comunicação; responsável presente
- Decisão atual: NO-GO para produção

## Evidências locais sem PII

As evidências abaixo são achados já documentados na SDD e no plano da Onda 0; não foram reproduzidas nem revalidadas remotamente nesta atividade:

- simulação somente leitura com identidade de cliente registrou acesso a recursos de outros clientes, incluindo clientes, trabalhos, balancetes, PTAs, solicitações e auditores;
- RPC antiga de vínculo permitia associação com auditor livre;
- RPC de listagem de usuários de autenticação estava documentada como executável por `anon`;
- policies de documentos e Storage estavam documentadas como insuficientes para isolar cliente e trabalho;
- o histórico remoto de migrations estava documentado como vazio e divergente do schema, impedindo aplicação cega das migrations locais;
- observabilidade, backup e rollback constavam como intenção documental sem operação comprovada.

Fontes locais: `docs/superpowers/specs/2026-07-13-audiflow-recuperacao-finalizacao-design.md` e `docs/superpowers/plans/2026-07-13-audiflow-onda-0-contencao-seguranca.md`.

## Pendências operacionais bloqueantes

| Controle | Estado | Evidência necessária |
|---|---|---|
| Backup pré-correção | NÃO CONFIRMADO | horário UTC, tipo e identificador mantido em canal privado |
| Novos sign-ups | NÃO CONFIRMADO | registro administrativo sanitizado da desabilitação |
| Portal externo | NÃO CONFIRMADO | registro da retirada das rotas externas na hospedagem |
| Staging isolado | NÃO CONFIRMADO | referência do ambiente e matriz de segurança verde |
| Produção | NO-GO | todos os controles anteriores confirmados e checkpoint explícito |

## Registro de mudanças

| Data UTC | Ação | Ambiente | Resultado | Evidência |
|---|---|---|---|---|
| 2026-07-13 | Abertura do incidente e registro do congelamento | Repositório local | Concluído; nenhuma alteração remota executada | Este documento versionado |
| 2026-07-13 | Avaliação de prontidão operacional | Documentação local | Backup, sign-ups, portal e staging NÃO CONFIRMADOS; produção NO-GO | SDD e plano da Onda 0 versionados |

## Restrições de evidência

Não registrar neste repositório senhas, tokens, e-mails, URLs assinadas, identificadores privados de backup, conteúdo de documentos ou dados de clientes. Evidência operacional sensível deve permanecer em canal privado e ser referenciada aqui apenas de forma sanitizada.
