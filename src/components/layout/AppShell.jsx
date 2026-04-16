import { Factory, Landmark, LogOut, Moon, Ship, Settings, Sun, Truck, Users, Home, FilePenLine } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 font-medium ${active
        ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
        : 'text-white/60 hover:bg-white/5 hover:text-white'
        }`}
    >
      <Icon size={18} className={active ? 'text-white' : 'opacity-80'} />
      <span className="text-[13px] tracking-wide">{label}</span>
    </button>
  );
};

export const AppShell = ({ children, onNavigate, currentRoute }) => {
  const { theme, setTheme } = useTheme();
  const { logout, user, profile } = useAuth();

  // Extract display name from profile
  const fullName = profile?.user?.full_name || '';
  const firstName = fullName.split(' ')[0] || user?.email?.split('@')[0] || 'Utilisateur';
  
  const displayName = fullName || user?.email || 'Utilisateur';
  const initials = firstName ? firstName[0].toUpperCase() : 'U';

  const routeTitles = {
    dashboard: 'Dashboard',
    settings: 'Campagnes & Paramètres',
    partners: 'Réseau & Partenaires',
    procurement: 'Contrats Achats',
    receptions: 'Réceptions & Stocks',
    processing: 'Usinage',
    finance: 'Finance & Nantissement',
    export: 'Export',
    profile: 'Mon Profil'
  };

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-white overflow-hidden font-sans selection:bg-white/20">
      {/* Sidebar */}
      <aside className="w-[260px] flex flex-col shrink-0 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.3)] z-10">
        <div className="p-8 pb-6 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-inner">
              eX
            </div>
            eXport
          </h1>
          <p className="text-[10px] text-white/50 mt-2 font-bold tracking-widest uppercase">ERP Industriel & Export</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 px-3 mt-2">
            Modules
          </div>
          <SidebarItem
            icon={Home}
            label="Dashboard"
            active={currentRoute === 'dashboard'}
            onClick={() => onNavigate('dashboard')}
          />
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
            icon={FilePenLine}
            label="Contrats Achats"
            active={currentRoute === 'procurement'}
            onClick={() => onNavigate('procurement')}
          />
          <SidebarItem
            icon={Truck}
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
            icon={Ship}
            label="Export"
            active={currentRoute === 'export'}
            onClick={() => onNavigate('export')}
          />
        </nav>

        <div className="p-6 border-t border-white/10 mt-auto">
          {/* User Account Info inside Sidebar — click navigates to Profile */}
          <div 
             className="flex items-center space-x-3 p-2 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
             onClick={() => onNavigate('profile')}
          >
              <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20 shadow-md">
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-white truncate">{firstName}</div>
                <div className="text-[11px] text-white/60 truncate">{profile?.roleInOrg || 'Membre'}</div>
              </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area Wrapped inside a Floating Card */}
      <main className="flex-1 flex flex-col h-full overflow-hidden p-3 pl-0 pb-3">
        <div className="flex-1 flex flex-col bg-background text-foreground rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 relative">
          
        {/* Header inside the Card */}
        <header className="h-20 border-b border-border/40 bg-card/40 backdrop-blur-sm flex items-center justify-between px-8 shrink-0">
          <div className="text-2xl font-bold tracking-tight">{routeTitles[currentRoute] || 'Tableau de Bord'}</div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors border border-border/50 shadow-sm bg-card"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {currentRoute === 'dashboard' && (
              <button
                  className="px-4 py-2 font-medium text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
                  onClick={() => onNavigate('settings')}
              >
                  Add Custom Widget
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-8 bg-accent/10">
          {children}
        </div>
        
        </div>
      </main>
    </div>
  );
};
