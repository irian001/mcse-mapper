# Diagnóstico — Procedimentos Específicos / ODI

## 1. O que existe hoje no projeto

### Rotas e telas
- Hub: `src/pages/hubs/ProcedimentosHubPage.tsx` — card "Ordens de Imobilização" linkando para `/procedimentos-auxiliares?tipo=ordens_imobilizacao`.
- Página principal: `src/pages/ProcedimentosAuxiliaresPage.tsx` — CRUD genérico para todos os tipos de procedimento.
- Detalhe: `src/components/procedimentos/ProcedimentoDetailDialog.tsx` — 4 abas (Dados Gerais, Execução, Evidências, Conclusão).
- Execução dinâmica: `src/components/procedimentos/ExecucaoProcedimentoPanel.tsx` — switch por `tipo_procedimento`.

### Componentes de execução por tipo
| Tipo | Componente | Status |
|---|---|---|
| contagem_caixa | `ContagemCaixaPanel` | Implementado |
| contagem_estoque | `ContagemEstoquePanel` | Implementado |
| faturas_em_aberto | `FaturasEmAbertoPanel` | Implementado |
| ordens_compra | `PlaceholderExecucao` | Placeholder |
| **ordens_imobilizacao (ODI)** | `PlaceholderExecucao` | **Placeholder** |

### Tabelas Supabase relacionadas
- `procedimentos_auxiliares` (cabeçalho comum) — vincula `trabalho_auditoria_id`, `cliente_id`, `exercicio_id`, `conta_mcse_id`, responsáveis, status, datas, conclusões.
- `procedimento_auxiliar_documentos` (evidências/anexos via bucket `documentos-balancete`).
- Não há tabela específica `procedimento_ordens_imobilizacao_*`, `odi_*`, `imobiliza*` ou similar.

### Vínculos existentes para ODI
- Vincula a trabalho/cliente/exercício via cabeçalho `procedimentos_auxiliares`.
- Permite anexar conta MCSE (`conta_mcse_id`).
- Permite anexar documentos genéricos (evidências).
- Permite registrar conclusão preliminar/final do auditor.
- **Não** há vínculo formal com PTA, solicitações documentais ou matriz de riscos para o tipo ODI.

## 2. Lacunas para a frente ODI

- Sem painel de execução dedicado (`PlaceholderExecucao` apenas).
- Sem cadastro/importação de lista de ordens em curso.
- Sem campos específicos: nº da ordem, descrição da obra/projeto, data de abertura, valor acumulado, UAR, responsável técnico, status (em curso/concluída/encerrada/baixada), data prevista de capitalização, data efetiva de entrada em operação.
- Sem conciliação automática ODI × saldo contábil (imobilizado em curso) × MCSE.
- Sem análise individual por ordem (achado, recomendação, classificação de risco).
- Sem dashboard ODI (totais, antiguidade, ordens paradas, ordens concluídas não capitalizadas).
- Sem vínculo formal com solicitações documentais (contrato, NF, medição, ART, termo de aceite, fotos).
- Sem regra MCSE específica para contas de imobilizado em curso aplicada ao módulo.

## 3. Fluxo atual (real)

1. Auditor entra no hub Procedimentos.
2. Clica em "Ordens de Imobilização" → tela filtra `tipo=ordens_imobilizacao`.
3. Cria procedimento (seleciona trabalho/cliente/exercício/MCSE/responsáveis/datas).
4. Abre detalhe → aba Execução exibe placeholder.
5. Pode anexar evidências e registrar conclusão textual.
6. Status genérico (planejado → em_execução → em_revisão → concluído/encerrado).

## 4. Plano de testes — Procedimentos Específicos / ODI

### Bloco A — Navegação e permissões
- A1 Acessar hub Procedimentos como auditor (admin, sócio, gerente, sênior, assistente).
- A2 Confirmar bloqueio de acesso para `cliente_usuario` (rota interna).
- A3 Confirmar que listagem traz apenas procedimentos de trabalhos acessíveis (RLS `get_accessible_trabalho_ids`).
- A4 Filtro `?tipo=ordens_imobilizacao` na URL sincroniza com o seletor.

### Bloco B — Seleção do trabalho
- B1 Criar ODI sem trabalho selecionado → impedir/validar.
- B2 Trocar trabalho → cliente/exercício recarregam coerentes.
- B3 Trabalho inativo/encerrado → comportamento esperado (bloqueio ou aviso).

### Bloco C — Cadastro/listagem de ODI
- C1 Criar ODI com campos mínimos (título, trabalho, MCSE de imobilizado em curso).
- C2 Editar e arquivar.
- C3 Listar com filtros (cliente, trabalho, status, MCSE, período).
- C4 Busca textual por título/descrição.
- C5 Exclusão restrita a admin (campo `canDelete`).

### Bloco D — Execução (estado atual — placeholder)
- D1 Aba Execução exibe placeholder corretamente.
- D2 Confirmar que evidências e conclusão funcionam mesmo sem painel próprio.
- D3 Documentar gap para Bloco D' futuro (ordens em curso reais).

### Bloco D' — Ordens em curso (futuro, quando implementado)
- D'1 Importar planilha de ordens em curso (nº, descrição, abertura, valor, conta, responsável).
- D'2 Listar com filtros (status, conta MCSE, antiguidade, faixa de valor).
- D'3 Ordenar por valor / por data abertura.
- D'4 Marcar ordem como concluída/encerrada/baixada.

