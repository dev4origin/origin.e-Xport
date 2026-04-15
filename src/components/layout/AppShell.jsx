import { Factory, Landmark, LogOut, Moon, Package, Settings, Sun, Truck, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
};

export const AppShell = ({ children, onNavigate, currentRoute }) => {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold">
              eX
            </div>
            e-Xport
          </h1>
          <p className="text-xs text-muted-foreground mt-1">ERP Industriel & Export</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4 mt-2">
            Modules
          </div>
          <SidebarItem
            icon={Settings}
            label="Campagnes"
            active={currentRoute === 'settings'}
            onClick={() => onNavigate('settings')}
          />
          <SidebarItem
            icon={Users}
            label="Partenaires"
            active={currentRoute === 'partners'}
            onClick={() => onNavigate('partners')}
          />
          <SidebarItem
            icon={Truck}
            label="Contrats Achats"
            active={currentRoute === 'procurement'}
            onClick={() => onNavigate('procurement')}
          />
          <SidebarItem
            icon={Package}
            label="Réceptions & Stocks"
            active={currentRoute === 'receptions'}
            onClick={() => onNavigate('receptions')}
          />
          <SidebarItem
            icon={Factory}
            label="Usinage"
            active={currentRoute === 'processing'}
            onClick={() => onNavigate('processing')}
          />
          <SidebarItem
            icon={Landmark}
            label="Finance & Nanti."
            active={currentRoute === 'finance'}
            onClick={() => onNavigate('finance')}
          />

          <SidebarItem
            icon={Package}
            label="Export"
            active={currentRoute === 'export'}
            onClick={() => onNavigate('export')}
          />
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-sm text-destructive hover:text-destructive/80 px-4 py-2 w-full"
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="text-lg font-medium">Dashboard</div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div
              className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
              onClick={() => onNavigate('profile')}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-sm">
                <div className="font-medium">{user?.email || 'User'}</div>
                <div className="text-xs text-muted-foreground">{user?.role || 'Member'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
