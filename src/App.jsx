import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { DataGrid } from './components/shared/DataGrid'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Import Pages
import { Badge } from './components/ui/Badge'
import { SettingsPage } from './pages/Admin/SettingsPage'
import { LoginPage } from './pages/Auth/LoginPage'
import { PartnersPage } from './pages/Partners/PartnersPage'
import { ExportPage } from './pages/Export/ExportPage'
import { FinanceDashboard } from './pages/Finance/FinanceDashboard'
import { ProcurementDashboard } from './pages/Procurement/ProcurementDashboard'
import { ProcessingPage } from './pages/Processing/ProcessingPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { ReceptionsPage } from './pages/Receptions/ReceptionsPage'

// Mock Data for Dashboard Home
const mockContracts = [
  { id: 'CTR-001', supplier: 'Coop Abengourou', date: '2026-01-15', quantity: 25000, status: 'Active' },
  { id: 'CTR-002', supplier: 'Coop Daloa', date: '2026-01-16', quantity: 15000, status: 'Draft' },
  { id: 'CTR-003', supplier: 'Plantations Kouadio', date: '2026-01-18', quantity: 5000, status: 'Fulfilled' },
];

const columns = [
  { accessorKey: 'id', header: 'Reference' },
  { accessorKey: 'supplier', header: 'Fournisseur' },
  { accessorKey: 'date', header: 'Date Contrat' },
  { accessorKey: 'quantity', header: 'Poids (Kg)' },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ getValue }) => {
      const status = getValue();
      const variant =
        status === 'Active' ? 'action' :
          status === 'Draft' ? 'warning' :
            'success';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
];

const HomeDashboard = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <div className="text-sm text-muted-foreground">Volume Campagne</div>
        <div className="text-2xl font-bold text-foreground mt-2">1,240 T</div>
        <div className="text-xs text-success-green mt-1">+12% vs N-1</div>
      </div>
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <div className="text-sm text-muted-foreground">Contrats Actifs</div>
        <div className="text-2xl font-bold text-foreground mt-2">15</div>
        <div className="text-xs text-muted-foreground mt-1">3 en attente de val.</div>
      </div>
      <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
        <div className="text-sm text-muted-foreground">Trésorerie Dispo</div>
        <div className="text-2xl font-bold text-foreground mt-2">850 M XOF</div>
        <div className="text-xs text-action-blue mt-1">Ligne de crédit: OK</div>
      </div>
    </div>

    <DataGrid
      title="Contrats Récents"
      data={mockContracts}
      columns={columns}
    />
  </div>
);

const AuthenticatedApp = () => {
  const { user, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('dashboard');

  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!user) return <LoginPage />;

  const renderContent = () => {
    switch (currentRoute) {
      case 'settings': return <SettingsPage />;
      case 'finance': return <FinanceDashboard />;
      case 'procurement': return <ProcurementDashboard />;
      case 'processing': return <ProcessingPage />;
      case 'export': return <ExportPage />;
      case 'partners': return <PartnersPage />;
      case 'receptions': return <ReceptionsPage />;
      case 'profile': return <ProfilePage />;
      case 'dashboard':
      default: return <HomeDashboard />;
    }
  };

  return (
    <AppShell onNavigate={setCurrentRoute} currentRoute={currentRoute}>
      {renderContent()}
    </AppShell>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="origin-theme">
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
