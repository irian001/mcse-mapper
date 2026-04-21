import { NavLink, useLocation } from "react-router-dom";
import { Database, Users, GitCompare, ShieldCheck, List, UserCheck, Briefcase, LogOut, BookOpen, ClipboardList, ChevronDown, FileText, UserPlus, LayoutDashboard, Package, FileSignature, ClipboardCheck, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import logoAudiconsult from "@/assets/logo_audiconsult.jpg";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ThemeToggle } from "@/components/ThemeToggle";

const menuGroups = [
  {
    label: "Dashboard",
    defaultOpen: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Cadastros",
    defaultOpen: true,
    items: [
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/auditores", label: "Auditores", icon: UserCheck },
      { to: "/cliente-usuarios", label: "Usuários do Cliente", icon: UserPlus },
      { to: "/produtos-auditoria", label: "Produtos de Auditoria", icon: Package },
    ],
  },
  {
    label: "Contratos e Escopo",
    defaultOpen: true,
    items: [
      { to: "/contratos", label: "Contratos", icon: FileSignature },
    ],
  },
  {
    label: "Trabalhos de Auditoria",
    defaultOpen: true,
    items: [
      { to: "/trabalhos", label: "Trabalhos", icon: Briefcase },
      { to: "/balancetes", label: "Balancetes", icon: BookOpen },
      { to: "/papeis-trabalho", label: "Papéis de Trabalho (PTA)", icon: ClipboardList },
    ],
  },
  {
    label: "Procedimentos e Evidências",
    defaultOpen: true,
    items: [
      { to: "/procedimentos-auxiliares", label: "Procedimentos Auxiliares", icon: ClipboardCheck },
    ],
  },
  {
    label: "Solicitações e Portal",
    defaultOpen: true,
    items: [
      { to: "/solicitacoes", label: "Solicitações", icon: FileText },
    ],
  },
  {
    label: "Administração",
    defaultOpen: false,
    items: [
      { to: "/mcse", label: "Estruturas de Referência", icon: Database },
      { to: "/plano-contas", label: "Plano de Contas", icon: List },
      { to: "/mapeamento", label: "Mapeamento de Contas", icon: GitCompare },
      { to: "/regras", label: "Regras de Auditoria", icon: ShieldCheck },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { data: profile } = useUserProfile();

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {/* Top header bar */}
      <header className="h-12 shrink-0 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Sistema de Auditoria Contábil
          </h2>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            Audiconsult Auditores S/S.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <img src={logoAudiconsult} alt="Audiconsult Auditores" className="h-9 object-contain" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
          <div className="p-4 border-b border-sidebar-border">
            <h1 className="text-lg font-bold tracking-tight text-sidebar-primary">AuditEletric</h1>
            <p className="text-xs text-sidebar-accent-foreground/60 mt-0.5">Auditoria Contábil</p>
          </div>
          <nav className="flex-1 py-2 px-2 space-y-1 overflow-auto">
            {menuGroups.map((group) => (
              <MenuGroup key={group.label} group={group} currentPath={location.pathname} />
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sidebar-foreground/40">v1.0 — Fase 1</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={() => supabase.auth.signOut()}>
                <LogOut size={14} />
              </Button>
            </div>
            <div className="text-xs text-sidebar-foreground/60 truncate">
              {profile?.auditor?.nome || "Usuário"}
            </div>
            <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-sidebar-primary/70 bg-sidebar-accent px-1.5 py-0.5 rounded">
              Auditor
            </span>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function MenuGroup({ group, currentPath }: { group: typeof menuGroups[number]; currentPath: string }) {
  const isActiveGroup = group.items.some((item) => currentPath.startsWith(item.to));
  const [open, setOpen] = useState(group.defaultOpen || isActiveGroup);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors text-left">
        <span className="text-left flex-1">{group.label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${open ? "" : "-rotate-90"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 mt-0.5">
        {group.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
