import { FileText, Scale, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { procurementService } from '../../services/procurementService';
import { useAuth } from '../../contexts/AuthContext';

export const ProcurementDashboard = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [contracts, setContracts] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    
    useEffect(() => {
        const loadData = async () => {
            if (!profile?.organization?.id) return;
            try {
                setLoading(true);
                const [contractsData, deliveriesData] = await Promise.all([
                    procurementService.getContracts(profile.organization.id),
                    procurementService.getDeliveries(profile.organization.id)
                ]);
                setContracts(contractsData);
                setDeliveries(deliveriesData);
            } catch (error) {
                console.error('Error loading procurement data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (profile) {
            loadData();
        }
    }, [profile]);

    // Calculate KPI Stats
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
    const totalVolume = contracts.reduce((acc, curr) => acc + (curr.volume_total_kg || 0), 0);
    const volumeReceived = contracts.reduce((acc, curr) => acc + (curr.volume_livre_kg || 0), 0);
    
    // Columns for DataGrid
    const columns = [
        { accessorKey: 'reference_interne', header: 'Réf. Contrat' },
        { 
            accessorKey: 'seller.nom', 
            header: 'Fournisseur' 
        },
        { 
            accessorKey: 'volume_total_kg', 
            header: 'Volume (Kg)',
            cell: ({ getValue }) => getValue()?.toLocaleString()
        },
        { 
            accessorKey: 'volume_livre_kg', 
            header: 'Livré (Kg)',
            cell: ({ getValue }) => getValue()?.toLocaleString() || '0'
        },
        {
            accessorKey: 'status',
            header: 'Statut',
            cell: ({ getValue }) => {
                const status = getValue();
                const variant = status === 'ACTIVE' ? 'action' : status === 'DRAFT' ? 'warning' : 'success';
                return <Badge variant={variant}>{status}</Badge>;
            }
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div />
                <Button className="gap-2"><FileText size={16}/> Nouveau Contrat</Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText size={16}/> Contrats Actifs
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-2">{activeContracts}</div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Scale size={16}/> Volume Contracté
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-2">{(totalVolume / 1000).toFixed(1)} T</div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Truck size={16}/> Réalisé
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-2">{(volumeReceived / 1000).toFixed(1)} T</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {totalVolume > 0 ? Math.round((volumeReceived / totalVolume) * 100) : 0}% de l'objectif
                    </div>
                </div>
            </div>

            <DataGrid 
                title="Contrats d'Achat Récents" 
                data={contracts} 
                columns={columns} 
            />

            {/* Note: Deliveries table is not shown yet, kept for later implementation of the detailed view */}
        </div>
    );
};
