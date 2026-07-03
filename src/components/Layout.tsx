import { useLocation } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';

// Título contextual exibido no header mobile — orienta onde o usuário está
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
  const title = pageTitle(location.pathname);

  return (
    <div className="min-h-screen flex flex-col w-full bg-background overflow-x-hidden">
      <TopNav title={title} />

      <main className="flex-1 bg-secondary overflow-x-hidden">
        <div className="w-full max-w-6xl mx-auto p-3 sm:p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
