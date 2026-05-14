import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface BaseSnapshot {
  materialidade_base_id: string | null;
  materialidade_base_nome_snapshot: string | null;
  materialidade_base_valor_snapshot: number | null;
  materialidade_base_percentual_snapshot: number | null;
  materialidade_base_saldo_snapshot: number | null;
  materialidade_base_codigo_conta_snapshot: string | null;
  materialidade_base_descricao_conta_snapshot: string | null;
  materialidade_base_criterio_snapshot: string | null;
}

export const EMPTY_BASE_SNAPSHOT: BaseSnapshot = {
  materialidade_base_id: null,
  materialidade_base_nome_snapshot: null,
  materialidade_base_valor_snapshot: null,
  materialidade_base_percentual_snapshot: null,
  materialidade_base_saldo_snapshot: null,
  materialidade_base_codigo_conta_snapshot: null,
  materialidade_base_descricao_conta_snapshot: null,
  materialidade_base_criterio_snapshot: null,
};

export function baseToSnapshot(base: any | null): BaseSnapshot {
  if (!base) return { ...EMPTY_BASE_SNAPSHOT };
  return {
    materialidade_base_id: base.id,
    materialidade_base_nome_snapshot: base.nome_base ?? null,
    materialidade_base_valor_snapshot: base.valor_materialidade ?? null,
    materialidade_base_percentual_snapshot: base.percentual_aplicado ?? null,
    materialidade_base_saldo_snapshot: base.saldo_base_snapshot ?? null,
    materialidade_base_codigo_conta_snapshot: base.codigo_conta_snapshot ?? null,
    materialidade_base_descricao_conta_snapshot: base.descricao_conta_snapshot ?? null,
    materialidade_base_criterio_snapshot: base.criterio_saldo_base ?? null,
  };
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number | null | undefined) =>
  v == null ? "—" : `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;

interface Props {
  trabalhoId: string | null | undefined;
  value: string | null;
  onChange: (base: any | null) => void;
  disabled?: boolean;
  /** snapshot para fallback quando a base original não estiver mais disponível */
  snapshot?: Partial<BaseSnapshot>;
}

export function useBasesDisponiveis(trabalhoId: string | null | undefined) {
  const vigenteQ = useQuery({
    queryKey: ["pta-mat-vigente", trabalhoId],
    enabled: !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trabalho_materialidade")
        .select("id")
        .eq("trabalho_auditoria_id", trabalhoId)
        .eq("status_materialidade", "aprovada")
        .eq("vigente", true)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
  });

  const matId = vigenteQ.data?.id;

  const basesQ = useQuery({
    queryKey: ["pta-mat-bases", matId],
    enabled: !!matId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trabalho_materialidade_bases")
        .select("*")
        .eq("trabalho_materialidade_id", matId)
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome_base", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  return {
    vigente: vigenteQ.data || null,
    bases: basesQ.data || [],
    isLoading: vigenteQ.isLoading || basesQ.isLoading,
    error: vigenteQ.error || basesQ.error,
  };
}

export default function MaterialidadeBaseSelect({ trabalhoId, value, onChange, disabled, snapshot }: Props) {
  const { vigente, bases, isLoading, error } = useBasesDisponiveis(trabalhoId);

  const selected = bases.find((b) => b.id === value) || null;
  const usingSnapshotOnly = !selected && value && snapshot?.materialidade_base_id === value;

  const basesSemValor = bases.filter((b) => b.valor_materialidade == null).length;
  const snapshotSemValor =
    !!value && snapshot?.materialidade_base_id === value && snapshot?.materialidade_base_valor_snapshot == null;

  const handleChange = (v: string) => {
    if (v === "__none__") return onChange(null);
    const b = bases.find((x) => x.id === v);
    if (!b) return;
    if (b.valor_materialidade == null) {
      // Defensivo: itens sem valor são renderizados como disabled, mas garantimos bloqueio aqui.
      return;
    }
    if (!b.nome_base) return;
    onChange(b);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Base de materialidade</Label>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Carregando bases...</div>
      ) : error ? (
        <div className="text-xs text-destructive">Erro ao carregar bases.</div>
      ) : !vigente ? (
        <div className="text-xs text-muted-foreground italic">
          Nenhuma materialidade vigente aprovada encontrada para este trabalho.
        </div>
      ) : bases.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          Nenhuma base de materialidade ativa cadastrada para a materialidade vigente.
        </div>
      ) : null}

      {(vigente && bases.length > 0) || value ? (
        <Select value={value || "__none__"} onValueChange={handleChange} disabled={disabled}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sem base vinculada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem base vinculada</SelectItem>
            {bases.map((b) => {
              const semValor = b.valor_materialidade == null;
              const partes = [b.nome_base];
              if (b.codigo_conta_snapshot) partes.push(b.codigo_conta_snapshot);
              partes.push(semValor ? "sem valor calculado" : fmtBRL(b.valor_materialidade));
              return (
                <SelectItem key={b.id} value={b.id} disabled={semValor}>
                  {partes.join(" — ")}
                </SelectItem>
              );
            })}
            {value && !selected && (
              <SelectItem value={value} disabled>
                {snapshot?.materialidade_base_nome_snapshot || "(base original)"} — (snapshot)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      ) : null}

      {basesSemValor > 0 && (
        <div className="text-[11px] text-amber-600">
          {basesSemValor === 1
            ? "1 base ativa está sem valor de materialidade calculado e não pode ser selecionada."
            : `${basesSemValor} bases ativas estão sem valor de materialidade calculado e não podem ser selecionadas.`}
        </div>
      )}
      {snapshotSemValor && (
        <div className="text-[11px] text-amber-600">
          Base vinculada sem valor de materialidade no snapshot. Escolha outra base válida ou remova o vínculo.
        </div>
      )}
      <div className="text-[11px] text-muted-foreground">
        Limite de variação deve ser informado manualmente quando aplicável.
      </div>

      {(selected || (value && snapshot?.materialidade_base_id === value)) && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {selected?.nome_base || snapshot?.materialidade_base_nome_snapshot || "—"}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {usingSnapshotOnly ? "Snapshot" : "Base vinculada"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-muted-foreground">Conta:</span>
            <span className="font-mono">
              {selected?.codigo_conta_snapshot || snapshot?.materialidade_base_codigo_conta_snapshot || "—"}
              {(selected?.descricao_conta_snapshot || snapshot?.materialidade_base_descricao_conta_snapshot)
                ? ` — ${selected?.descricao_conta_snapshot || snapshot?.materialidade_base_descricao_conta_snapshot}`
                : ""}
            </span>
            <span className="text-muted-foreground">Saldo-base:</span>
            <span className="font-mono">
              {fmtBRL(selected?.saldo_base_snapshot ?? snapshot?.materialidade_base_saldo_snapshot ?? null)}
            </span>
            <span className="text-muted-foreground">Percentual:</span>
            <span className="font-mono">
              {fmtPct(selected?.percentual_aplicado ?? snapshot?.materialidade_base_percentual_snapshot ?? null)}
            </span>
            <span className="text-muted-foreground">Valor materialidade:</span>
            <span className="font-mono font-semibold">
              {fmtBRL(selected?.valor_materialidade ?? snapshot?.materialidade_base_valor_snapshot ?? null)}
            </span>
            <span className="text-muted-foreground">Critério:</span>
            <span>
              {selected?.criterio_saldo_base || snapshot?.materialidade_base_criterio_snapshot || "—"}
            </span>
          </div>
          {usingSnapshotOnly && (
            <div className="text-[11px] text-muted-foreground italic pt-1">
              A base original não está mais ativa. Os valores acima vêm do snapshot gravado no PTA.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
