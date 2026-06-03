import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Eye, AlertTriangle, CheckCircle2, Archive, Info } from "lucide-react";
import { toast } from "sonner";
import { useSegmentos, useEstruturasAuditoria } from "@/hooks/useSegmentos";
import { useModalidadesAtuacao } from "@/hooks/useModalidadesAtuacao";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useModelosMatrizRiscos,
  type ModeloMatrizRiscos,
  type ModelosFiltros,
} from "@/hooks/useModelosMatrizRiscos";

const ALL = "__all__";

interface FormState {
  segmento_id: string;
  modalidade_atuacao_id: string;
  produto_auditoria_id: string;
  estrutura_auditoria_id: string;
  codigo_modelo: string;
  nome_modelo: string;
  descricao: string;
  objetivo_modelo: string;
  escopo_padrao: string;
  versao: string;
  observacoes: string;
  ativo: boolean;
}

const emptyForm: FormState = {
  segmento_id: "",
  modalidade_atuacao_id: "",
  produto_auditoria_id: "",
  estrutura_auditoria_id: "",
  codigo_modelo: "",
  nome_modelo: "",
  descricao: "",
  objetivo_modelo: "",
  escopo_padrao: "",
  versao: "1.0",
  observacoes: "",
  ativo: true,
};

function StatusBadge({ status, vigente, ativo }: { status: string; vigente: boolean; ativo: boolean }) {
  const map: Record<string, string> = {
    rascunho: "bg-muted text-muted-foreground border-border",
    publicado: "bg-success/15 text-success border-success/30",
    substituido: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    arquivado: "bg-destructive/10 text-destructive border-destructive/30",
  };
  const label: Record<string, string> = {
    rascunho: "Rascunho",
    publicado: "Publicado",
    substituido: "Substituído",
    arquivado: "Arquivado",
  };
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="outline" className={map[status] || ""}>{label[status] || status}</Badge>
      {vigente && (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Vigente</Badge>
      )}
      {!ativo && (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Inativo</Badge>
      )}
    </div>
  );
}

