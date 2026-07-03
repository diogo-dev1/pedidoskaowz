import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText } from 'lucide-react';

const navItems = [
  { href: '/relatorio-vendas', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/relatorio-vendas/relatorios', label: 'Relatórios', icon: FileText },
];

export function RelatorioVendasNav() {
  return (
    <div className="flex rounded-lg border overflow-hidden w-fit">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`
          }
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
