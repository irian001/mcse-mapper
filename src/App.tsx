import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import McsePage from "@/pages/McsePage";
import ClientesPage from "@/pages/ClientesPage";
import ImportarPage from "@/pages/ImportarPage";
import PlanoContasPage from "@/pages/PlanoContasPage";
import MapeamentoPage from "@/pages/MapeamentoPage";
import RegrasPage from "@/pages/RegrasPage";
import AuditoresPage from "@/pages/AuditoresPage";
import TrabalhosPage from "@/pages/TrabalhosPage";
import BalancetesPage from "@/pages/BalancetesPage";
import NotFound from "@/pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/mcse" replace />} />
              <Route path="/mcse" element={<McsePage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/importar" element={<ImportarPage />} />
              <Route path="/plano-contas" element={<PlanoContasPage />} />
              <Route path="/mapeamento" element={<MapeamentoPage />} />
              <Route path="/regras" element={<RegrasPage />} />
              <Route path="/auditores" element={<AuditoresPage />} />
              <Route path="/trabalhos" element={<TrabalhosPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
