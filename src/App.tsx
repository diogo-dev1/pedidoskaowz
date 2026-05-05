import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
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
import NotFound from "./pages/NotFound";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PWAInstallPrompt />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route
              path="/"
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
            <Route
              path="/configurador-kit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ConfiguradorKit />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
