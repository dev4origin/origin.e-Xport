import { AlertCircle, Lock, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { financeService } from '../../services/financeService';

const columns = [
  { accessorKey: 'reference_dossier', header: 'Référence' },
  { accessorKey: 'bank', header: 'Banque' },
  { 
    accessorKey: 'montant_financement_demande', 
    header: 'Montant (XOF)',
    cell: ({ getValue }) => <span className="font-mono font-medium">{(getValue() || 0).toLocaleString()}</span>
  },
  { accessorKey: 'date_demande', header: 'Date Demande' },
  { accessorKey: 'lots', header: 'Lots Nantis' },
  {
    accessorKey: 'statut',
    header: 'Statut',
    cell: ({ getValue }) => {
      const status = getValue();
      const variant = 
        status === 'ACTIVE' ? 'success' : 
        status === 'DRAFT' ? 'warning' : 
        status === 'CLOSED' ? 'secondary' :
        'danger';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
];

export const FinanceDashboard = () => {
  const [pledges, setPledges] = useState([]);
  const [metrics, setMetrics] = useState({ activePledges: 0, totalVolume: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pledgesData, metricsData] = await Promise.all([
        financeService.getPledges(),
        financeService.getMetrics()
      ]);
      setPledges(pledgesData);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load finance data:', err);
      setError('Impossible de charger les données. Vérifiez la connexion Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Finance & Nantissements</h2>
            <p className="text-muted-foreground">Gestion des lignes de crédit et du stock en tierce détention.</p>
        </div>
        <Button className="gap-2">
            <PlusCircle size={16} />
            Nouveau Dossier
        </Button>
      </div>

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="text-sm text-muted-foreground">Valeur Stock Nanti</div>
              <div className="text-2xl font-bold text-foreground mt-2">{metrics.totalValue.toLocaleString()} XOF</div>
              <div className="flex items-center gap-2 mt-1 text-xs text-warning-yellow">
                <Lock size={12} />
                <span>{metrics.totalVolume} Tonnes verrouillées</span>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="text-sm text-muted-foreground">Engagement Bancaire</div>
              <div className="text-2xl font-bold text-foreground mt-2">{metrics.totalValue.toLocaleString()} XOF</div>
              <div className="text-xs text-muted-foreground mt-1">{metrics.activePledges} dossiers actifs</div>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="text-sm text-muted-foreground">Ratio Couverture</div>
              <div className="text-2xl font-bold text-foreground mt-2">150%</div>
              <div className="text-xs text-success-green mt-1">Sain (&gt; 120%)</div>
            </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-danger-red/10 text-danger-red flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <DataGrid 
        title="Dossiers de Nantissement" 
        data={pledges} 
        columns={columns} 
      />
    </div>
  );
};