export default function ModelosMatrizRiscosPage() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();
  const perfil = profile?.auditor?.perfil_acesso as string | undefined;
  const canCreate = perfil === "admin" || perfil === "socio" || perfil === "gerente";
  const canPublish = perfil === "admin" || perfil === "socio";
  const canArchive = perfil === "admin" || perfil === "socio";

  // ----- filters -----
  const [filtros, setFiltros] = useState<ModelosFiltros>({
    busca: "",
    segmentoId: null,
    modalidadeId: null,
    produtoId: null,
    estruturaId: null,
    status: null,
    vigente: "todos",
    ativo: "todos",
  });

  const { data: segmentos = [] } = useSegmentos();
  const { data: filtroModalidades = [] } = useModalidadesAtuacao(filtros.segmentoId);
  const { data: filtroEstruturas = [] } = useEstruturasAuditoria(filtros.segmentoId);
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-auditoria-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos_auditoria")
        .select("id, codigo_produto, nome_produto, ativo")
        .eq("ativo", true)
        .order("nome_produto");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: modelos = [], isLoading, error } = useModelosMatrizRiscos(filtros);

  const segMap = useMemo(() => Object.fromEntries(segmentos.map((s) => [s.id, s])), [segmentos]);
  const prodMap = useMemo(
    () => Object.fromEntries((produtos as any[]).map((p) => [p.id, p])),
    [produtos]
  );

  // ----- form dialog -----
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModeloMatrizRiscos | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: formModalidades = [] } = useModalidadesAtuacao(form.segmento_id || null);
  const { data: formEstruturas = [] } = useEstruturasAuditoria(form.segmento_id || null);

  // labels for lookup of editing record names
  const lookupModalidade = useQuery({
    queryKey: ["modalidade-lookup", editing?.modalidade_atuacao_id],
    enabled: !!editing?.modalidade_atuacao_id,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("modalidades_atuacao")
        .select("id, nome, codigo, segmento_id")
        .eq("id", editing!.modalidade_atuacao_id)
        .maybeSingle();
      return data;
    },
  });

  const openNew = () => {
    setEditing(null);
    setReadOnly(false);
    setForm(emptyForm);
    setOpen(true);
  };

  const openRow = (m: ModeloMatrizRiscos) => {
    setEditing(m);
    setReadOnly(m.status_modelo !== "rascunho");
    setForm({
      segmento_id: m.segmento_id,
      modalidade_atuacao_id: m.modalidade_atuacao_id,
      produto_auditoria_id: m.produto_auditoria_id,
      estrutura_auditoria_id: m.estrutura_auditoria_id || "",
      codigo_modelo: m.codigo_modelo,
      nome_modelo: m.nome_modelo,
      descricao: m.descricao || "",
      objetivo_modelo: m.objetivo_modelo || "",
      escopo_padrao: m.escopo_padrao || "",
      versao: m.versao,
      observacoes: m.observacoes || "",
      ativo: m.ativo,
    });
    setOpen(true);
  };

  function mapErr(err: any, fallback = "Erro inesperado"): string {
    const msg = String(err?.message || "");
    if (err?.code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
      return "Acesso negado: você não tem permissão para esta ação.";
    }
    if (err?.code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
      return "Já existe um modelo com este código + versão.";
    }
    if (msg.includes("modalidade") && msg.includes("segmento")) {
      return "A modalidade selecionada não pertence ao segmento informado.";
    }
    if (msg.includes("estrutura") && msg.includes("segmento")) {
      return "A estrutura selecionada não pertence ao segmento informado.";
    }
    if (msg.includes("rascunho")) {
      return msg;
    }
    return msg || fallback;
  }

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.segmento_id) throw new Error("Selecione o segmento.");
      if (!form.modalidade_atuacao_id) throw new Error("Selecione a modalidade.");
      if (!form.produto_auditoria_id) throw new Error("Selecione o produto de auditoria.");
      if (!form.codigo_modelo.trim()) throw new Error("Informe o código.");
      if (!form.nome_modelo.trim()) throw new Error("Informe o nome.");
      if (!form.versao.trim()) throw new Error("Informe a versão.");

      const payload: any = {
        segmento_id: form.segmento_id,
        modalidade_atuacao_id: form.modalidade_atuacao_id,
        produto_auditoria_id: form.produto_auditoria_id,
        estrutura_auditoria_id: form.estrutura_auditoria_id || null,
        codigo_modelo: form.codigo_modelo.trim(),
        nome_modelo: form.nome_modelo.trim(),
        descricao: form.descricao.trim() || null,
        objetivo_modelo: form.objetivo_modelo.trim() || null,
        escopo_padrao: form.escopo_padrao.trim() || null,
        observacoes: form.observacoes.trim() || null,
        versao: form.versao.trim(),
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await (supabase.from as any)("modelos_matriz_riscos")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.status_modelo = "rascunho";
        payload.vigente = false;
        const { error } = await (supabase.from as any)("modelos_matriz_riscos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelos-matriz-riscos"] });
      toast.success(editing ? "Modelo atualizado" : "Modelo criado em rascunho");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(mapErr(err, "Erro ao salvar modelo")),
  });

  const publish = useMutation({
    mutationFn: async ({ id, vigente }: { id: string; vigente: boolean }) => {
      const { error } = await (supabase as any).rpc("publicar_modelo_matriz_riscos", {
        p_modelo_id: id,
        p_vigente: vigente,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelos-matriz-riscos"] });
      toast.success("Modelo publicado");
    },
    onError: (err: any) => toast.error(mapErr(err, "Erro ao publicar")),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("arquivar_modelo_matriz_riscos", {
        p_modelo_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelos-matriz-riscos"] });
      toast.success("Modelo arquivado");
    },
    onError: (err: any) => toast.error(mapErr(err, "Erro ao arquivar")),
  });

  // confirm dialogs (publish/archive)
  const [confirmPublish, setConfirmPublish] = useState<{ id: string; vigente: boolean } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos de Matriz de Riscos"
        description="Cadastre, publique e arquive os modelos padrão de matriz de riscos por segmento, modalidade e produto."
        actions={
          canCreate ? (
            <Button onClick={openNew}>
              <Plus size={16} className="mr-1" /> Novo modelo
            </Button>
          ) : null
        }
      />

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <Label>Busca</Label>
            <Input
              placeholder="Código, nome ou descrição"
              value={filtros.busca || ""}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
          </div>
          <div>
            <Label>Segmento</Label>
            <Select
              value={filtros.segmentoId || ALL}
              onValueChange={(v) =>
                setFiltros({
                  ...filtros,
                  segmentoId: v === ALL ? null : v,
                  modalidadeId: null,
                  estruturaId: null,
                })
              }
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {segmentos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Modalidade</Label>
            <Select
              value={filtros.modalidadeId || ALL}
              onValueChange={(v) => setFiltros({ ...filtros, modalidadeId: v === ALL ? null : v })}
              disabled={!filtros.segmentoId}
            >
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {filtroModalidades.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Produto</Label>
            <Select
              value={filtros.produtoId || ALL}
              onValueChange={(v) => setFiltros({ ...filtros, produtoId: v === ALL ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(produtos as any[]).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome_produto}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estrutura</Label>
            <Select
              value={filtros.estruturaId || ALL}
              onValueChange={(v) => setFiltros({ ...filtros, estruturaId: v === ALL ? null : v })}
              disabled={!filtros.segmentoId}
            >
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {filtroEstruturas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={filtros.status || ALL}
              onValueChange={(v) => setFiltros({ ...filtros, status: v === ALL ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="substituido">Substituído</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vigente</Label>
            <Select
              value={filtros.vigente || "todos"}
              onValueChange={(v) => setFiltros({ ...filtros, vigente: v as any })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ativo</Label>
            <Select
              value={filtros.ativo || "todos"}
              onValueChange={(v) => setFiltros({ ...filtros, ativo: v as any })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listagem */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modelos cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Erro ao carregar modelos: {(error as any)?.message || "desconhecido"}</span>
            </div>
          ) : modelos.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum modelo cadastrado.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[70px]">Versão</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[180px]">Status</TableHead>
                    <TableHead className="w-[130px]">Publicado em</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((m) => {
                    const isRascunho = m.status_modelo === "rascunho";
                    const isPubOuSubst = m.status_modelo === "publicado" || m.status_modelo === "substituido";
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.codigo_modelo}</TableCell>
                        <TableCell className="font-medium">{m.nome_modelo}</TableCell>
                        <TableCell className="tabular-nums">{m.versao}</TableCell>
                        <TableCell className="text-sm">{segMap[m.segmento_id]?.nome || "—"}</TableCell>
                        <TableCell className="text-sm">{prodMap[m.produto_auditoria_id]?.nome_produto || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={m.status_modelo} vigente={m.vigente} ativo={m.ativo} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.data_publicacao ? new Date(m.data_publicacao).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openRow(m)} title={isRascunho && canCreate ? "Editar" : "Visualizar"}>
                              {isRascunho && canCreate ? <Pencil size={14} /> : <Eye size={14} />}
                            </Button>
                            {isRascunho && canPublish && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmPublish({ id: m.id, vigente: true })}
                                title="Publicar"
                              >
                                <CheckCircle2 size={14} />
                              </Button>
                            )}
                            {isPubOuSubst && canArchive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmArchive(m.id)}
                                title="Arquivar"
                              >
                                <Archive size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(emptyForm);
            setReadOnly(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? (readOnly ? "Visualizar modelo" : "Editar modelo") : "Novo modelo"}
            </DialogTitle>
            {editing && (
              <DialogDescription>
                <StatusBadge status={editing.status_modelo} vigente={editing.vigente} ativo={editing.ativo} />
              </DialogDescription>
            )}
          </DialogHeader>

          {readOnly && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                Modelos publicados, substituídos ou arquivados não devem ser editados diretamente. Crie nova versão quando necessário.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Segmento *</Label>
              <Select
                value={form.segmento_id}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    segmento_id: v,
                    modalidade_atuacao_id: "",
                    estrutura_auditoria_id: "",
                  })
                }
                disabled={readOnly}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {segmentos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modalidade *</Label>
              <Select
                value={form.modalidade_atuacao_id}
                onValueChange={(v) => setForm({ ...form, modalidade_atuacao_id: v })}
                disabled={readOnly || !form.segmento_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.segmento_id ? "Selecione..." : "Selecione um segmento"} />
                </SelectTrigger>
                <SelectContent>
                  {formModalidades.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} {!m.ativo && "(inativa)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Produto de Auditoria *</Label>
              <Select
                value={form.produto_auditoria_id}
                onValueChange={(v) => setForm({ ...form, produto_auditoria_id: v })}
                disabled={readOnly}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(produtos as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_produto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estrutura (opcional)</Label>
              <Select
                value={form.estrutura_auditoria_id || ALL}
                onValueChange={(v) => setForm({ ...form, estrutura_auditoria_id: v === ALL ? "" : v })}
                disabled={readOnly || !form.segmento_id}
              >
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Nenhuma</SelectItem>
                  {formEstruturas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código *</Label>
              <Input
                value={form.codigo_modelo}
                onChange={(e) => setForm({ ...form, codigo_modelo: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Versão *</Label>
              <Input
                value={form.versao}
                onChange={(e) => setForm({ ...form, versao: e.target.value })}
                disabled={readOnly}
                placeholder="1.0"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome_modelo}
                onChange={(e) => setForm({ ...form, nome_modelo: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Objetivo</Label>
              <Textarea
                rows={2}
                value={form.objetivo_modelo}
                onChange={(e) => setForm({ ...form, objetivo_modelo: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Escopo padrão</Label>
              <Textarea
                rows={2}
                value={form.escopo_padrao}
                onChange={(e) => setForm({ ...form, escopo_padrao: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
                {editing ? "Salvar alterações" : "Criar rascunho"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Publish */}
      <Dialog open={!!confirmPublish} onOpenChange={(v) => !v && setConfirmPublish(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar modelo</DialogTitle>
            <DialogDescription>
              Deseja publicar este modelo e marcá-lo como vigente para esta combinação de segmento, modalidade e produto? Caso já exista outro modelo vigente para a mesma combinação, ele deixará de ser vigente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setConfirmPublish(null)}>Cancelar</Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirmPublish) {
                  publish.mutate({ id: confirmPublish.id, vigente: false });
                  setConfirmPublish(null);
                }
              }}
              disabled={publish.isPending}
            >
              Publicar sem vigência
            </Button>
            <Button
              onClick={() => {
                if (confirmPublish) {
                  publish.mutate({ id: confirmPublish.id, vigente: true });
                  setConfirmPublish(null);
                }
              }}
              disabled={publish.isPending}
            >
              Publicar como vigente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Archive */}
      <Dialog open={!!confirmArchive} onOpenChange={(v) => !v && setConfirmArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar modelo</DialogTitle>
            <DialogDescription>
              Deseja arquivar este modelo? Ele deixará de ficar ativo e não será usado futuramente para sugestão de matriz de riscos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmArchive(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmArchive) {
                  archive.mutate(confirmArchive);
                  setConfirmArchive(null);
                }
              }}
              disabled={archive.isPending}
            >
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
