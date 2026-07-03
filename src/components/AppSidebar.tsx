import { useAuth } from '@/contexts/AuthContext';
import {
  Calculator, Settings, LogOut, User, MessageSquare, BookOpen,
  ShoppingBag, Layers, Package, Info, CheckSquare, DollarSign,
  Users, Store, FileText, Image, TrendingUp, Eye, Link2, LayoutDashboard,
  Globe, Truck, Briefcase, Download, CreditCard, Boxes, ClipboardList, Factory
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
    { title: 'Início', url: '/', icon: LayoutDashboard },
    { title: 'Novo Pedido', url: '/novo-pedido', icon: Calculator },
    { title: 'Pedidos a Lançar', url: '/triagem', icon: ClipboardList },
    { title: 'Pedidos', url: '/pedidos', icon: ShoppingBag },
    { title: 'Lista de Valores', url: '/lista-valores', icon: DollarSign },
    { title: 'Calcular Frete', url: '/calcular-frete', icon: Truck },
    { title: 'Simulador de Preços', url: '/simulador-precos', icon: Calculator },
    { title: 'Relatório de Vendas', url: '/relatorio-vendas', icon: TrendingUp },
  ];

  const producaoItems: MenuItem[] = [
    { title: 'Produção', url: '/producao', icon: Factory },
    { title: 'Expedição', url: '/expedicao', icon: Truck },
    { title: 'Lote (legado)', url: '/lote', icon: Package },
  ];

  const catalogoItems: MenuItem[] = [
    { title: 'Catálogo Público', url: '/catalogo', icon: ShoppingBag },
    { title: 'Catálogo Público Internacional', url: '/catalogo-publico-internacional', icon: Globe },
    { title: 'Catálogo Revendedor', url: '/catalogo-revendedor', icon: Store },
    { title: 'Catálogo Revendedor Internacional', url: '/catalogo-internacional', icon: Globe },
    { title: 'Push Dagger Kaowz', url: '/push-dagger-kaowz', icon: Layers },
    { title: 'Monte seu Kit', url: '/monte-seu-kit', icon: Layers },
    { title: 'Kit Urban EDC', url: '/kit-urban-edc', icon: Layers },
  ];

  const crmItems: MenuItem[] = [
    { title: 'Clientes', url: '/clientes', icon: Users },
    { title: 'Leads', url: '/leads', icon: TrendingUp },
    { title: 'Tarefas', url: '/tarefas', icon: CheckSquare },
  ];

  const comunicacaoItems: MenuItem[] = [
    { title: 'Auxílio de Vendas', url: '/auxilio-vendas', icon: BookOpen },
    { title: 'Mensagens', url: '/mensagens', icon: MessageSquare },
    { title: 'Mídia', url: '/midia', icon: Image },
  ];

  const isAdmin = profile?.cargo === 'admin' || profile?.cargo === 'vendedor';

  const adminProdutoItems: MenuItem[] = isAdmin ? [
    { title: 'Cases Patola', url: '/admin/cases-patola', icon: Briefcase },
    { title: 'Modelos', url: '/admin/modelos', icon: Layers },
    { title: 'Componentes', url: '/admin/componentes', icon: Package },
    { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
    { title: 'Informativos', url: '/admin/informativos', icon: Info },
    { title: 'Bling', url: '/bling', icon: Link2 },
    { title: 'Produtos Shopify', url: '/produtos-shopify', icon: ShoppingBag },
    { title: 'Estoque Shopify', url: '/inventory', icon: Boxes },
    { title: 'Vendas Site', url: '/shopify-orders', icon: Download },
  ] : [];

  const adminCatalogoItems: MenuItem[] = isAdmin ? [
    { title: 'Config. Catálogo Público', url: '/admin/catalogo', icon: ShoppingBag },
    { title: 'Config. Catálogo Público Internacional', url: '/admin/catalogo-publico-internacional', icon: Globe },
    { title: 'Config. Catálogo Revendedor', url: '/admin/catalogo-revendedor', icon: Store },
    { title: 'Config. Catálogo Revendedor Internacional', url: '/admin/catalogo-internacional', icon: Globe },
    { title: 'Config. Preview', url: '/admin/preview', icon: Eye },
    { title: 'Config. Push Dagger Kaowz', url: '/admin/push-dagger-kaowz', icon: Layers },
    { title: 'Config. Monte seu Kit', url: '/admin/monte-seu-kit', icon: Layers },
    { title: 'Config. Kit Urban EDC', url: '/admin/kit-urban-edc', icon: Layers },
  ] : [];

  return (
    <Sidebar className="border-r-0">
      <SidebarContent className="bg-sidebar-background overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="space-y-1 py-2">
          <MenuSection label="Vendas" items={vendaItems} isCollapsed={isCollapsed} />
          <MenuSection label="Produção" items={producaoItems} isCollapsed={isCollapsed} />
          <MenuSection label="Catálogos" items={catalogoItems} isCollapsed={isCollapsed} />
          <MenuSection label="CRM" items={crmItems} isCollapsed={isCollapsed} />
          <MenuSection label="Comunicação" items={comunicacaoItems} isCollapsed={isCollapsed} />
          {isAdmin && (
            <>
              <Separator className="mx-3 my-2 bg-sidebar-border/50" />
              <MenuSection label="Administração" items={adminProdutoItems} isCollapsed={isCollapsed} />
              <MenuSection label="Config. Catálogos" items={adminCatalogoItems} isCollapsed={isCollapsed} />
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
          asChild
          className="w-full justify-start gap-3 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-sm"
          size="sm"
        >
          <NavLink to="/install">
            <Download className="h-4 w-4" />
            {!isCollapsed && <span className="text-sm font-medium">Instalar App</span>}
          </NavLink>
        </Button>
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
