import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  const monoLabel = { fontFamily: "'IBM Plex Mono', monospace" } as const;

  return (
    <div className="flex min-h-screen w-full bg-background selection:bg-primary/30">
      {/* Painel esquerdo (60%) — institucional */}
      <aside className="hidden lg:flex lg:w-3/5 relative overflow-hidden flex-col justify-between p-10 xl:p-16 2xl:p-20 border-r border-border">
        {/* pattern de pontos */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* gradiente sutil */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.10), transparent 60%)",
          }}
        />

        {/* topo: brand + headline */}
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-10 xl:mb-14">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl xl:text-2xl font-bold tracking-tight text-foreground">
              Audiconsult Auditores S.S.
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-semibold text-foreground leading-[1.1] tracking-tight">
            Sistema Integrado de Gestão de Auditoria Contábil
          </h1>
          <p className="mt-6 text-base xl:text-lg text-muted-foreground max-w-lg leading-relaxed">
            Auditoria contábil inteligente baseada em planejamento, precisão e qualidade.
          </p>
        </div>

        {/* rodapé: bloco técnico */}
        <div className="relative z-10 mt-12">
          <div className="inline-flex flex-col gap-2 p-4 border border-border bg-card/60 backdrop-blur-sm rounded-lg">
            <div
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-medium mb-1"
              style={monoLabel}
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Audit Core v4.2
            </div>
            <div className="flex gap-1 items-center">
              <div className="h-1.5 w-8 bg-primary/40 rounded-full" />
              <div className="h-1.5 w-12 bg-muted rounded-full" />
              <div className="h-1.5 w-6 bg-primary/60 rounded-full" />
              <div className="h-1.5 w-10 bg-muted rounded-full" />
              <div className="h-1.5 w-4 bg-primary rounded-full" />
              <div className="h-1.5 w-14 bg-muted rounded-full" />
            </div>
            <div className="flex gap-1 items-center">
              <div className="h-1.5 w-12 bg-muted rounded-full" />
              <div className="h-1.5 w-8 bg-primary/30 rounded-full" />
              <div className="h-1.5 w-16 bg-muted rounded-full" />
              <div className="h-1.5 w-6 bg-primary/50 rounded-full" />
            </div>
          </div>
        </div>
      </aside>

      {/* Painel direito (40%) — formulário */}
      <main className="w-full lg:w-2/5 flex flex-col justify-center items-center px-6 py-12 sm:px-10 lg:px-12 xl:px-16 bg-background relative">
        {/* brand mobile no topo */}
        <div className="lg:hidden mb-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Audiconsult Auditores S.S.
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl xl:text-3xl font-bold text-foreground mb-2 tracking-tight">
              {isLogin ? "Entrar" : "Criar conta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Acesse sua conta para continuar"
                : "Cadastre-se para iniciar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest"
                style={monoLabel}
              >
                E-mail Corporativo
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest"
                style={monoLabel}
              >
                Senha
              </label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold shadow-lg shadow-primary/20 mt-2"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Entrar na plataforma" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-muted-foreground text-sm">
              {isLogin ? "Novo por aqui?" : "Já tem conta?"}
              <button
                type="button"
                className="text-primary font-semibold hover:underline ml-1.5"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>
        </div>

        {/* rodapé técnico mobile */}
        <div
          className="lg:hidden mt-10 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"
          style={monoLabel}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Audit Core v4.2
        </div>
      </main>
    </div>
  );
}