### Bloco E — Consistência contábil
- E1 Comparar somatório de ordens em curso × saldo da conta MCSE de imobilizado em curso no balancete do trabalho.
- E2 Identificar diferença (auxiliar vs contábil).
- E3 Detectar ordens sem conta MCSE atribuída.
- E4 Detectar ordens com conta incompatível (ex.: vinculadas a despesa).

### Bloco F — Análise patrimonial
- F1 Validar objeto/descrição da ordem (texto suficiente).
- F2 Validar obra/projeto vinculado.
- F3 Validar UAR / unidade patrimonial quando aplicável.
- F4 Identificar gasto não capitalizável (manutenção em imobilização).
- F5 Detectar reforma/ampliação sem caracterização.
- F6 Sinalizar ordens paradas (sem movimentação > X dias).

### Bloco G — Encerramento / capitalização
- G1 Ordens concluídas tecnicamente ainda em "em curso".
- G2 Ordens encerradas no período sem transferência para imobilizado em serviço.
- G3 Validar data de entrada em operação.
- G4 Validar documentação de encerramento.
- G5 Baixas/estornos com justificativa.

### Bloco H — Evidências
- H1 Anexar contrato, NF, medição, relatório técnico, ART, termo de aceite.
- H2 Validar versionamento.
- H3 Vincular evidência a item específico (futuro).
- H4 Integrar com `solicitacoes_documentos` (futuro).

### Bloco I — Conclusão do auditor
- I1 Registrar conclusão preliminar.
- I2 Registrar conclusão final.
- I3 Classificar achados (futuro).
- I4 Registrar recomendações.
- I5 Bloquear edição após `concluido`/`encerrado` para não-admin.

### Bloco J — Integridade e regressão
- J1 Operar ODI não quebra PTA do trabalho.
- J2 Não interfere em riscos, planejamento ou materialidade.
- J3 Não duplica procedimentos.
- J4 Exclusão respeita RLS e perfil.

## 5. Queries / validações sugeridas (apenas conceito — não executar)

- Total de ordens em curso por trabalho × saldo MCSE no balancete vigente.
- Distribuição de ordens por conta MCSE (futuro, requer tabela ODI).
- Ordens sem movimentação > 180 / 365 / 730 dias.
- Ordens com valor acumulado acima da materialidade vigente do trabalho.
- Ordens com descrição vazia ou < N caracteres.
- Ordens sem documento/evidência anexada.
- Ordens sem responsável técnico.
- Ordens concluídas sem capitalização registrada.
- Diferença saldo auxiliar (ODI) × saldo contábil por conta.
- Procedimentos `tipo=ordens_imobilizacao` sem `conta_mcse_id` preenchida.
- Procedimentos ODI por status e por trabalho, com idade desde criação.

## 6. Riscos de auditoria aplicáveis a ODI

- Capitalização indevida de despesa de manutenção.
- Manutenção classificada como imobilização.
- Ordem em curso sem expectativa de conclusão (ativo "fantasma").
- Ativo já em operação mantido em imobilizado em curso (atraso de capitalização → impacto em depreciação).
- Ausência de documentação técnica (ART, projeto, termo).
- Ausência de aprovação interna.
- Divergência entre auxiliar de ordens e contabilidade.
- Baixa/encerramento não registrado.
- Obra paralisada sem teste de recuperabilidade (impairment).
- Materiais aplicados sem baixa de estoque.
- Custos administrativos/financeiros indevidamente apropriados.
- Ausência de identificação patrimonial física (plaqueta/UAR).
- Divergência com Manual de Controle Patrimonial do Setor Elétrico e contas MCSE.

## 7. Roadmap recomendado (sem implementação agora)

- **PE-ODI.0** — Diagnóstico + plano de testes (esta entrega).
- **PE-ODI.1** — Ajustes mínimos de navegação/testabilidade (rotular placeholder, links contextuais), se necessário.
- **PE-ODI.2** — Cadastro/importação de ordens em curso (tabela própria + importador XLSX/CSV).
- **PE-ODI.3** — Conciliação ODI × balancete × MCSE (painel de diferenças).
- **PE-ODI.4** — Análise individual da ordem (status, achados, recomendações, riscos).
- **PE-ODI.5** — Evidências e integração com solicitações documentais.
- **PE-ODI.6** — Conclusão do auditor com classificação de achado.
- **PE-ODI.7** — Dashboard ODI (antiguidade, valor, ordens paradas, capitalizações pendentes).

## 8. Próxima ação segura

Aprovar este diagnóstico e priorizar **PE-ODI.0 → PE-ODI.1**: executar a bateria de testes manuais dos blocos A, B, C, D, H e I sobre o estado atual (placeholder) para registrar evidências de funcionamento do cabeçalho ODI antes de qualquer mudança estrutural. Somente após esses testes decidir se segue para PE-ODI.2 (modelagem de tabela própria) ou se adapta um fluxo intermediário usando apenas evidências e conclusão textual.

## 9. Confirmação

Nada foi implementado, alterado ou criado. Não foram tocados: código, banco, SQL, migrations, `types.ts`, fase 0A.3.7, nem criadas novas telas. Esta entrega é exclusivamente de análise e planejamento.
