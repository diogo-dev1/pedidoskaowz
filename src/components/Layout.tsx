import { Menu } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header minimalista fixo */}
          <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="px-4 py-4 flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-medium tracking-tight">Kaowz</h1>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
