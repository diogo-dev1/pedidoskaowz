import { Menu } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full overflow-x-hidden">
          {/* Header escuro estilo Kaowz */}
          <header className="sticky top-0 z-40 bg-primary border-b border-border">
            <div className="px-4 py-3 flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 text-primary-foreground hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-semibold text-primary-foreground">Kaowz</h1>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 bg-secondary overflow-x-hidden">
            <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
