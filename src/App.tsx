import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase-client";
import type { Session } from "@supabase/supabase-js";
import AppLayout from "@/components/AppLayout";
import ClienteLayout from "@/components/ClienteLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import McsePage from "@/pages/McsePage";
import ClientesPage from "@/pages/ClientesPage";
import ClienteUsuariosPage from "@/pages/ClienteUsuariosPage";

import PlanoContasPage from "@/pages/PlanoContasPage";
import MapeamentoPage from "@/pages/MapeamentoPage";
import RegrasPage from "@/pages/RegrasPage";
import AuditoresPage from "@/pages/AuditoresPage";
import TrabalhosPage from "@/pages/TrabalhosPage";
import ProdutosAuditoriaPage from "@/pages/ProdutosAuditoriaPage";
import ContratosPage from "@/pages/ContratosPage";
import BalancetesPage from "@/pages/BalancetesPage";
import PapeisTrabalhoPage from "@/pages/PapeisTrabalhoPage";
import SolicitacoesPage from "@/pages/SolicitacoesPage";
import ProcedimentosAuxiliaresPage from "@/pages/ProcedimentosAuxiliaresPage";
import ClienteSolicitacoesPage from "@/pages/cliente/ClienteSolicitacoesPage";
import ClientePendenciasPage from "@/pages/cliente/ClientePendenciasPage";
import NotFound from "@/pages/NotFound";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { LogOut, AlertTriangle } from "lucide-react";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  return <>{children}</>;
}

function ProfileRouter() {
  const { data: profile, isLoading } = useUserProfile();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Identificando perfil...</div>;
  }

  if (profile?.role === "cliente_usuario") {
    return (
      <ClienteLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/cliente/solicitacoes" replace />} />
          <Route path="/cliente/solicitacoes" element={<ClienteSolicitacoesPage />} />
          <Route path="/cliente/pendencias" element={<ClientePendenciasPage />} />
          <Route path="*" element={<Navigate to="/cliente/solicitacoes" replace />} />
        </Routes>
      </ClienteLayout>
    );
  }

  if (profile?.role === "sem_vinculo") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="mx-auto text-destructive" size={48} />
          <h2 className="text-xl font-semibold">Acesso não configurado</h2>
          <p className="text-muted-foreground">
            Sua conta de autenticação não está vinculada a nenhum perfil de auditor ou cliente.
            Entre em contato com o administrador do sistema para configurar seu acesso.
          </p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut size={16} className="mr-2" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  // auditor — full system
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/mcse" element={<McsePage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/cliente-usuarios" element={<ClienteUsuariosPage />} />
        <Route path="/plano-contas" element={<PlanoContasPage />} />
        <Route path="/mapeamento" element={<MapeamentoPage />} />
        <Route path="/regras" element={<RegrasPage />} />
        <Route path="/auditores" element={<AuditoresPage />} />
        <Route path="/trabalhos" element={<TrabalhosPage />} />
        <Route path="/produtos-auditoria" element={<ProdutosAuditoriaPage />} />
        <Route path="/contratos" element={<ContratosPage />} />
        <Route path="/balancetes" element={<BalancetesPage />} />
        <Route path="/papeis-trabalho" element={<PapeisTrabalhoPage />} />
        <Route path="/solicitacoes" element={<SolicitacoesPage />} />
        <Route path="/procedimentos-auxiliares" element={<ProcedimentosAuxiliaresPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate>
          <ProfileRouter />
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
