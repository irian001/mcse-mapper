/**
 * TrabalhoRiscosImportDialog — Fase 0A.3.7.2
 *
 * Importa riscos padrão dos Modelos de Matriz de Riscos para o Trabalho via RPC
 * public.importar_riscos_modelo_para_trabalho(p_trabalho_auditoria_id, p_preview, p_modo_estrito).
 *
 * Dívida técnica: types.ts ainda não conhece a RPC nem as novas colunas de origem
 * em trabalho_riscos_auditoria, por isso usamos `(supabase as any).rpc(...)`.
 *
 * Esta fase NÃO faz insert direto em trabalho_riscos_auditoria, NÃO importa
 * vínculos 0A.3.6, documentos, instruções, ERP, PTA, solicitações ou evidências.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PreviewResult {
  ok: boolean;
  preview: boolean;
  trabalho_auditoria_id: string | null;
  produto_auditoria_id: string | null;
  modalidades_consideradas: number;
  modelos_encontrados: number;
  modalidades_sem_modelo: any[];
  itens_elegiveis: number;
  itens_ja_importados: number;
  itens_importados: number;
  avisos: any[];
  erros: any[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trabalhoId: string;
}

function mapErr(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("alcada") || m.includes("alçada") || m.includes("permission") || m.includes("rls"))
    return "Você não possui alçada para importar riscos neste trabalho.";
  if (m.includes("encerrado") || m.includes("finalizado") || m.includes("bloqueado"))
    return "Não é possível importar riscos para um trabalho encerrado, finalizado ou bloqueado.";
  if (m.includes("produto") && m.includes("contrato"))
    return "O trabalho não possui produto de contrato definido.";
  if (m.includes("produto de auditoria"))
    return "Não foi possível identificar o produto de auditoria do trabalho.";
  if (m.includes("planejamento"))
    return "O trabalho não possui planejamento cadastrado.";
  if (m.includes("modalidades ativas") || m.includes("defina modalidades"))
    return "Não há modalidades ativas no planejamento do trabalho. Defina as modalidades aplicáveis antes de importar riscos.";
  if (m.includes("modelo vigente") || m.includes("sem modelo"))
    return "Não foi encontrado modelo vigente para uma ou mais modalidades do planejamento.";
  return msg || "Erro ao importar riscos do modelo.";
}

export default function TrabalhoRiscosImportDialog({ open, onOpenChange, trabalhoId }: Props) {
  const qc = useQueryClient();
  const [modoEstrito, setModoEstrito] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [executed, setExecuted] = useState(false);

  const reset = () => {
    setPreview(null);
    setExecuted(false);
    setModoEstrito(false);
  };

  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "importar_riscos_modelo_para_trabalho",
        {
          p_trabalho_auditoria_id: trabalhoId,
          p_preview: true,
          p_modo_estrito: modoEstrito,
        },
      );
      if (error) throw error;
      return data as PreviewResult;
    },
    onSuccess: (data) => {
      setPreview(data);
      setExecuted(false);
    },
    onError: (e: any) => toast.error(mapErr(e?.message || "")),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "importar_riscos_modelo_para_trabalho",
        {
          p_trabalho_auditoria_id: trabalhoId,
          p_preview: false,
          p_modo_estrito: modoEstrito,
        },
      );
      if (error) throw error;
      return data as PreviewResult;
    },
    onSuccess: (data) => {
      setPreview(data);
      setExecuted(true);
      if (data?.ok) {
        toast.success(`Importação concluída: ${data.itens_importados ?? 0} risco(s) importado(s).`);
        qc.invalidateQueries({ queryKey: ["trabalho-riscos", trabalhoId] });
      } else {
        const msg = (data?.erros && data.erros[0]) || "Não foi possível concluir a importação.";
        toast.error(mapErr(String(msg)));
      }
    },
    onError: (e: any) => toast.error(mapErr(e?.message || "")),
  });

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const erros = preview?.erros || [];
  const avisos = preview?.avisos || [];
  const semModelo = preview?.modalidades_sem_modelo || [];
  const podeImportar = !!preview?.ok && (preview?.itens_elegiveis ?? 0) > 0 && !executed;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar riscos do modelo</DialogTitle>
          <DialogDescription>
            Importa riscos padrão dos Modelos de Matriz de Riscos aplicáveis às modalidades ativas do planejamento. Itens já importados anteriormente são ignorados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="modoEstrito"
              checked={modoEstrito}
              onCheckedChange={(v) => { setModoEstrito(!!v); setPreview(null); setExecuted(false); }}
              disabled={previewMutation.isPending || importMutation.isPending}
            />
            <div className="space-y-0.5">
              <Label htmlFor="modoEstrito" className="text-sm font-medium cursor-pointer">
                Exigir modelo vigente para todas as modalidades
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando marcado, a importação é bloqueada se alguma modalidade do planejamento estiver sem modelo vigente.
              </p>
            </div>
          </div>

          {!preview && (
            <div className="flex justify-end">
              <Button
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Gerar pré-visualização
              </Button>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <Card label="Modalidades consideradas" value={preview.modalidades_consideradas} />
                <Card label="Modelos encontrados" value={preview.modelos_encontrados} />
                <Card label="Itens elegíveis" value={preview.itens_elegiveis} />
                <Card label="Já importados" value={preview.itens_ja_importados} />
                <Card label={executed ? "Itens importados" : "Itens a importar"}
                  value={executed ? preview.itens_importados : preview.itens_elegiveis} highlight />
                <Card label="Modalidades sem modelo" value={semModelo.length}
                  tone={semModelo.length > 0 ? "warning" : undefined} />
              </div>

              {preview.itens_ja_importados > 0 && (
                <Alert tone="info" icon={<Info className="h-4 w-4" />}>
                  Alguns riscos já foram importados anteriormente e serão ignorados.
                </Alert>
              )}

              {semModelo.length > 0 && (
                <div className="rounded-md border p-3 space-y-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Modalidades sem modelo vigente
                  </div>
                  <ul className="text-xs text-muted-foreground list-disc pl-5">
                    {semModelo.slice(0, 20).map((m: any, i: number) => (
                      <li key={i}>
                        {m?.modalidade_nome_snapshot || m?.modalidade_codigo_snapshot || m?.modalidade_atuacao_id || "—"}
                        {m?.segmento_nome_snapshot ? ` — ${m.segmento_nome_snapshot}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {avisos.length > 0 && (
                <div className="rounded-md border p-3 space-y-1">
                  <div className="text-sm font-medium">Avisos</div>
                  <ul className="text-xs text-muted-foreground list-disc pl-5">
                    {avisos.slice(0, 50).map((a: any, i: number) => (
                      <li key={i}>{typeof a === "string" ? a : JSON.stringify(a)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {erros.length > 0 && (
                <Alert tone="error" icon={<AlertCircle className="h-4 w-4" />}>
                  <ul className="list-disc pl-5">
                    {erros.slice(0, 20).map((e: any, i: number) => (
                      <li key={i}>{mapErr(typeof e === "string" ? e : JSON.stringify(e))}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {executed && preview.ok && (
                <Alert tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
                  Importação concluída com sucesso.
                </Alert>
              )}

              {preview.ok && preview.itens_elegiveis === 0 && !executed && (
                <Alert tone="info" icon={<Info className="h-4 w-4" />}>
                  Nenhum risco novo foi encontrado para importação.
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {preview && !executed && (
            <Button
              variant="outline"
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending || importMutation.isPending}
            >
              {previewMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Recalcular preview
            </Button>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {executed ? "Fechar" : "Cancelar"}
          </Button>
          {podeImportar && (
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Card({ label, value, tone, highlight }: { label: string; value: number; tone?: "warning"; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? "bg-accent" : ""}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${tone === "warning" && value > 0 ? "text-amber-600" : ""}`}>{value}</div>
    </div>
  );
}

function Alert({ tone, icon, children }: { tone: "info" | "warning" | "error" | "success"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls =
    tone === "error" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : tone === "success" ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-700"
    : tone === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
    : "border-blue-500/40 bg-blue-500/10 text-blue-700";
  return (
    <div className={`rounded-md border p-3 text-xs flex gap-2 ${cls}`}>
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
