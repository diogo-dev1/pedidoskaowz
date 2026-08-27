import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Download, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Evento global — abre o menu lateral no mobile (ouvido pelo BottomNav). */
export const ABRIR_MENU_EVENTO = 'kaowz:abrir-menu';

export function TopNav({ title }: { title: string }) {
  const { profile, user, signOut } = useAuth();
  const inicial = (profile?.nome_vendedor ?? 'K').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="h-14 px-3 sm:px-5 flex items-center gap-3">
        {/* Menu (mobile) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(ABRIR_MENU_EVENTO))}
          aria-label="Abrir menu"
          className="md:hidden -ml-1 h-10 w-10 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Marca — apenas desktop (mobile prioriza o título) */}
        <NavLink to="/" className="hidden md:flex items-center shrink-0 w-[204px]">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Kaowz<span className="text-brand">.</span>
          </span>
        </NavLink>

        {/* Título da tela */}
        <h1 className="flex-1 min-w-0 truncate text-base sm:text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        {/* Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-9 w-9 rounded-full bg-brand flex items-center justify-center text-sm font-semibold text-brand-foreground shrink-0 hover:bg-brand-hover transition-colors outline-none"
              aria-label="Menu do usuário"
            >
              {inicial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold truncate">{profile?.nome_vendedor}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-brand font-semibold mt-0.5">
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
