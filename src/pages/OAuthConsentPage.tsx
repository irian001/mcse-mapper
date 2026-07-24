import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";

// Local typed wrapper — supabase.auth.oauth is a beta namespace whose types
// may not be exported by @supabase/supabase-js yet.
interface AuthorizationDetails {
  client?: { name?: string; client_id?: string };
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  scopes?: string[];
}

interface OAuthApi {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
}

function getOAuthApi(): OAuthApi | null {
  const authAny = supabase.auth as unknown as { oauth?: OAuthApi };
  return authAny.oauth ?? null;
}

function sanitizeNext(): string {
  const path = window.location.pathname + window.location.search;
  // must be a same-origin relative path
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Parâmetro authorization_id ausente na URL.");
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/?next=" + encodeURIComponent(sanitizeNext());
        return;
      }

      const api = getOAuthApi();
      if (!api) {
        setError(
          "Esta versão do cliente Supabase não expõe o namespace auth.oauth. Atualize @supabase/supabase-js.",
        );
        return;
      }

      const { data, error } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const api = getOAuthApi();
    if (!api) return;
    setBusy(true);
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full border border-border bg-card rounded-lg p-8 text-center space-y-4">
          <XCircle className="mx-auto text-destructive" size={40} />
          <h1 className="text-xl font-semibold">Não foi possível carregar esta autorização</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Carregando autorização…
      </main>
    );
  }

  const clientName = details.client?.name ?? "um aplicativo externo";
  const scopeList =
    details.scopes ?? (details.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full border border-border bg-card rounded-lg p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Conectar {clientName} ao Audiconsult</h1>
            <p className="text-xs text-muted-foreground">
              Isso permite que {clientName} use este app agindo como você.
            </p>
          </div>
        </div>

        {details.redirect_uri && (
          <div className="text-xs text-muted-foreground break-all">
            <span className="font-medium text-foreground">Redirect URI:</span> {details.redirect_uri}
          </div>
        )}

        {scopeList.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Escopos solicitados
            </p>
            <ul className="text-sm space-y-1">
              {scopeList.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          As permissões do sistema e as políticas de acesso do banco continuam valendo. Esta
          autorização não amplia o que você já pode fazer dentro do Audiconsult.
        </p>

        <div className="flex gap-3 pt-2">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Autorizar
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    </main>
  );
}
