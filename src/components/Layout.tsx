import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';

// Título contextual exibido no header — orienta onde o usuário está
const PAGE_TITLES: Record<string, string> = {
  '/': 'Início',
  '/novo-pedido': 'Novo Pedido',
  '/triagem': 'Pedidos a Lançar',
  '/pedidos': 'Pedidos',
  '/lista-valores': 'Lista de Valores',
  '/calcular-frete': 'Calcular Frete',
  '/simulador-precos': 'Simulador de Preços',
  '/relatorio-vendas': 'Relatório de Vendas',
  '/relatorio-vendas/relatorios': 'Relatório de Vendas',
  '/producao': 'Produção',
  '/expedicao': 'Expedição',
  '/lote': 'Lote',
  '/clientes': 'Clientes',
  '/leads': 'Leads',
  '/tarefas': 'Tarefas',
  '/auxilio-vendas': 'Auxílio de Vendas',
  '/mensagens': 'Mensagens',
  '/midia': 'Mídia',
  '/orcamento': 'Orçamento',
  '/preview': 'Preview',
  '/bling': 'Bling',
  '/inventory': 'Estoque Shopify',
  '/produtos-shopify': 'Produtos Shopify',
  '/shopify-orders': 'Vendas Site',
  '/catalogo': 'Catálogo',
  '/catalogo-revendedor': 'Catálogo Revendedor',
  '/admin/modelos': 'Modelos',
  '/admin/componentes': 'Componentes',
  '/admin/configuracoes': 'Configurações',
  '/admin/informativos': 'Informativos',
  '/admin/cases-patola': 'Cases Patola',
  '/admin/kit-urban-edc': 'Config. Kit Urban EDC',
  '/admin/monte-seu-kit': 'Config. Monte seu Kit',
  '/admin/push-dagger-kaowz': 'Config. Push Dagger',
};

function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefixo mais longo que casar (ex.: /tarefas/:boardId → Tarefas)
  const match = Object.keys(PAGE_TITLES)
    .filter((p) => p !== '/' && pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'Kaowz';
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile } = useAuth();
  const title = pageTitle(location.pathname);
  const inicial = (profile?.nome_vendedor ?? 'K').charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <AppSidebar />

        <div className="flex-1 flex flex-col w-full overflow-x-hidden">
          <header className="sticky top-0 z-40 bg-primary border-b border-border">
            <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2">
              {/* Hambúrguer só no desktop — no mobile a navegação é pela barra inferior */}
              <SidebarTrigger className="hidden md:inline-flex h-10 w-10 text-primary-foreground hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>

              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-primary-foreground shrink-0">Kaowz</h1>
                {title !== 'Kaowz' && (
                  <>
                    <span className="text-primary-foreground/30 shrink-0">/</span>
                    <span className="text-sm text-primary-foreground/80 truncate">{title}</span>
                  </>
                )}
              </div>

              <div
                className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground shrink-0"
                title={profile?.nome_vendedor}
                aria-hidden="true"
              >
                {inicial}
              </div>
            </div>
          </header>

          <main className="flex-1 bg-secondary overflow-x-hidden">
            <div className="w-full max-w-6xl mx-auto p-3 sm:p-6 pb-24 md:pb-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      <BottomNav />
    </SidebarProvider>
  );
}
