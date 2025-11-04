import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Calculator } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Calculator className="h-6 w-6 text-accent" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Vendas Kaowz</h1>
              </Link>
              
              {profile?.cargo === 'admin' && (
                <nav className="flex gap-4">
                  <Link to="/">
                    <Button variant={location.pathname === '/' ? 'default' : 'ghost'} size="sm">
                      Simulador
                    </Button>
                  </Link>
                  <Link to="/admin/modelos">
                    <Button variant={location.pathname.includes('/admin/modelos') ? 'default' : 'ghost'} size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Gerenciar Modelos
                    </Button>
                  </Link>
                  <Link to="/admin/componentes">
                    <Button variant={location.pathname.includes('/admin/componentes') ? 'default' : 'ghost'} size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Gerenciar Componentes
                    </Button>
                  </Link>
                </nav>
              )}
            </div>

            <div className="flex items-center gap-4">
              {profile && (
                <div className="text-sm text-right">
                  <p className="font-semibold text-foreground">{profile.nome_vendedor}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile.cargo}</p>
                </div>
              )}
              <Button onClick={signOut} variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
