import { useAuth } from '@/contexts/AuthContext';
import {
  Calculator, Settings, LogOut, User, MessageSquare, BookOpen,
  ShoppingBag, Layers, Package, Info, CheckSquare, DollarSign,
  Users, Store, FileText, Image, TrendingUp, Eye, Link2, LayoutDashboard
} from 'lucide-react';
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

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

function MenuSection({ label, items, isCollapsed }: { label: string; items: MenuItem[]; isCollapsed: boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-3">
        {!isCollapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const vendaItems: MenuItem[] = [
    { title: 'Simulador', url: '/', icon: Calculator },
    { title: 'Orçamento', url: '/orcamento', icon: FileText },
    { title: 'Lista de Valores', url: '/lista-valores', icon: DollarSign },
  ];

  const crmItems: MenuItem[] = [
    { title: 'Clientes', url: '/clientes', icon: Users },
    { title: 'Leads', url: '/leads', icon: TrendingUp },
    { title: 'Tarefas', url: '/tarefas', icon: CheckSquare },
  ];

  const conteudoItems: MenuItem[] = [
    { title: 'Catálogo', url: '/catalogo', icon: ShoppingBag },
    { title: 'Cat. Revendedor', url: '/catalogo-revendedor', icon: Store },
    { title: 'Auxílio de Vendas', url: '/auxilio-vendas', icon: BookOpen },
    { title: 'Mensagens', url: '/mensagens', icon: MessageSquare },
    { title: 'Mídia', url: '/midia', icon: Image },
    { title: 'Preview', url: '/preview', icon: Eye },
  ];

  const isAdmin = profile?.cargo === 'admin' || profile?.cargo === 'vendedor';

  const adminItems: MenuItem[] = isAdmin ? [
    { title: 'Modelos', url: '/admin/modelos', icon: Layers },
    { title: 'Componentes', url: '/admin/componentes', icon: Package },
    { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
    { title: 'Informativos', url: '/admin/informativos', icon: Info },
    { title: 'Config. Catálogo', url: '/admin/catalogo', icon: Store },
    { title: 'Config. Revendedor', url: '/admin/catalogo-revendedor', icon: TrendingUp },
    { title: 'Config. Preview', url: '/admin/preview', icon: Eye },
    { title: 'Bling', url: '/bling', icon: Link2 },
  ] : [];

  return (
    <Sidebar className="border-r-0">
      <SidebarContent className="bg-sidebar-background overflow-y-auto">
        <div className="space-y-1 py-2">
          <MenuSection label="Vendas" items={vendaItems} isCollapsed={isCollapsed} />
          <MenuSection label="CRM" items={crmItems} isCollapsed={isCollapsed} />
          <MenuSection label="Conteúdo" items={conteudoItems} isCollapsed={isCollapsed} />
          {adminItems.length > 0 && (
            <>
              <Separator className="mx-3 my-2 bg-sidebar-border/50" />
              <MenuSection label="Administração" items={adminItems} isCollapsed={isCollapsed} />
            </>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar-background border-t border-sidebar-border/30">
        {profile && !isCollapsed && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-sidebar-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.nome_vendedor}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{profile.cargo}</p>
              </div>
            </div>
          </div>
        )}
        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          size="sm"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="text-sm">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
