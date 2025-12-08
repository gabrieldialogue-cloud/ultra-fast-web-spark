import { MessageSquare, FileText, Settings, User, LogOut, Shield, Users, AlertCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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

        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
          const diff = Date.now() - parseInt(lastActivity);
          setIsOnline(diff < 300000);
        }

        const priority = localStorage.getItem('userPriority');
        setHasPriority(priority === '1');
      }
    };
    checkRoles();

    const interval = setInterval(() => {
      localStorage.setItem('lastActivity', Date.now().toString());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
      <SidebarContent className="flex flex-col">
        {/* Logo e botão de toggle */}
        <div className="border-b border-sidebar-border/50 p-3">
          <div className="flex flex-col items-center gap-2">
            <AlteseLogoIcon className={`drop-shadow-md transition-all duration-200 ${open ? 'h-10 w-10' : 'h-8 w-8'}`} />
            {open && <AlteseLogoText className="text-sidebar-foreground" />}
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent p-1.5 rounded-lg transition-colors" />
          </div>
        </div>

        {/* Status Online - apenas para vendedores */}
        {!isSuperAdmin && !isSupervisor && (
          <div className="p-2">
            <div className="flex items-center justify-center rounded-lg bg-sidebar-accent/50 p-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
              {open && (
                <span className="ml-2 text-xs text-sidebar-foreground">
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </div>
            
            {hasPriority && (
              <div className="mt-2 flex items-center justify-center rounded-lg bg-accent/20 border border-accent/30 p-2">
                <AlertCircle className="h-4 w-4 text-accent" />
                {open && (
                  <span className="ml-2 text-xs text-accent font-medium">
                    Prioridade
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Menu Principal */}
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {(isSupervisor ? supervisorItems : menuItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center justify-center text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg p-2.5"
                      activeClassName="bg-gradient-to-r from-accent to-secondary text-white font-medium shadow-md"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {open && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Inferior */}
        <div className="border-t border-sidebar-border/50 pt-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {bottomItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="flex items-center justify-center text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg p-2.5"
                        activeClassName="bg-gradient-to-r from-primary to-secondary text-white font-medium shadow-md"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {open && <span className="ml-3">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Super Admin">
                      <NavLink
                        to="/super-admin"
                        className="flex items-center justify-center text-sidebar-foreground transition-all hover:bg-destructive/20 hover:text-destructive rounded-lg p-2.5"
                        activeClassName="bg-gradient-to-r from-destructive to-accent text-white font-medium shadow-md"
                      >
                        <Shield className="h-5 w-5 shrink-0" />
                        {open && <span className="ml-3">Super Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Sair">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center text-sidebar-foreground transition-all hover:bg-destructive/20 hover:text-destructive rounded-lg p-2.5"
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                      {open && <span className="ml-3">Sair</span>}
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