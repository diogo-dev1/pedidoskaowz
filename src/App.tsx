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
import Catalogo from "./pages/Catalogo";
import GerenciarModelos from "./pages/admin/GerenciarModelos";
import GerenciarComponentes from "./pages/admin/GerenciarComponentes";
import MensagensPadrao from "./pages/MensagensPadrao";
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
              path="/catalogo"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Catalogo />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
