import { Home, MessageSquare, FileText, Settings, User, LogOut, Shield, Users, AlertCircle, PanelLeftClose, PanelLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlteseLogoIcon, AlteseLogoText } from "./AlteseLogoIcon";

const menuItems = [
  { title: "Atendimentos", url: "/", icon: MessageSquare },
  { title: "Listas", url: "/orcamentos", icon: FileText },
  { title: "Contatos", url: "/contatos", icon: Users },
];

const supervisorItems = [
  { title: "Atendimentos", url: "/supervisor/atendimentos", icon: MessageSquare },
  { title: "Gestão", url: "/supervisor", icon: Shield }
];

const bottomItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Perfil", url: "/perfil", icon: User },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPriority, setHasPriority] = useState(false);

  useEffect(() => {
    const checkRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (roles) {
          setIsSuperAdmin(roles.some(r => r.role === 'super_admin'));
          setIsSupervisor(roles.some(r => r.role === 'supervisor'));
        }

        // Verificar status online (simulado - baseado em atividade)
        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
          const diff = Date.now() - parseInt(lastActivity);
          setIsOnline(diff < 300000); // Online se atividade nos últimos 5 minutos
        }

        // Verificar prioridade (simulado - seria baseado em métricas reais)
        const priority = localStorage.getItem('userPriority');
        setHasPriority(priority === '1');
      }
    };
    checkRoles();

    // Atualizar lastActivity periodicamente
    const interval = setInterval(() => {
      localStorage.setItem('lastActivity', Date.now().toString());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      navigate("/auth");
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-sidebar-border bg-gradient-to-b from-sidebar-background to-sidebar-background/95">
      <SidebarContent>
        {/* Logo e botão de toggle no topo da sidebar */}
        <div className={`border-b border-sidebar-border/50 ${open ? 'px-4 py-4' : 'px-2 py-3'}`}>
          <div className={`flex items-center ${open ? 'justify-between' : 'flex-col gap-2'}`}>
            <div className={`flex items-center ${open ? 'gap-2' : 'justify-center'}`}>
              <AlteseLogoIcon className={`drop-shadow-md transition-all duration-200 ${open ? 'h-10 w-10' : 'h-7 w-7'}`} />
              {open && (
                <AlteseLogoText className="text-sidebar-foreground" />
              )}
            </div>
            <SidebarTrigger className={`text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors ${open ? 'p-2' : 'p-1.5'}`} />
          </div>
        </div>

        {/* Status e Prioridade - apenas para vendedores */}
        {!isSuperAdmin && !isSupervisor && (
          <div className={`space-y-2 ${open ? 'px-4 py-3' : 'px-2 py-2'}`}>
            <div className={`flex items-center rounded-lg bg-sidebar-accent/50 ${open ? 'gap-2 p-2' : 'justify-center p-1.5'}`}>
              <div className={`rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'} shrink-0 ${open ? 'h-3 w-3' : 'h-2.5 w-2.5'}`} />
              {open && (
                <span className="text-xs text-sidebar-foreground">
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </div>
            
            {hasPriority && (
              <div className={`flex items-center rounded-lg bg-accent/20 border border-accent/30 ${open ? 'gap-2 p-2' : 'justify-center p-1.5'}`}>
                <AlertCircle className={`text-accent shrink-0 ${open ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
                {open && (
                  <span className="text-xs text-accent font-medium">
                    Prioridade na Fila
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="text-sidebar-foreground/70 px-4 py-4 text-xs font-semibold uppercase tracking-wider">
              Menu Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {isSupervisor ? (
                supervisorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg ${open ? 'gap-3 px-4 py-3 mx-2' : 'justify-center px-2 py-2.5 mx-1'}`}
                        activeClassName="bg-gradient-to-r from-accent to-secondary text-white font-medium shadow-md"
                      >
                        <item.icon className={`shrink-0 ${open ? 'h-5 w-5' : 'h-5 w-5'}`} />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg ${open ? 'gap-3 px-4 py-3 mx-2' : 'justify-center px-2 py-2.5 mx-1'}`}
                        activeClassName="bg-gradient-to-r from-accent to-secondary text-white font-medium shadow-md"
                      >
                        <item.icon className={`shrink-0 ${open ? 'h-5 w-5' : 'h-5 w-5'}`} />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto border-t border-sidebar-border/50 pt-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {bottomItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg ${open ? 'gap-3 px-4 py-3 mx-2' : 'justify-center px-2 py-2.5 mx-1'}`}
                        activeClassName="bg-gradient-to-r from-primary to-secondary text-white font-medium shadow-md"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/super-admin"
                        className={`flex items-center text-sidebar-foreground transition-all hover:bg-destructive/20 hover:text-destructive rounded-lg ${open ? 'gap-3 px-4 py-3 mx-2' : 'justify-center px-2 py-2.5 mx-1'}`}
                        activeClassName="bg-gradient-to-r from-destructive to-accent text-white font-medium shadow-md"
                      >
                        <Shield className="h-5 w-5 shrink-0" />
                        {open && <span>Super Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={handleLogout}
                      className={`flex w-full items-center text-sidebar-foreground transition-all hover:bg-destructive/20 hover:text-destructive rounded-lg ${open ? 'gap-3 px-4 py-3 mx-2' : 'justify-center px-2 py-2.5 mx-1'}`}
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                      {open && <span>Sair</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
