import { useEffect, useState } from 'react';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';
import { procurementService } from '../../services/procurementService';
import { useAuth } from '../../contexts/AuthContext';

export const DeclaredVolumesView = () => {
    const { profile } = useAuth();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!profile?.organization?.id) return;
            try {
                setLoading(true);
                const data = await procurementService.getDeliveries(profile.organization.id);
                setDeliveries(data || []);
            } catch (error) {
                console.error('Error loading deliveries:', error);
            } finally {
                setLoading(false);
            }
        };

        if (profile) {
            loadData();
        }
    }, [profile]);

    const columns = [
        { accessorKey: 'reference', header: 'Réf. Livraison' },
        { accessorKey: 'date_livraison', header: 'Date' },
        { accessorKey: 'contract.seller.nom', header: 'Fournisseur' },
        { accessorKey: 'contract.reference_interne', header: 'Contrat' },
        {
            accessorKey: 'poids_net',
            header: 'Poids (Kg)',
            cell: ({ getValue }) => <span className="font-mono font-bold">{getValue()?.toLocaleString()}</span>
        },
        {
            accessorKey: 'statut_validation',
            header: 'Statut',
            cell: ({ getValue }) => {
                const status = getValue();
                return <Badge variant={status === 'VALIDE' ? 'success' : 'secondary'}>{status}</Badge>;
            }
        }
    ];

    return (
        <div className="p-4 h-full overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">Livraisons Fournisseurs</h3>
                    <p className="text-sm text-muted-foreground">Volumes déclarés à l'entrée usine</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold">{deliveries.reduce((sum, d) => sum + (d.poids_net || 0), 0).toLocaleString()} kg</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Volume Total Déclaré</p>
                </div>
            </div>

            <DataGrid
                data={deliveries}
                columns={columns}
                isLoading={loading}
            />
        </div>
    );
};
