import { NavLink, useLocation } from "react-router-dom";
import { Database, Users, GitCompare, ShieldCheck, List, UserCheck, Briefcase, LogOut, BookOpen, ClipboardList, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import logoAudiconsult from "@/assets/logo_audiconsult.jpg";

const menuGroups = [
  {
    label: "Início",
    defaultOpen: true,
    items: [
      { to: "/mcse", label: "Base MCSE", icon: Database },
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/plano-contas", label: "Plano de Contas", icon: List },
      { to: "/mapeamento", label: "Mapeamento", icon: GitCompare },
      { to: "/regras", label: "Regras MCSE", icon: ShieldCheck },
      { to: "/auditores", label: "Auditores", icon: UserCheck },
      { to: "/trabalhos", label: "Trabalhos", icon: Briefcase },
    ],
  },
  {
    label: "Auditoria",
    defaultOpen: true,
    items: [
      
      { to: "/balancetes", label: "Balancetes", icon: BookOpen },
      { to: "/papeis-trabalho", label: "Papéis de Trabalho", icon: ClipboardList },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

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
        <img src={logoAudiconsult} alt="Audiconsult Auditores" className="h-9 object-contain" />
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
          <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/40">v1.0 — Fase 1</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={() => supabase.auth.signOut()}>
              <LogOut size={14} />
            </Button>
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
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors">
        {group.label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
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
