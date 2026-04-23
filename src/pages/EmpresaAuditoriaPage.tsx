import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import { useEmpresaAuditoria, type EmpresaAuditoria } from "@/hooks/useEmpresaAuditoria";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type FormState = Omit<EmpresaAuditoria, "id">;

const empty: FormState = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  inscricao_municipal: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  telefone: "",
  email_contato: "",
  website: "",
  crc_numero: "",
  crc_uf: "",
  registro_cvm: "",
  registro_bacen: "",
  registro_aneel: "",
  auditor_responsavel_id: null,
  logo_url: "",
  observacoes: "",
};

export default function EmpresaAuditoriaPage() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();
  const isAdmin = profile?.auditor?.perfil_acesso === "admin";
  const { data: empresa, isLoading } = useEmpresaAuditoria();

  const { data: auditores = [] } = useQuery({
    queryKey: ["auditores-ativos-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditores")
        .select("id, nome, cargo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (empresa) {
      const { id, ...rest } = empresa as EmpresaAuditoria & { id: string };
      setForm({ ...empty, ...rest });
    }
  }, [empresa]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleCepBlur = async () => {
    const cep = (form.cep || "").replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await res.json();
      if (j?.erro) return;
      setForm((p) => ({
        ...p,
        logradouro: p.logradouro || j.logradouro || "",
        bairro: p.bairro || j.bairro || "",
        cidade: p.cidade || j.localidade || "",
        uf: p.uf || j.uf || "",
      }));
    } catch {/* ignore */}
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem editar a empresa.");
      return;
    }
    if (!form.razao_social.trim()) {
      toast.error("Razão social é obrigatória.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        auditor_responsavel_id: form.auditor_responsavel_id || null,
      };
      if (empresa?.id) {
        const { error } = await supabase
          .from("empresa_auditoria" as any)
          .update(payload)
          .eq("id", empresa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("empresa_auditoria" as any)
          .insert({ ...payload, singleton: true });
        if (error) throw error;
      }
      toast.success("Dados da empresa salvos com sucesso.");
      qc.invalidateQueries({ queryKey: ["empresa-auditoria"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar empresa.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">Carregando...</div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresa de Auditoria"
        description="Cadastro da empresa que utiliza o sistema. Esses dados aparecem no cabeçalho e em relatórios."
        icon={<Building2 className="h-5 w-5" />}
      />

      {!isAdmin && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Você está em modo apenas leitura. Somente administradores podem editar este cadastro.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Razão social *</Label>
            <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Nome fantasia</Label>
            <Input value={form.nome_fantasia ?? ""} onChange={(e) => set("nome_fantasia", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Inscrição estadual</Label>
            <Input value={form.inscricao_estadual ?? ""} onChange={(e) => set("inscricao_estadual", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Inscrição municipal</Label>
            <Input value={form.inscricao_municipal ?? ""} onChange={(e) => set("inscricao_municipal", e.target.value)} disabled={!isAdmin} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <Label>CEP</Label>
            <Input value={form.cep ?? ""} onChange={(e) => set("cep", e.target.value)} onBlur={handleCepBlur} disabled={!isAdmin} />
          </div>
          <div className="md:col-span-3">
            <Label>Logradouro</Label>
            <Input value={form.logradouro ?? ""} onChange={(e) => set("logradouro", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={form.numero ?? ""} onChange={(e) => set("numero", e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="md:col-span-2">
            <Label>Complemento</Label>
            <Input value={form.complemento ?? ""} onChange={(e) => set("complemento", e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="md:col-span-2">
            <Label>Bairro</Label>
            <Input value={form.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="md:col-span-2">
            <Label>Cidade</Label>
            <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>UF</Label>
            <Select value={form.uf ?? ""} onValueChange={(v) => set("uf", v)} disabled={!isAdmin}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email_contato ?? ""} onChange={(e) => set("email_contato", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} disabled={!isAdmin} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Registros profissionais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>CRC — número</Label>
            <Input value={form.crc_numero ?? ""} onChange={(e) => set("crc_numero", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>CRC — UF</Label>
            <Select value={form.crc_uf ?? ""} onValueChange={(v) => set("crc_uf", v)} disabled={!isAdmin}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Registro CVM</Label>
            <Input value={form.registro_cvm ?? ""} onChange={(e) => set("registro_cvm", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Registro Banco Central</Label>
            <Input value={form.registro_bacen ?? ""} onChange={(e) => set("registro_bacen", e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Registro ANEEL</Label>
            <Input value={form.registro_aneel ?? ""} onChange={(e) => set("registro_aneel", e.target.value)} disabled={!isAdmin} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Responsável técnico e identidade</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Auditor responsável</Label>
            <Select
              value={form.auditor_responsavel_id ?? "none"}
              onValueChange={(v) => set("auditor_responsavel_id", v === "none" ? null : v)}
              disabled={!isAdmin}
            >
              <SelectTrigger><SelectValue placeholder="Selecione um auditor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhum —</SelectItem>
                {auditores.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome} ({a.cargo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Logo (URL)</Label>
            <Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} disabled={!isAdmin} placeholder="https://..." />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} disabled={!isAdmin} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isAdmin || saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar dados da empresa"}
        </Button>
      </div>
    </div>
  );
}
