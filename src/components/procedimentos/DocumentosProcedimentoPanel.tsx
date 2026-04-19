import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";

const TIPOS_DOCUMENTO = [
  { value: "termo_contagem_assinado", label: "Termo de Contagem Assinado", evidencia: true },
  { value: "anexo_suporte", label: "Anexo de Suporte" },
  { value: "foto_evidencia", label: "Foto / Evidência" },
  { value: "planilha_apoio", label: "Planilha de Apoio" },
  { value: "outro", label: "Outro" },
];

const BUCKET = "documentos-balancete";

interface Props {
  procedimentoId: string;
  defaultTipo?: string;
  triggerLabel?: string;
}

export default function DocumentosProcedimentoPanel({
  procedimentoId,
  defaultTipo = "anexo_suporte",
  triggerLabel,
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState(defaultTipo);
  const [observacao, setObservacao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["proc-aux-documentos", procedimentoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_auxiliar_documentos")
        .select("*")
        .eq("procedimento_auxiliar_id", procedimentoId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const reset = () => {
    setTipo(defaultTipo);
    setObservacao("");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Selecione um arquivo");
    if (file.size > 20 * 1024 * 1024) return toast.error("Arquivo excede 20MB");

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ts = Date.now();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `procedimentos-auxiliares/${procedimentoId}/${ts}_${safeName}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase as any).from("procedimento_auxiliar_documentos").insert({
        procedimento_auxiliar_id: procedimentoId,
        tipo_documento: tipo,
        nome_arquivo: file.name,
        tipo_arquivo: file.type || "application/octet-stream",
        url_arquivo: path,
        uploaded_by: user?.id || null,
        observacao: observacao || null,
        status_documento: "ativo",
      });
      if (insErr) throw insErr;

      toast.success("Documento anexado");
      qc.invalidateQueries({ queryKey: ["proc-aux-documentos", procedimentoId] });
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.url_arquivo, 60 * 5);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar link");
    }
  };

  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from(BUCKET).remove([doc.url_arquivo]);
      const { error } = await (supabase as any)
        .from("procedimento_auxiliar_documentos")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proc-aux-documentos", procedimentoId] });
      toast.success("Documento removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const labelTipo = (v: string) => TIPOS_DOCUMENTO.find((t) => t.value === v)?.label || v;
  const isEvidencia = (v: string) => !!TIPOS_DOCUMENTO.find((t) => t.value === v)?.evidencia;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Paperclip size={16} /> Documentos do Procedimento
          </h3>
          <p className="text-xs text-muted-foreground">
            Termo assinado, anexos e evidências vinculados a este procedimento.
          </p>
        </div>
        <Button size="sm" onClick={() => { reset(); setOpen(true); }}>
          <Upload size={14} className="mr-1" /> {triggerLabel || "Anexar Documento"}
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && docs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                Nenhum documento anexado.
              </TableCell></TableRow>
            )}
            {docs.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-muted-foreground" />
                    <span className="font-medium">{d.nome_arquivo}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {isEvidencia(d.tipo_documento) ? (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                      {labelTipo(d.tipo_documento)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{labelTipo(d.tipo_documento)}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {d.observacao || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(d)}>
                    <Download size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      if (confirm("Remover este documento permanentemente?")) deleteDoc.mutate(d);
                    }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anexar Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <Label>Tipo de Documento *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arquivo (PDF, imagem ou planilha — até 20MB) *</Label>
              <Input
                ref={inputRef}
                type="file"
                accept=".pdf,image/*,.xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Termo assinado pelo responsável em 15/04/2025"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={uploading || !file}>
                {uploading ? "Enviando..." : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
