import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, LogOut, Menu, Moon, Sun, User } from 'lucide-react';

export const Navbar = () => {
  const { user, activeCompany, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useUiStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Lado izquierdo: Botón Toggle Sidebar y Nombre de la MYPE activa */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Alternar barra lateral"
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {activeCompany ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold truncate max-w-[150px] sm:max-w-[220px]">
                {activeCompany.razonSocial}
              </span>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
                RUC: {activeCompany.ruc}
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Sin empresa seleccionada
            </span>
          )}
        </div>

        {/* Lado derecho: Tema Claro/Oscuro, Usuario y Salir */}
        <div className="flex items-center gap-2">
          {/* Selector de tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            className="h-8 w-8"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Perfil de usuario */}
          <div className="flex items-center gap-2 pl-2 border-l">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-medium leading-none">
                {user?.name || 'Usuario MYPE'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {user?.role || 'OPERATOR'}
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
              <User className="h-4 w-4" />
            </div>
          </div>

          {/* Botón Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Cerrar sesión"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
