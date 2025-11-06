import { useAuth } from '@/contexts/AuthContext';
import { Calculator, Settings, LogOut, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const mainItems = [
    { title: 'Simulador', url: '/', icon: Calculator },
  ];

  const adminItems = profile?.cargo === 'admin' ? [
    { title: 'Gerenciar Modelos', url: '/admin/modelos', icon: Settings },
    { title: 'Gerenciar Componentes', url: '/admin/componentes', icon: Settings },
  ] : [];

  return (
    <Sidebar>
      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium">
            {!isCollapsed && 'Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 transition-colors ${
                          isActive
                            ? 'bg-foreground text-background font-medium'
                            : 'hover:bg-secondary'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu Admin */}
        {adminItems.length > 0 && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium">
                {!isCollapsed && 'Administração'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center gap-3 transition-colors ${
                              isActive
                                ? 'bg-foreground text-background font-medium'
                                : 'hover:bg-secondary'
                            }`
                          }
                        >
                          <item.icon className="h-5 w-5" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer com perfil e logout */}
      <SidebarFooter>
        <Separator className="mb-2" />
        {profile && !isCollapsed && (
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium truncate">{profile.nome_vendedor}</p>
            </div>
            <p className="text-xs text-muted-foreground capitalize pl-6">{profile.cargo}</p>
          </div>
        )}
        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full justify-start gap-3"
          size="sm"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
