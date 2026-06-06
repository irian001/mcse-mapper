/**
 * ModeloRiscoItemVinculosDialog — Fase 0A.3.6.2
 *
 * Gestão dos vínculos de um item/risco do modelo com regras MCSE existentes:
 * - regra_conta   → public.mcse_regras_conta
 * - documento     → public.mcse_regras_documentos
 * - instrucao     → public.mcse_regras_instrucoes
 * - emissao_erp   → public.mcse_regras_emissao_erp
 *
 * Regras:
 * - Edição (criar/inativar/reativar) somente quando o modelo está em rascunho
 *   e o usuário possui permissão (admin/sócio/gerente).
 * - DELETE físico não é permitido (trigger no banco).
 * - Snapshots (codigo_mcse_snapshot, titulo_vinculo_snapshot, etc.) são
 *   preenchidos pelo trigger do banco — não enviar manualmente.
 *
 * Dívida técnica: types do Supabase ainda não reconhecem
 * `modelo_matriz_risco_item_vinculos`; usamos interface local + `(supabase as any)`.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Info, Plus, Power, RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";

type TipoVinculo = "regra_conta" | "documento" | "instrucao" | "emissao_erp";

const TIPO_LABEL: Record<TipoVinculo, string> = {
  regra_conta: "Regra de conta",
  documento: "Documento",
  instrucao: "Instrução",
  emissao_erp: "Emissão ERP",
};
const TIPO_BADGE: Record<TipoVinculo, string> = {
  regra_conta: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  documento: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  instrucao: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  emissao_erp: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

interface Vinculo {
  id: string;
  modelo_matriz_risco_id: string;
  modelo_matriz_risco_item_id: string;
  tipo_vinculo: TipoVinculo;
  regra_conta_id: string | null;
  regra_documento_id: string | null;
  regra_instrucao_id: string | null;
  regra_emissao_erp_id: string | null;
  ordem: number;
  obrigatorio: boolean;
  ativo: boolean;
  observacoes: string | null;
  codigo_mcse_snapshot: string | null;
  descricao_mcse_snapshot: string | null;
  titulo_vinculo_snapshot: string | null;
  descricao_vinculo_snapshot: string | null;
  tipo_documento_snapshot: string | null;
  erp_nome_snapshot: string | null;
  modulo_erp_snapshot: string | null;
  caminho_emissao_snapshot: string | null;
  nome_relatorio_snapshot: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modeloId: string;
  itemId: string;
  itemLabel: string;
  statusModelo: string;
  canEdit: boolean;
}

function mapErr(err: any, fallback = "Erro inesperado"): string {
  const msg = String(err?.message || "");
  if (err?.code === "42501" || msg.includes("row-level security") || msg.includes("permission") || msg.includes("permissao")) {
    return "Acesso negado: você não tem permissão para esta ação.";
  }
  if (err?.code === "23505" || msg.includes("duplicate") || msg.includes("unique") || msg.includes("uq_mmriv")) {
    return "Este vínculo já existe para o risco selecionado. Reative o vínculo existente, se ele estiver inativo.";
  }
  if (msg.includes("rascunho")) {
    return "Vínculos só podem ser alterados enquanto o modelo estiver em rascunho.";
  }
  if (msg.includes("inativ")) {
    return "A regra/documento/instrução/ERP selecionado está inativo e não pode permanecer em vínculo ativo.";
  }
  if (msg.includes("excluir fisicamente") || msg.includes("Nao e permitido excluir") || msg.includes("não é permitido excluir")) {
    return "Não é permitido excluir fisicamente. Utilize inativação.";
  }
  if (msg.includes("tipo_vinculo")) {
    return "Tipo de vínculo inválido ou inconsistente com a regra selecionada.";
  }
  return msg || fallback;
}

export default function ModeloRiscoItemVinculosDialog({
  open, onOpenChange, modeloId, itemId, itemLabel, statusModelo, canEdit,
}: Props) {
  const qc = useQueryClient();
  const isRascunho = statusModelo === "rascunho";
  const canMutate = canEdit && isRascunho;

  // ----- Listagem -----
  const vinculosQ = useQuery({
    queryKey: ["modelo-risco-item-vinculos", itemId],
    enabled: open && !!itemId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("modelo_matriz_risco_item_vinculos")
        .select("*")
        .eq("modelo_matriz_risco_item_id", itemId)
        .order("ativo", { ascending: false })
        .order("obrigatorio", { ascending: false })
        .order("ordem", { ascending: true })
        .order("tipo_vinculo", { ascending: true });
      if (error) throw error;
      return (data || []) as Vinculo[];
    },
  });

  // ----- Form Adicionar -----
  const [showAdd, setShowAdd] = useState(false);
  const [tipo, setTipo] = useState<TipoVinculo>("regra_conta");
  const [regraId, setRegraId] = useState<string>("");
  const [regraLabel, setRegraLabel] = useState<string>("");
  const [ordem, setOrdem] = useState<string>("0");
  const [obrigatorio, setObrigatorio] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [busca, setBusca] = useState("");

  const resetAdd = () => {
    setShowAdd(false);
    setTipo("regra_conta");
    setRegraId("");
    setRegraLabel("");
    setOrdem("0");
    setObrigatorio(false);
    setObservacoes("");
    setBusca("");
  };

  // ----- Busca por tipo -----
  const searchQ = useQuery({
    queryKey: ["mcse-regras-search", tipo, busca],
    enabled: showAdd && busca.trim().length >= 2,
    queryFn: async () => {
      const term = busca.trim();
      const like = `%${term}%`;
      if (tipo === "regra_conta") {
        const { data, error } = await supabase
          .from("mcse_regras_conta")
          .select("id, codigo_mcse, descricao_mcse, observacao_regra, ativo")
          .or(`codigo_mcse.ilike.${like},descricao_mcse.ilike.${like},observacao_regra.ilike.${like}`)
          .order("ativo", { ascending: false })
          .order("codigo_mcse")
          .limit(40);
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          label: `${r.codigo_mcse || "?"} — ${r.descricao_mcse || ""}`,
          extra: r.observacao_regra || "",
          ativo: r.ativo,
        }));
      }
      if (tipo === "documento") {
        const { data, error } = await supabase
          .from("mcse_regras_documentos")
          .select("id, codigo_mcse, descricao_mcse, tipo_documento, descricao_documento, ativo")
          .or(`codigo_mcse.ilike.${like},descricao_mcse.ilike.${like},tipo_documento.ilike.${like},descricao_documento.ilike.${like}`)
          .order("ativo", { ascending: false })
          .order("codigo_mcse")
          .limit(40);
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          label: `${r.codigo_mcse || "?"} — ${r.tipo_documento || "doc"}`,
          extra: r.descricao_documento || r.descricao_mcse || "",
          ativo: r.ativo,
        }));
      }
      if (tipo === "instrucao") {
        const { data, error } = await supabase
          .from("mcse_regras_instrucoes")
          .select("id, codigo_mcse, descricao_mcse, titulo_instrucao, texto_instrucao, ativo")
          .or(`codigo_mcse.ilike.${like},titulo_instrucao.ilike.${like},texto_instrucao.ilike.${like}`)
          .order("ativo", { ascending: false })
          .order("codigo_mcse")
          .limit(40);
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          label: `${r.codigo_mcse || "?"} — ${r.titulo_instrucao || ""}`,
          extra: r.texto_instrucao || "",
          ativo: r.ativo,
        }));
      }
      // emissao_erp
      const { data, error } = await supabase
        .from("mcse_regras_emissao_erp")
        .select("id, codigo_mcse, descricao_mcse, erp_nome, nome_relatorio, modulo_erp, caminho_emissao, ativo")
        .or(`codigo_mcse.ilike.${like},erp_nome.ilike.${like},nome_relatorio.ilike.${like},modulo_erp.ilike.${like},caminho_emissao.ilike.${like}`)
        .order("ativo", { ascending: false })
        .order("codigo_mcse")
        .limit(40);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        label: `${r.erp_nome || "?"} / ${r.modulo_erp || ""} — ${r.nome_relatorio || ""}`,
        extra: `${r.codigo_mcse || ""} ${r.caminho_emissao || ""}`.trim(),
        ativo: r.ativo,
      }));
    },
  });

  const onChangeTipo = (t: TipoVinculo) => {
    setTipo(t);
    setRegraId("");
    setRegraLabel("");
    setBusca("");
  };

  // ----- Mutations -----
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!regraId) throw new Error("Selecione uma regra para vincular.");
      const ordemNum = parseInt(ordem || "0", 10);
      if (Number.isNaN(ordemNum) || ordemNum < 0) {
        throw new Error("Ordem deve ser um inteiro não negativo.");
      }
      const payload: any = {
        modelo_matriz_risco_id: modeloId,
        modelo_matriz_risco_item_id: itemId,
        tipo_vinculo: tipo,
        regra_conta_id: tipo === "regra_conta" ? regraId : null,
        regra_documento_id: tipo === "documento" ? regraId : null,
        regra_instrucao_id: tipo === "instrucao" ? regraId : null,
        regra_emissao_erp_id: tipo === "emissao_erp" ? regraId : null,
        ordem: ordemNum,
        obrigatorio,
        ativo: true,
        observacoes: observacoes.trim() || null,
      };
      const { error } = await (supabase as any)
        .from("modelo_matriz_risco_item_vinculos")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelo-risco-item-vinculos", itemId] });
      toast.success("Vínculo criado");
      resetAdd();
    },
    onError: (err: any) => toast.error(mapErr(err, "Erro ao criar vínculo")),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (v: Vinculo) => {
      const { error } = await (supabase as any)
        .from("modelo_matriz_risco_item_vinculos")
        .update({ ativo: !v.ativo })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelo-risco-item-vinculos", itemId] });
      toast.success("Status alterado");
    },
    onError: (err: any) => toast.error(mapErr(err, "Erro ao alterar status")),
  });

  const vinculos = vinculosQ.data || [];

  const renderSnapshot = (v: Vinculo) => {
    const parts: string[] = [];
    if (v.titulo_vinculo_snapshot) parts.push(v.titulo_vinculo_snapshot);
    if (v.tipo_documento_snapshot) parts.push(`Doc: ${v.tipo_documento_snapshot}`);
    if (v.erp_nome_snapshot || v.modulo_erp_snapshot || v.nome_relatorio_snapshot) {
      parts.push(`${v.erp_nome_snapshot || ""}${v.modulo_erp_snapshot ? "/" + v.modulo_erp_snapshot : ""}${v.nome_relatorio_snapshot ? " — " + v.nome_relatorio_snapshot : ""}`);
    }
    if (v.caminho_emissao_snapshot) parts.push(v.caminho_emissao_snapshot);
    if (v.descricao_vinculo_snapshot) parts.push(v.descricao_vinculo_snapshot);
    return parts.filter(Boolean).join(" · ");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAdd(); onOpenChange(v); }}>
      <DialogContent className="flex flex-col overflow-hidden w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh] p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pr-16">
          <DialogTitle>Vínculos do Risco do Modelo</DialogTitle>
          <DialogDescription className="line-clamp-2">{itemLabel}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {!isRascunho && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                Vínculos de modelos publicados, substituídos ou arquivados ficam bloqueados para edição.
                Crie nova versão do modelo para alterar vínculos.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {vinculos.length} vínculo{vinculos.length !== 1 ? "s" : ""}
            </div>
            {canMutate && !showAdd && (
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus size={14} className="mr-1" /> Adicionar vínculo
              </Button>
            )}
          </div>

          {/* Form de adicionar */}
          {showAdd && canMutate && (
            <div className="rounded-md border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Novo vínculo</div>
                <Button size="sm" variant="ghost" onClick={resetAdd}>
                  <X size={14} />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={tipo} onValueChange={(v) => onChangeTipo(v as TipoVinculo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPO_LABEL) as TipoVinculo[]).map((t) => (
                        <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" min={0} value={ordem} onChange={(e) => setOrdem(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={obrigatorio} onCheckedChange={(v) => setObrigatorio(!!v)} />
                  <Label className="m-0">Obrigatório</Label>
                </div>
              </div>

              {/* Busca da regra */}
              <div className="space-y-2">
                <Label>Regra ({TIPO_LABEL[tipo]}) *</Label>
                {regraId ? (
                  <div className="flex items-center justify-between gap-2 text-sm rounded-md bg-background border px-3 py-2">
                    <span className="line-clamp-1">{regraLabel}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setRegraId(""); setRegraLabel(""); }}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder={`Buscar em ${TIPO_LABEL[tipo]} (mín. 2 caracteres)...`}
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                      />
                    </div>
                    {busca.trim().length >= 2 && (
                      <div className="rounded-md border max-h-56 overflow-y-auto bg-background">
                        {searchQ.isLoading ? (
                          <div className="p-2 text-sm text-muted-foreground">Buscando...</div>
                        ) : (searchQ.data || []).length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">Nenhum resultado.</div>
                        ) : (
                          (searchQ.data || []).map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0"
                              onClick={() => {
                                setRegraId(r.id);
                                setRegraLabel(r.label);
                                setBusca("");
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{r.label}</span>
                                {!r.ativo && <Badge variant="outline" className="bg-muted">Inativo</Badge>}
                              </div>
                              {r.extra && (
                                <div className="text-xs text-muted-foreground line-clamp-1">{r.extra}</div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={resetAdd}>Cancelar</Button>
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !regraId}>
                  Criar vínculo
                </Button>
              </div>
            </div>
          )}

          {/* Listagem */}
          {vinculosQ.isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : vinculosQ.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Erro ao carregar vínculos: {mapErr(vinculosQ.error)}</span>
            </div>
          ) : vinculos.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground border rounded-md">
              Nenhum vínculo cadastrado para este risco.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Ordem</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[140px]">Código MCSE</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculos.map((v) => (
                    <TableRow key={v.id} className={!v.ativo ? "opacity-60" : ""}>
                      <TableCell className="tabular-nums">{v.ordem}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TIPO_BADGE[v.tipo_vinculo]}>
                          {TIPO_LABEL[v.tipo_vinculo] || v.tipo_vinculo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono">{v.codigo_mcse_snapshot || "—"}</div>
                        <div className="text-muted-foreground line-clamp-1">{v.descricao_mcse_snapshot || ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{v.titulo_vinculo_snapshot || "—"}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{renderSnapshot(v)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {v.obrigatorio && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Obrig.</Badge>
                          )}
                          {!v.ativo && <Badge variant="outline" className="bg-muted">Inativo</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground line-clamp-2">
                        {v.observacoes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canMutate ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleAtivoMutation.mutate(v)}
                            disabled={toggleAtivoMutation.isPending}
                            title={v.ativo ? "Inativar" : "Reativar"}
                          >
                            {v.ativo ? <Power size={14} /> : <RotateCcw size={14} />}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
