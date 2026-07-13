import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Simulador from "./pages/Simulador";
import Lote from "./pages/Lote";
import AuxilioVendas from "./pages/AuxilioVendas";
import CalcularFrete from "./pages/CalcularFrete";
import ConfiguradorKit from "./pages/ConfiguradorKit";
import ConfiguradorKitConfig from "./pages/ConfiguradorKitConfig";
import Clientes from "./pages/Clientes";
import CatalogoPublico from "./pages/CatalogoPublico";
import CatalogoPublicoInternacional from "./pages/CatalogoPublicoInternacional";
import CatalogoDetalhe from "./pages/CatalogoDetalhe";
import MontarKit from "./pages/MontarKit";
import CustomizarLamina from "./pages/CustomizarLamina";
import GerenciarModelos from "./pages/admin/GerenciarModelos";
import GerenciarConfiguracoes from "./pages/admin/GerenciarConfiguracoes";
import GerenciarComponentes from "./pages/admin/GerenciarComponentes";
import GerenciarInformativos from "./pages/admin/GerenciarInformativos";
import ConfiguracoesCatalogo from "./pages/admin/ConfiguracoesCatalogo";
import MensagensPadrao from "./pages/MensagensPadrao";
import Dashboard from "./pages/Dashboard";
import KanbanBoard from "./pages/KanbanBoard";
import ListaValores from "./pages/ListaValores";
import Leads from "./pages/Leads";
import Orcamento from "./pages/Orcamento";
import Midia from "./pages/Midia";
import PreviewPage from "./pages/Preview";
import CatalogoRevendedor from "./pages/CatalogoRevendedor";
import ConfiguracoesCatalogoRevendedor from "./pages/admin/ConfiguracoesCatalogoRevendedor";
import CatalogoInternacional from "./pages/CatalogoInternacional";
import ConfiguracoesCatalogoInternacional from "./pages/admin/ConfiguracoesCatalogoInternacional";
import ConfiguracoesCatalogoPublicoInternacional from "./pages/admin/ConfiguracoesCatalogoPublicoInternacional";
import ConfiguracoesPreview from "./pages/admin/ConfiguracoesPreview";
import BlingIntegration from "./pages/BlingIntegration";
import Install from "./pages/Install";
import CasesPatola from "./pages/CasesPatola";
import CasesPatolaAdmin from "./pages/admin/CasesPatolaAdmin";
import ParcelamentoAdmin from "./pages/admin/ParcelamentoAdmin";
import ParcelamentoPublico from "./pages/ParcelamentoPublico";
import MonteSeuKitLaminas from "./pages/MonteSeuKitLaminas";
import MonteSeuKitLaminasAdmin from "./pages/admin/MonteSeuKitLaminasAdmin";
import Inventory from "./pages/Inventory";
import ShopifyOrders from "./pages/ShopifyOrders";
import Triagem from "./pages/Triagem";
import Pedidos from "./pages/Pedidos";
import PushDaggerConfigurador from "./pages/PushDaggerConfigurador";
import ExternalRedirect from "./components/ExternalRedirect";

import KitUrbanEdc from "./pages/KitUrbanEdc";
import KitUrbanEdcConfig from "./pages/KitUrbanEdcConfig";
import Producao from "./pages/Producao";
import ExpedicaoPage from "./pages/ExpedicaoPage";
import SimuladorPrecos from "./pages/SimuladorPrecos";
import SimuladorPrecosConfig from "./pages/admin/SimuladorPrecosConfig";
import ProdutosShopify from "./pages/ProdutosShopify";
import RelatorioVendas from "./pages/RelatorioVendas";
import RelatorioVendasRelatorios from "./pages/RelatorioVendasRelatorios";
import LancarPedidoBling from "./pages/LancarPedidoBling";
import NotFound from "./pages/NotFound";
import KnivesAdmin from "./pages/KnivesAdmin";
import Showroom from "./pages/Showroom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" richColors closeButton />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Home />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/novo-pedido"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Simulador />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Lote />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/modelos"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <GerenciarModelos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <GerenciarConfiguracoes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/componentes"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <GerenciarComponentes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/informativos"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <GerenciarInformativos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/catalogo"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <ConfiguracoesCatalogo />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalogo"
              element={<CatalogoPublico />}
            />
            <Route
              path="/catalogo/montar-kit"
              element={<MontarKit />}
            />
            <Route
              path="/catalogo/:id"
              element={<CatalogoDetalhe />}
            />
            <Route
              path="/admin/catalogo-publico-internacional"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <ConfiguracoesCatalogoPublicoInternacional />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalogo-publico-internacional"
              element={<CatalogoPublicoInternacional />}
            />
            <Route
              path="/catalogo-publico-internacional/montar-kit"
              element={<MontarKit />}
            />
            <Route
              path="/catalogo-publico-internacional/:id"
              element={<CatalogoDetalhe isInternacional />}
            />
            <Route
              path="/customizar-lamina"
              element={
                <ProtectedRoute>
                  <CustomizarLamina />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auxilio-vendas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AuxilioVendas />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Clientes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calcular-frete"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CalcularFrete />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/push-dagger-kaowz" element={<ConfiguradorKit />} />
            <Route path="/push-dagger-configurador" element={<PushDaggerConfigurador />} />
            {/* Compat: rota antiga */}
            <Route path="/configurador-kit" element={<ConfiguradorKit />} />
            <Route
              path="/admin/push-dagger-kaowz"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <ConfiguradorKitConfig />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mensagens"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MensagensPadrao />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tarefas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tarefas/:boardId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <KanbanBoard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lista-valores"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ListaValores />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Leads />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orcamento"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Orcamento />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/midia"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Midia />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalogo-revendedor"
              element={<CatalogoRevendedor />}
            />
            <Route
              path="/catalogo-revendedor/montar-kit"
              element={<MontarKit isRevendedor />}
            />
            <Route
              path="/catalogo-revendedor/:id"
              element={<CatalogoDetalhe isRevendedor />}
            />
            <Route
              path="/admin/catalogo-revendedor"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <ConfiguracoesCatalogoRevendedor />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalogo-internacional"
              element={<CatalogoInternacional />}
            />
            <Route
              path="/catalogo-internacional/montar-kit"
              element={<MontarKit isInternacional />}
            />
            <Route
              path="/catalogo-internacional/:id"
              element={<CatalogoDetalhe isInternacional />}
            />
            <Route
              path="/admin/catalogo-internacional"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <ConfiguracoesCatalogoInternacional />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/preview"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <ConfiguracoesPreview />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/preview"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PreviewPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bling"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <BlingIntegration />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/cases-patola" element={<CasesPatola />} />
            <Route
              path="/admin/cases-patola"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CasesPatolaAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parcelamento"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ParcelamentoAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/p/:slug" element={<ParcelamentoPublico />} />
            <Route path="/monte-seu-kit" element={<MonteSeuKitLaminas />} />
            <Route path="/kit-urban-edc" element={<KitUrbanEdc />} />
            <Route
              path="/admin/kit-urban-edc"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <KitUrbanEdcConfig />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/monte-seu-kit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MonteSeuKitLaminasAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Inventory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/triagem"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Triagem />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Pedidos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtos-shopify"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProdutosShopify />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulador-precos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SimuladorPrecos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/simulador-precos"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <SimuladorPrecosConfig />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorio-vendas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RelatorioVendas />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorio-vendas/relatorios"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RelatorioVendasRelatorios />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/producao"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Producao />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expedicao"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExpedicaoPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shopify-orders"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ShopifyOrders />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lancar-bling"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LancarPedidoBling />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/knives"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <KnivesAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/showroom" element={<Showroom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
