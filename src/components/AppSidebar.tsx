import { useAuth } from '@/contexts/AuthContext';
import { Calculator, Settings, LogOut, User, MessageSquare, BookOpen, ShoppingBag, Layers, Package, Info, CheckSquare, DollarSign, Users, Store, FileText, Image, TrendingUp, Eye, Link2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const mainItems = [
    { title: 'Simulador', url: '/', icon: Calculator },
    { title: 'Catálogo', url: '/catalogo', icon: ShoppingBag },
    { title: 'Clientes', url: '/clientes', icon: Users },
    { title: 'Auxílio de Vendas', url: '/auxilio-vendas', icon: BookOpen },
    { title: 'Mensagens Padrão', url: '/mensagens', icon: MessageSquare },
    { title: 'Tarefas', url: '/tarefas', icon: CheckSquare },
    { title: 'Leads', url: '/leads', icon: Users },
    { title: 'Lista de Valores', url: '/lista-valores', icon: DollarSign },
    { title: 'Orçamento', url: '/orcamento', icon: FileText },
    { title: 'Mídia', url: '/midia', icon: Image },
    { title: 'Catálogo Revendedor', url: '/catalogo-revendedor', icon: TrendingUp },
    { title: 'Preview', url: '/preview', icon: Eye },
  ];

  const adminItems = (profile?.cargo === 'admin' || profile?.cargo === 'vendedor') ? [
    { title: 'Modelos', url: '/admin/modelos', icon: Layers },
    { title: 'Configurações', url: '/admin/configuracoes', icon: Package },
    { title: 'Componentes', url: '/admin/componentes', icon: Settings },
    { title: 'Informativos', url: '/admin/informativos', icon: Info },
    { title: 'Config. Catálogo', url: '/admin/catalogo', icon: Store },
    { title: 'Config. Revendedor', url: '/admin/catalogo-revendedor', icon: TrendingUp },
    { title: 'Config. Preview', url: '/admin/preview', icon: Eye },
    { title: 'Bling', url: '/bling', icon: Link2 },
  ] : [];

  return (
    <Sidebar className="border-r-0">
      <SidebarContent className="bg-sidebar-background">
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70">
            {!isCollapsed && 'Menu Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 transition-colors ${
                          isActive
                            ? 'bg-accent text-accent-foreground font-semibold'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Admin */}
        {adminItems.length > 0 && (
          <>
            <Separator className="my-2 bg-sidebar-border" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70">
                {!isCollapsed && 'Administração'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center gap-3 transition-colors ${
                              isActive
                                ? 'bg-accent text-accent-foreground font-semibold'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent'
                            }`
                          }
                        >
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer com perfil e logout */}
      <SidebarFooter className="bg-sidebar-background">
        <Separator className="mb-2 bg-sidebar-border" />
        {profile && !isCollapsed && (
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-sidebar-foreground/70" />
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.nome_vendedor}</p>
            </div>
            <p className="text-xs text-sidebar-foreground/60 capitalize pl-6">{profile.cargo}</p>
          </div>
        )}
        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          size="sm"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
