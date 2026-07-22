import { NavLink, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calculator, Users, TrendingUp, LayoutDashboard,
  ShoppingBag, MessageSquare, BookOpen, Image, DollarSign, Factory,
  CheckSquare, Store, Layers, Package, Settings, Info, Link2, Globe, Truck,
  ClipboardList, Boxes, Download, Briefcase, Send, Eye, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface NavItem { title: string; url: string; icon: React.ComponentType<{ className?: string }> }
interface NavGroup { label: string; items: NavItem[] }

const MAIN: NavItem[] = [
  { title: 'Início', url: '/', icon: LayoutDashboard },
  { title: 'Novo Pedido', url: '/novo-pedido', icon: Calculator },
  { title: 'Pedidos', url: '/pedidos', icon: ShoppingBag },
  { title: 'Produção', url: '/producao', icon: Factory },
];

const GRUPOS: NavGroup[] = [
  {
    label: 'Vendas',
    items: [
      { title: 'Pedidos a Lançar', url: '/triagem', icon: ClipboardList },
      { title: 'Lista de Valores', url: '/lista-valores', icon: DollarSign },
      { title: 'Calcular Frete', url: '/calcular-frete', icon: Truck },
      { title: 'Simulador de Preços', url: '/simulador-precos', icon: Calculator },
      { title: 'Relatório de Vendas', url: '/relatorio-vendas', icon: TrendingUp },
      { title: 'Lançar no Bling', url: '/lancar-bling', icon: Send },
    ],
  },
  {
    label: 'Produção',
    items: [
      { title: 'Expedição', url: '/expedicao', icon: Truck },
      { title: 'Lote (legado)', url: '/lote', icon: Package },
    ],
  },
  {
    label: 'CRM',
    items: [
      { title: 'Clientes', url: '/clientes', icon: Users },
      { title: 'Leads', url: '/leads', icon: TrendingUp },
      { title: 'Tarefas', url: '/tarefas', icon: CheckSquare },
    ],
  },
  {
    label: 'Catálogos e Conteúdo',
    items: [
      { title: 'Catálogo Público', url: '/catalogo', icon: ShoppingBag },
      { title: 'Catálogo Público Int.', url: '/catalogo-publico-internacional', icon: Globe },
      { title: 'Catálogo Revendedor', url: '/catalogo-revendedor', icon: Store },
      { title: 'Catálogo Revendedor Int.', url: '/catalogo-internacional', icon: Globe },
      { title: 'Push Dagger Kaowz', url: '/push-dagger-kaowz', icon: Layers },
      { title: 'Monte seu Kit', url: '/monte-seu-kit', icon: Layers },
      { title: 'Kit Urban EDC', url: '/kit-urban-edc', icon: Layers },
      { title: 'Auxílio de Vendas', url: '/auxilio-vendas', icon: BookOpen },
      { title: 'Mensagens', url: '/mensagens', icon: MessageSquare },
      { title: 'Mídia', url: '/midia', icon: Image },
    ],
  },
];

const ADMIN: NavItem[] = [
  { title: 'Cases Patola', url: '/admin/cases-patola', icon: Briefcase },
  { title: 'Modelos', url: '/admin/modelos', icon: Layers },
  { title: 'Componentes', url: '/admin/componentes', icon: Package },
  { title: 'Valores do Simulador', url: '/admin/simulador-precos', icon: Calculator },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
  { title: 'Informativos', url: '/admin/informativos', icon: Info },
  { title: 'Config. Preview', url: '/admin/preview', icon: Eye },
  { title: 'Bling', url: '/bling', icon: Link2 },
  { title: 'Produtos Shopify', url: '/produtos-shopify', icon: ShoppingBag },
  { title: 'Estoque Shopify', url: '/inventory', icon: Boxes },
  { title: 'Vendas Site', url: '/shopify-orders', icon: Download },
];

function match(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(url + '/');
}

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = profile?.cargo === 'admin' || profile?.cargo === 'vendedor';

  const defaultOpen = useMemo(() => {
    for (const g of GRUPOS) {
      if (g.items.some((i) => match(pathname, i.url))) return g.label;
    }
    if (isAdmin && ADMIN.some((i) => match(pathname, i.url))) return 'Administração';
    return GRUPOS[0].label;
  }, [pathname, isAdmin]);

  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border bg-card sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {MAIN.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-foreground hover:bg-secondary'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-2 pb-3 flex-1">
        <Accordion type="single" collapsible defaultValue={defaultOpen} className="w-full">
          {GRUPOS.map((group) => (
            <AccordionItem key={group.label} value={group.label} className="border-none">
              <AccordionTrigger className="px-2 py-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground hover:no-underline hover:text-foreground">
                {group.label}
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-foreground hover:bg-secondary'
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}

          {isAdmin && (
            <AccordionItem value="Administração" className="border-none">
              <AccordionTrigger className="px-2 py-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground hover:no-underline hover:text-foreground">
                Administração
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-0.5">
                  {ADMIN.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-foreground hover:bg-secondary'
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      <div className="p-2 border-t border-border">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
