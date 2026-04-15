import { useState, useEffect } from 'react';
import { Package, ShieldCheck, AlertTriangle, CheckCircle, FileText, RefreshCw } from 'lucide-react';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';
import { traceBatchService } from '../../services/traceBatchService';

export const ExportPage = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await traceBatchService.getBatches();
      setBatches(data || []);
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async (batchId) => {
    setAuditLoading(batchId);
    try {
      await traceBatchService.runAudit(batchId);
      await loadBatches(); // Refresh to see new status
    } catch (error) {
      console.error('Audit failed:', error);
      alert('Erreur lors de l\'audit: ' + error.message);
    } finally {
      setAuditLoading(null);
    }
  };

  const columns = [
    { accessorKey: 'id', header: 'ID Lot', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue().slice(0, 8)}...</span> },
    { accessorKey: 'poids_actuel_kg', header: 'Poids (kg)', cell: ({ getValue }) => getValue()?.toLocaleString() + ' kg' },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ getValue }) => <Badge variant="outline">{getValue() || 'N/A'}</Badge>
    },
    {
      accessorKey: 'compliance_reports',
      header: 'Conformité (EUDR)',
      cell: ({ getValue, row }) => {
        const report = getValue()?.[0] || getValue(); // Handle array or single object if logic differs
        if (!report) return <span className="text-muted-foreground text-sm">Non audité</span>;

        const isCompliant = report.is_compliant;
        const score = report.volume_consistency_score;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {isCompliant ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle size={12} /> Conforme
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle size={12} /> Non Conforme
                </Badge>
              )}
            </div>
            {score !== undefined && (
              <span className="text-xs text-muted-foreground">
                Mass Balance: {score}%
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const batch = row.original;
        const isAuditing = auditLoading === batch.id;
        const report = batch.compliance_reports?.[0] || batch.compliance_reports;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAudit(batch.id)}
              disabled={isAuditing}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
            >
              {isAuditing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {report ? 'Re-Audit' : 'Auditer'}
            </button>

            {report && report.is_compliant && (
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 border border-input bg-background hover:bg-accent">
                <FileText className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  if (loading && batches.length === 0) {
    return <div className="p-8 text-center">Chargement des lots...</div>;
  }

  return (
    <div className="space-y-6 h-full p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={32} className="text-primary" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Export & Certification</h2>
            <p className="text-muted-foreground">Gestion des lots et audits EUDR (Mass Balance)</p>
          </div>
        </div>
        <button
          onClick={loadBatches}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI Cards */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
          <div className="text-sm text-muted-foreground">Lots en attente</div>
          <div className="text-2xl font-bold text-foreground mt-2">{batches.length}</div>
        </div>
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
          <div className="text-sm text-muted-foreground">Volumes Certifiés</div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {batches
              .filter(b => b.compliance_reports?.is_compliant)
              .reduce((acc, curr) => acc + (curr.poids_actuel_kg || 0), 0)
              .toLocaleString()
            } kg
          </div>
        </div>
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
          <div className="text-sm text-muted-foreground">Anomalies Détectées</div>
          <div className="text-2xl font-bold text-destructive mt-2">
            {batches
              .reduce((acc, curr) => acc + (curr.compliance_reports?.yield_anomalies_count || 0), 0)
            }
          </div>
        </div>
      </div>

      <DataGrid
        title="Liste des Lots (Trace Batches)"
        data={batches}
        columns={columns}
      />
    </div>
  );
};
