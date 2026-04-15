import { useState, useEffect } from 'react';
import { cccSyncService } from '../../services/cccSyncService';
import { Badge } from '../ui/Badge';

/**
 * Composant de monitoring de la synchronisation CCC
 * À intégrer dans SettingsPage.jsx
 */
export const CCCSyncMonitor = () => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsResult, historyResult] = await Promise.all([
                cccSyncService.getSyncStats(),
                cccSyncService.getSyncHistory(5),
            ]);

            if (statsResult.success) {
                setStats(statsResult.data);
            }

            if (historyResult.success) {
                setHistory(historyResult.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await cccSyncService.triggerSync();

            if (result.success) {
                alert(`✅ Synchronisation réussie!\n\n${result.data.data.totalRecords} fournisseurs traités\n${result.data.data.newRecords} nouveaux\n${result.data.data.updatedRecords} mis à jour`);
                await loadData(); // Recharger les données
            } else {
                alert(`❌ Erreur: ${result.error}`);
            }
        } catch (error) {
            alert(`❌ Erreur: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Jamais';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status) => {
        const variants = {
            SUCCESS: 'success',
            PARTIAL: 'warning',
            FAILED: 'danger',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="p-6 rounded-xl bg-card border border-border">
                <div className="text-center text-muted-foreground">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Synchronisation CCC</h3>
                    <p className="text-sm text-muted-foreground">
                        Liste officielle des fournisseurs agréés par le Conseil Café-Cacao
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-4 py-2 bg-action-blue text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {syncing ? '⏳ Synchronisation...' : '🔄 Synchroniser maintenant'}
                </button>
            </div>

            {/* Statistiques */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-card border border-border">
                        <div className="text-sm text-muted-foreground">Total Référentiel</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                            {stats.statistics?.total_fournisseurs || 0}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg bg-card border border-border">
                        <div className="text-sm text-muted-foreground">Acheteurs</div>
                        <div className="text-2xl font-bold text-action-blue mt-1">
                            {stats.statistics?.acheteurs || 0}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg bg-card border border-border">
                        <div className="text-sm text-muted-foreground">Coopératives</div>
                        <div className="text-2xl font-bold text-success-green mt-1">
                            {stats.statistics?.cooperatives || 0}
                        </div>
                    </div>
                </div>
            )}

            {/* Dernière synchronisation */}
            {stats?.last_sync && (
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Dernière synchronisation</span>
                        {getStatusBadge(stats.last_sync.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-muted-foreground">Date</div>
                            <div className="font-medium">{formatDate(stats.last_sync.date)}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Enregistrements</div>
                            <div className="font-medium">{stats.last_sync.total_records || 0}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Nouveaux</div>
                            <div className="font-medium text-success-green">
                                +{stats.last_sync.new_records || 0}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Mis à jour</div>
                            <div className="font-medium text-action-blue">
                                {stats.last_sync.updated_records || 0}
                            </div>
                        </div>
                    </div>
                    {stats.last_sync.execution_time_ms && (
                        <div className="mt-2 text-xs text-muted-foreground">
                            Temps d'exécution: {(stats.last_sync.execution_time_ms / 1000).toFixed(2)}s
                        </div>
                    )}
                </div>
            )}

            {/* Historique */}
            {history.length > 0 && (
                <div className="p-4 rounded-lg bg-card border border-border">
                    <h4 className="text-sm font-medium mb-3">Historique des synchronisations</h4>
                    <div className="space-y-2">
                        {history.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                            >
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(log.status)}
                                    <span className="text-sm">{formatDate(log.sync_date)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {log.total_records} enregistrements
                                    {log.status === 'FAILED' && log.error_message && (
                                        <span className="ml-2 text-danger-red" title={log.error_message}>
                                            ⚠️
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prochaine synchronisation */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">📅 Prochaine synchronisation automatique:</span>
                    <span className="font-medium">1er Juillet 2026 à 02:00</span>
                    <span className="text-xs text-muted-foreground">(Tous les 6 mois)</span>
                </div>
            </div>
        </div>
    );
};
