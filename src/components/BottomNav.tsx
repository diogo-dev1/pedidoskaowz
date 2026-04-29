import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calculator, FileText, Users, TrendingUp, MoreHorizontal,
  ShoppingBag, MessageSquare, BookOpen, Image, Eye, DollarSign,
  CheckSquare, Store, Layers, Package, Settings, Info, Link2, LogOut, User, Globe
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainTabs: NavItem[] = [
  { title: 'Simulador', url: '/', icon: Calculator },
  { title: 'Orçamento', url: '/orcamento', icon: FileText },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Leads', url: '/leads', icon: TrendingUp },
];

const moreItems: { label: string; items: NavItem[] }[] = [
  {
    label: 'Vendas',
    items: [
      { title: 'Lista de Valores', url: '/lista-valores', icon: DollarSign },
    ],
  },
  {
    label: 'CRM',
    items: [
      { title: 'Tarefas', url: '/tarefas', icon: CheckSquare },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { title: 'Catálogo Público', url: '/catalogo', icon: ShoppingBag },
      { title: 'Catálogo Público Internacional', url: '/catalogo-publico-internacional', icon: Globe },
      { title: 'Catálogo Revendedor', url: '/catalogo-revendedor', icon: Store },
      { title: 'Catálogo Revendedor Internacional', url: '/catalogo-internacional', icon: Globe },
      { title: 'Auxílio de Vendas', url: '/auxilio-vendas', icon: BookOpen },
      { title: 'Mensagens', url: '/mensagens', icon: MessageSquare },
      { title: 'Mídia', url: '/midia', icon: Image },
      { title: 'Preview', url: '/preview', icon: Eye },
    ],
  },
];

const adminMoreItems: NavItem[] = [
  { title: 'Modelos', url: '/admin/modelos', icon: Layers },
  { title: 'Componentes', url: '/admin/componentes', icon: Package },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
  { title: 'Informativos', url: '/admin/informativos', icon: Info },
  { title: 'Config. Catálogo', url: '/admin/catalogo', icon: Store },
  { title: 'Config. Revendedor', url: '/admin/catalogo-revendedor', icon: TrendingUp },
  { title: 'Config. Preview', url: '/admin/preview', icon: Eye },
  { title: 'Bling', url: '/bling', icon: Link2 },
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
        <SheetContent side="right" className="w-[280px] p-0 overflow-y-auto">
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

          <div className="p-3 space-y-4">
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-stretch">
          {mainTabs.map((tab) => (
            <NavLink
              key={tab.url}
              to={tab.url}
              end={tab.url === '/'}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-muted-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon className={cn('h-5 w-5', isActive && 'text-accent')} />
                  <span>{tab.title}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
              isMoreActive || moreOpen
                ? 'text-accent font-semibold'
                : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className={cn('h-5 w-5', (isMoreActive || moreOpen) && 'text-accent')} />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
