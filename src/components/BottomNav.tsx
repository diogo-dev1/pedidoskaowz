import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calculator, Users, TrendingUp, MoreHorizontal, LayoutDashboard,
  ShoppingBag, MessageSquare, BookOpen, Image, DollarSign, Factory,
  CheckSquare, Store, Layers, Package, Settings, Info, Link2, LogOut, User, Globe, Truck,
  ClipboardList, Boxes, Download, Briefcase, Send,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

// 4 destinos de polegar + botão "Mais" — o fluxo diário inteiro a um toque
const mainTabs: NavItem[] = [
  { title: 'Início', url: '/', icon: LayoutDashboard },
  { title: 'Novo', url: '/novo-pedido', icon: Calculator },
  { title: 'Pedidos', url: '/pedidos', icon: ShoppingBag },
  { title: 'Produção', url: '/producao', icon: Factory },
];

const moreItems: { label: string; items: NavItem[] }[] = [
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
      { title: 'Catálogo Revendedor', url: '/catalogo-revendedor', icon: Store },
      { title: 'Push Dagger Kaowz', url: '/push-dagger-kaowz', icon: Layers },
      { title: 'Monte seu Kit', url: '/monte-seu-kit', icon: Layers },
      { title: 'Kit Urban EDC', url: '/kit-urban-edc', icon: Layers },
      { title: 'Auxílio de Vendas', url: '/auxilio-vendas', icon: BookOpen },
      { title: 'Mensagens', url: '/mensagens', icon: MessageSquare },
      { title: 'Mídia', url: '/midia', icon: Image },
    ],
  },
];

const adminMoreItems: NavItem[] = [
  { title: 'Cases Patola', url: '/admin/cases-patola', icon: Briefcase },
  { title: 'Modelos', url: '/admin/modelos', icon: Layers },
  { title: 'Componentes', url: '/admin/componentes', icon: Package },
  { title: 'Valores do Simulador', url: '/admin/simulador-precos', icon: Calculator },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
  { title: 'Informativos', url: '/admin/informativos', icon: Info },
  { title: 'Bling', url: '/bling', icon: Link2 },
  { title: 'Produtos Shopify', url: '/produtos-shopify', icon: ShoppingBag },
  { title: 'Estoque Shopify', url: '/inventory', icon: Boxes },
  { title: 'Vendas Site', url: '/shopify-orders', icon: Download },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const isAdmin = profile?.cargo === 'admin' || profile?.cargo === 'vendedor';

  // Check if current route is in the "more" menu
  const moreRoutes = [
    ...moreItems.flatMap(g => g.items.map(i => i.url)),
    ...(isAdmin ? adminMoreItems.map(i => i.url) : []),
  ];
  const isMoreActive = moreRoutes.some(url => location.pathname === url || location.pathname.startsWith(url + '/'));

  return (
    <>
      {/* Side panel */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right" className="w-[290px] p-0 overflow-y-auto">
          <SheetHeader className="px-4 py-3 border-b border-border">
            {profile && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div className="text-left">
                  <SheetTitle className="text-sm">{profile.nome_vendedor}</SheetTitle>
                  <p className="text-[10px] text-muted-foreground capitalize">{profile.cargo}</p>
                </div>
              </div>
            )}
            {!profile && <SheetTitle>Menu</SheetTitle>}
          </SheetHeader>

          <div className="p-3 space-y-4 pb-safe">
            {moreItems.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
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
              </div>
            ))}

            {isAdmin && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-1.5">Administração</p>
                <div className="space-y-0.5">
                  {adminMoreItems.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
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
              </div>
            )}

            <button
              onClick={() => { setMoreOpen(false); signOut(); }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border md:hidden pb-safe"
        aria-label="Navegação principal"
      >
        <div className="flex items-stretch">
          {mainTabs.map((tab) => (
            <NavLink
              key={tab.url}
              to={tab.url}
              end={tab.url === '/'}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-2 text-[10px] transition-colors',
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-muted-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex items-center justify-center h-7 w-12 rounded-full transition-colors',
                      isActive && 'bg-accent/15'
                    )}
                  >
                    <tab.icon className="h-5 w-5" />
                  </span>
                  <span>{tab.title}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-2 text-[10px] transition-colors',
              isMoreActive || moreOpen
                ? 'text-accent font-semibold'
                : 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center h-7 w-12 rounded-full transition-colors',
                (isMoreActive || moreOpen) && 'bg-accent/15'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </span>
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
