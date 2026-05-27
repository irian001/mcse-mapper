import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Layers, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useSegmentos } from "@/hooks/useSegmentos";
import { useModalidadesAtuacao, type ModalidadeAtuacao } from "@/hooks/useModalidadesAtuacao";
import { useUserProfile } from "@/hooks/useUserProfile";

const emptyForm = {
  codigo: "",
  nome: "",
  descricao: "",
  ordem: 0,
  ativo: true,
};

export default function SegmentosModalidadesPage() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();
  const isAdmin = profile?.auditor?.perfil_acesso === "admin";

  const { data: segmentos = [], isLoading: loadingSeg } = useSegmentos();
  const [segmentoId, setSegmentoId] = useState<string | null>(null);

  useEffect(() => {
    if (!segmentoId && segmentos.length > 0) setSegmentoId(segmentos[0].id);
  }, [segmentos, segmentoId]);

  const { data: modalidades = [], isLoading: loadingMod, error: errMod } = useModalidadesAtuacao(segmentoId);

  const segmentoAtual = useMemo(
    () => segmentos.find((s) => s.id === segmentoId) || null,
    [segmentos, segmentoId]
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModalidadeAtuacao | null>(null);
  const [form, setForm] = useState(emptyForm);

  // --- Novo Segmento (admin) ---
  const [segOpen, setSegOpen] = useState(false);
  const [segForm, setSegForm] = useState({ codigo: "", nome: "", descricao: "", ordem: 0 });

  const createSegmento = useMutation({
    mutationFn: async () => {
      const codigo = segForm.codigo.trim();
      const nome = segForm.nome.trim();
      const descricao = segForm.descricao.trim();
      if (!codigo) throw new Error("Informe o código");
      if (!nome) throw new Error("Informe o nome");
      if (segForm.ordem < 0) throw new Error("Ordem não pode ser negativa");

      const payload: any = {
        codigo,
        nome,
        descricao: descricao || null,
        ordem: Number(segForm.ordem) || 0,
        ativo: true,
      };
      const { data, error } = await (supabase.from as any)("segmentos")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: async (newId) => {
      await qc.invalidateQueries({ queryKey: ["segmentos"] });
      toast.success("Segmento criado");
      setSegOpen(false);
      setSegForm({ codigo: "", nome: "", descricao: "", ordem: 0 });
      if (newId) setSegmentoId(newId);
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (err?.code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Acesso negado: apenas administradores podem criar segmentos.");
      } else if (err?.code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Já existe um segmento com este código ou nome.");
      } else {
        toast.error(msg || "Erro ao criar segmento");
      }
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!segmentoId) throw new Error("Selecione um segmento");
      if (!form.codigo.trim()) throw new Error("Informe o código");
      if (!form.nome.trim()) throw new Error("Informe o nome");
      if (form.ordem < 0) throw new Error("Ordem não pode ser negativa");

      const payload: any = {
        segmento_id: segmentoId,
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        ordem: Number(form.ordem) || 0,
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await (supabase.from as any)("modalidades_atuacao")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("modalidades_atuacao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modalidades-atuacao"] });
      toast.success(editing ? "Modalidade atualizada" : "Modalidade criada");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (err?.code === "23505" || msg.includes("duplicate") || msg.includes("modalidades_atuacao_segmento_codigo")) {
        toast.error("Já existe uma modalidade com este código neste segmento.");
      } else if (err?.code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Acesso negado: apenas administradores podem alterar modalidades.");
      } else {
        toast.error(msg || "Erro ao salvar");
      }
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async (m: ModalidadeAtuacao) => {
      const { error } = await (supabase.from as any)("modalidades_atuacao")
        .update({ ativo: !m.ativo })
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modalidades-atuacao"] });
      toast.success("Status atualizado");
    },
    onError: (err: any) => {
      if (err?.code === "42501") toast.error("Acesso negado: apenas administradores.");
      else toast.error(err.message || "Erro ao alterar status");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (m: ModalidadeAtuacao) => {
    setEditing(m);
    setForm({
      codigo: m.codigo,
      nome: m.nome,
      descricao: m.descricao || "",
      ordem: m.ordem ?? 0,
      ativo: m.ativo,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segmentos e Modalidades de Atuação"
        description="Visualize segmentos existentes e mantenha as modalidades de atuação por segmento."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Painel de Segmentos */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers size={16} /> Segmentos
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setSegOpen(true)}>
                <Plus size={14} className="mr-1" /> Novo segmento
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground flex gap-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                Novos segmentos podem ser cadastrados por administrador. Alterações ou inativação de segmentos já utilizados serão tratadas em etapa posterior, considerando vínculos com clientes, estruturas e produtos.
              </span>
            </div>


            {loadingSeg ? (
              <p className="text-sm text-muted-foreground">Carregando segmentos...</p>
            ) : segmentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum segmento cadastrado.</p>
            ) : (
              <ul className="space-y-1">
                {segmentos.map((s) => {
                  const active = s.id === segmentoId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSegmentoId(s.id)}
                        className={`w-full text-left rounded-md px-3 py-2 border transition ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{s.nome}</span>
                          {!s.ativo && (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{s.codigo}</div>
                        {s.descricao && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.descricao}</div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Painel de Modalidades */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                Modalidades de Atuação
                {segmentoAtual && (
                  <span className="text-muted-foreground font-normal"> — {segmentoAtual.nome}</span>
                )}
              </CardTitle>
            </div>
            {isAdmin && segmentoId && (
              <Button size="sm" onClick={openNew}>
                <Plus size={14} className="mr-1" /> Nova modalidade
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!segmentoId ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Selecione um segmento para visualizar suas modalidades de atuação.
              </p>
            ) : loadingMod ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando modalidades...</p>
            ) : errMod ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>Erro ao carregar modalidades: {(errMod as any)?.message || "desconhecido"}</span>
              </div>
            ) : modalidades.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Este segmento ainda não possui modalidades de atuação cadastradas.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[80px] text-right">Ordem</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      {isAdmin && <TableHead className="w-[160px] text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalidades.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.codigo}</TableCell>
                        <TableCell className="font-medium">{m.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.descricao || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.ordem ?? 0}</TableCell>
                        <TableCell>
                          {m.ativo ? (
                            <Badge variant="outline" className="bg-success/15 text-success border-success/30">Ativo</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Inativo</Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                                <Pencil size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleAtivo.mutate(m)}
                                disabled={toggleAtivo.isPending}
                              >
                                {m.ativo ? "Inativar" : "Ativar"}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar modalidade" : "Nova modalidade"}
              {segmentoAtual && (
                <span className="block text-xs font-normal text-muted-foreground mt-1">
                  Segmento: {segmentoAtual.nome}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Segmento</Label>
              <Input value={segmentoAtual?.nome || ""} disabled />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div>
                <Label>Código *</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="Ex.: REGULADO"
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome da modalidade"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            {editing && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-xs text-muted-foreground">
                    Use o botão Ativar/Inativar na listagem para alterar o status.
                  </div>
                </div>
                {form.ativo ? (
                  <Badge variant="outline" className="bg-success/15 text-success border-success/30">Ativo</Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Inativo</Badge>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {editing ? "Salvar alterações" : "Criar modalidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
