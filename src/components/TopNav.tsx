import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calculator, LogOut, User, MessageSquare, BookOpen, ChevronDown,
  ShoppingBag, Layers, Package, Info, CheckSquare, DollarSign,
  Users, Store, Image, TrendingUp, Eye, Link2, LayoutDashboard,
  Globe, Truck, Briefcase, Download, Boxes, ClipboardList, Factory, Settings, Send,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GRUPOS: NavGroup[] = [
  {
    label: 'Vendas',
    items: [
      { title: 'Novo Pedido', url: '/novo-pedido', icon: Calculator },
      { title: 'Pedidos a Lançar', url: '/triagem', icon: ClipboardList },
      { title: 'Pedidos', url: '/pedidos', icon: ShoppingBag },
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
      { title: 'Produção', url: '/producao', icon: Factory },
      { title: 'Expedição', url: '/expedicao', icon: Truck },
      { title: 'Lote (legado)', url: '/lote', icon: Package },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { title: 'Catálogo Público', url: '/catalogo', icon: ShoppingBag },
      { title: 'Catálogo Público Internacional', url: '/catalogo-publico-internacional', icon: Globe },
      { title: 'Catálogo Revendedor', url: '/catalogo-revendedor', icon: Store },
      { title: 'Catálogo Revendedor Internacional', url: '/catalogo-internacional', icon: Globe },
      { title: 'Push Dagger Kaowz', url: '/push-dagger-kaowz', icon: Layers },
      { title: 'Monte seu Kit', url: '/monte-seu-kit', icon: Layers },
      { title: 'Kit Urban EDC', url: '/kit-urban-edc', icon: Layers },
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
    label: 'Comunic.',
    items: [
      { title: 'Auxílio de Vendas', url: '/auxilio-vendas', icon: BookOpen },
      { title: 'Mensagens', url: '/mensagens', icon: MessageSquare },
      { title: 'Mídia', url: '/midia', icon: Image },
    ],
  },
];

const ADMIN_PRODUTOS: NavItem[] = [
  { title: 'Cases Patola', url: '/admin/cases-patola', icon: Briefcase },
  { title: 'Modelos', url: '/admin/modelos', icon: Layers },
  { title: 'Componentes', url: '/admin/componentes', icon: Package },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
  { title: 'Informativos', url: '/admin/informativos', icon: Info },
  { title: 'Bling', url: '/bling', icon: Link2 },
  { title: 'Produtos Shopify', url: '/produtos-shopify', icon: ShoppingBag },
  { title: 'Estoque Shopify', url: '/inventory', icon: Boxes },
  { title: 'Vendas Site', url: '/shopify-orders', icon: Download },
];

const ADMIN_CATALOGOS: NavItem[] = [
  { title: 'Config. Catálogo Público', url: '/admin/catalogo', icon: ShoppingBag },
  { title: 'Config. Catálogo Público Int.', url: '/admin/catalogo-publico-internacional', icon: Globe },
  { title: 'Config. Catálogo Revendedor', url: '/admin/catalogo-revendedor', icon: Store },
  { title: 'Config. Catálogo Revendedor Int.', url: '/admin/catalogo-internacional', icon: Globe },
  { title: 'Config. Preview', url: '/admin/preview', icon: Eye },
  { title: 'Config. Push Dagger Kaowz', url: '/admin/push-dagger-kaowz', icon: Layers },
  { title: 'Config. Monte seu Kit', url: '/admin/monte-seu-kit', icon: Layers },
  { title: 'Config. Kit Urban EDC', url: '/admin/kit-urban-edc', icon: Layers },
];

function rotaAtiva(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(url + '/');
}

function grupoAtivo(pathname: string, items: NavItem[]): boolean {
  return items.some((i) => rotaAtiva(pathname, i.url));
}

/** Botão de categoria com dropdown — padrão Bling. */
function MenuGrupo({ grupo, pathname }: { grupo: NavGroup; pathname: string }) {
  const ativo = grupoAtivo(pathname, grupo.items);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1 rounded-md px-2 sm:px-3 py-2 text-sm font-medium transition-colors outline-none shrink-0',
            ativo
              ? 'text-white bg-white/10'
              : 'text-primary-foreground/70 hover:text-white hover:bg-white/10'
          )}
        >
          {grupo.label}
          <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {grupo.items.map((item) => (
          <DropdownMenuItem key={item.url} asChild>
            <NavLink
              to={item.url}
              className={cn(
                'flex items-center gap-2.5 cursor-pointer',
                rotaAtiva(pathname, item.url) && 'bg-accent/10 text-accent font-medium'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {item.title}
            </NavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopNav({ title }: { title: string }) {
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const isAdmin = profile?.cargo === 'admin' || profile?.cargo === 'vendedor';
  const inicial = (profile?.nome_vendedor ?? 'K').charAt(0).toUpperCase();
  const adminAtivo = grupoAtivo(pathname, [...ADMIN_PRODUTOS, ...ADMIN_CATALOGOS]);

  return (
    <header className="sticky top-0 z-40 bg-primary border-b border-border">
      <div className="px-2 sm:px-4 h-14 flex items-center gap-1 sm:gap-2">
        {/* Marca */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0 mr-0.5 sm:mr-1">
          <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
            Kaowz<span className="text-accent">.</span>
          </h1>
        </NavLink>

        {/* Menus por categoria — scrolláveis no mobile, flex no desktop */}
        <nav
          className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Menu principal"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1 rounded-md px-2 sm:px-3 py-2 text-sm font-medium transition-colors shrink-0',
                isActive
                  ? 'text-white bg-white/10'
                  : 'text-primary-foreground/70 hover:text-white hover:bg-white/10'
              )
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Início</span>
          </NavLink>

          {GRUPOS.map((g) => (
            <MenuGrupo key={g.label} grupo={g} pathname={pathname} />
          ))}

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 sm:px-3 py-2 text-sm font-medium transition-colors outline-none shrink-0',
                    adminAtivo
                      ? 'text-white bg-white/10'
                      : 'text-primary-foreground/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  Admin
                  <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[min(560px,calc(100vw-32px))] p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2">
                  <div>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Produtos & Integrações
                    </DropdownMenuLabel>
                    {ADMIN_PRODUTOS.map((item) => (
                      <DropdownMenuItem key={item.url} asChild>
                        <NavLink
                          to={item.url}
                          className={cn(
                            'flex items-center gap-2.5 cursor-pointer',
                            rotaAtiva(pathname, item.url) && 'bg-accent/10 text-accent font-medium'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {item.title}
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <div>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Config. Catálogos
                    </DropdownMenuLabel>
                    {ADMIN_CATALOGOS.map((item) => (
                      <DropdownMenuItem key={item.url} asChild>
                        <NavLink
                          to={item.url}
                          className={cn(
                            'flex items-center gap-2.5 cursor-pointer',
                            rotaAtiva(pathname, item.url) && 'bg-accent/10 text-accent font-medium'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {item.title}
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Avatar + menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground shrink-0 hover:opacity-90 transition-opacity outline-none"
              aria-label="Menu do usuário"
            >
              {inicial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold truncate">{profile?.nome_vendedor}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mt-0.5">
                {profile?.cargo}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/install" className="flex items-center gap-2.5 cursor-pointer">
                <Download className="h-4 w-4 text-muted-foreground" />
                Instalar App
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2.5" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
