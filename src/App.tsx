import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import McsePage from "@/pages/McsePage";
import ClientesPage from "@/pages/ClientesPage";
import ImportarPage from "@/pages/ImportarPage";
import PlanoContasPage from "@/pages/PlanoContasPage";
import MapeamentoPage from "@/pages/MapeamentoPage";
import RegrasPage from "@/pages/RegrasPage";
import AuditoresPage from "@/pages/AuditoresPage";
import TrabalhosPage from "@/pages/TrabalhosPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/mcse" replace />} />
            <Route path="/mcse" element={<McsePage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/importar" element={<ImportarPage />} />
            <Route path="/plano-contas" element={<PlanoContasPage />} />
            <Route path="/mapeamento" element={<MapeamentoPage />} />
            <Route path="/regras" element={<RegrasPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
