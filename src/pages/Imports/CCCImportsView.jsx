import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertOctagon, Save, RefreshCw, Loader2, Clock, Wifi, WifiOff, Database, TrendingUp } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { parseCCCFile } from '../../utils/cccFileParser';
import { cccImportService } from '../../services/cccImportService';
import { cccAutoFetchService } from '../../services/cccAutoFetchService';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export const CCCImportsView = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // Auto-sync state
    const [activeMode, setActiveMode] = useState('sync');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [syncError, setSyncError] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    // Campaign & stored data
    const [activeCampaign, setActiveCampaign] = useState(null);
    const [storedBatches, setStoredBatches] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isAutoSyncing, setIsAutoSyncing] = useState(false);
    const autoSyncDone = useRef(false);

    const { profile } = useAuth?.() || {};
    const orgId = profile?.organization?.id;

    // ===== Initial Load: Campaign + Stored Data + Last Sync + Auto-sync =====
    useEffect(() => {
        if (!orgId) return;
        autoSyncDone.current = false;
        loadInitialData();
    }, [orgId]);

    const loadInitialData = async () => {
        setIsLoadingData(true);
        try {
            const [campaign, sync] = await Promise.all([
                cccAutoFetchService.getActiveCampaign(),
                cccAutoFetchService.getLastSync(),
            ]);

            setActiveCampaign(campaign);
            setLastSync(sync);

            const batches = await cccAutoFetchService.getStoredBatches(orgId);
            setStoredBatches(batches);

            // Auto-sync if campaign is active and not yet done in this session
            if (campaign && !autoSyncDone.current) {
                autoSyncDone.current = true;
                await performAutoSync(campaign);
            }
        } catch (e) {
            console.error('Error loading initial data:', e);
        } finally {
            setIsLoadingData(false);
        }
    };

    /**
     * Auto-sync using campaign start date → today.
     * Skips if already synced successfully today.
     */
    const performAutoSync = async (campaign) => {
        if (!orgId || !campaign) return;

        // Skip if already synced today
        const lastSyncData = await cccAutoFetchService.getLastSync();
        if (lastSyncData?.status === 'SUCCESS') {
            const lastSyncDate = new Date(lastSyncData.sync_date).toDateString();
            const today = new Date().toDateString();
            if (lastSyncDate === today) {
                console.log('[AutoSync] Déjà synchronisé aujourd\'hui, on passe');
                setLastSync(lastSyncData);
                return;
            }
        }

        // Check CCC credentials exist
        try {
            const { profileService } = await import('../../services/profileService');
            const credentials = await profileService.getCCCCredentials(orgId);
            if (!credentials) {
                console.log('[AutoSync] Pas d\'identifiants CCC configurés');
                return;
            }
        } catch {
            return;
        }

        const dateDebut = formatDateForCCC(campaign.date_debut);
        const dateFin = formatDateForCCC(new Date());

        setIsAutoSyncing(true);
        setSyncError(null);
        setSyncResult(null);

        try {
            const result = await cccAutoFetchService.syncReceptions(orgId, dateDebut, dateFin, 'CACAO');
            setSyncResult(result);
            await refreshData();
        } catch (err) {
            console.error('[AutoSync] Erreur:', err);
            setSyncError(err.message);
        } finally {
            setIsAutoSyncing(false);
        }
    };

    const refreshData = async () => {
        const [updatedBatches, updatedSync] = await Promise.all([
            cccAutoFetchService.getStoredBatches(orgId),
            cccAutoFetchService.getLastSync(),
        ]);
        setStoredBatches(updatedBatches);
        setLastSync(updatedSync);
    };

    // ===== Manual Sync =====
    const handleManualSync = async () => {
        if (!orgId) {
            setSyncError('Organisation non trouvée. Vérifiez votre profil.');
            return;
        }
        if (!activeCampaign) {
            setSyncError('Aucune campagne active. Créez-en une dans les paramètres.');
            return;
        }

        setIsSyncing(true);
        setSyncError(null);
        setSyncResult(null);

        const dateDebut = formatDateForCCC(activeCampaign.date_debut);
        const dateFin = formatDateForCCC(new Date());

        try {
            const result = await cccAutoFetchService.syncReceptions(orgId, dateDebut, dateFin, 'CACAO');
            setSyncResult(result);
            await refreshData();
        } catch (err) {
            console.error('Sync error:', err);
            setSyncError(err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // ===== File Import =====
    const onDrop = useCallback(async (acceptedFiles) => {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) return;
        setFile(uploadedFile);
        setIsParsing(true);
        setError(null);
        setParsedData([]);
        try {
            const data = await parseCCCFile(uploadedFile);
            setParsedData(data);
        } catch (err) {
            console.error(err);
            setError("Erreur de lecture du fichier : " + err.message);
        } finally {
            setIsParsing(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1
    });

    const handleSave = async () => {
        if (!file || parsedData.length === 0) return;
        setIsSaving(true);
        try {
            await cccImportService.processImport(file.name, parsedData);
            alert('Import réussi ! Les lots sont maintenant disponibles dans le stock.');
            setFile(null);
            setParsedData([]);
            if (orgId) await refreshData();
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la sauvegarde : ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ===== Computed =====
    const totalWeight = storedBatches.reduce((sum, b) => sum + (b.poids_initial_kg || b.poids_actuel_kg || 0), 0);
    const isBusy = isSyncing || isAutoSyncing;

    const batchColumns = [
        { accessorKey: 'reference', header: 'Code Pesée / Réf.' },
        { accessorKey: 'bill_of_lading_number', header: 'N° Cnsment' },
        {
            accessorKey: 'created_at', header: 'Date Pesée',
            cell: ({ getValue }) => {
                const v = getValue();
                return v ? new Date(v).toLocaleDateString('fr-FR') : '-';
            }
        },
        { accessorKey: 'departure_location', header: 'Provenance' },
        { accessorKey: 'quality_grade', header: 'Grade NAT' },
        {
            accessorKey: 'bag_count', header: 'Sacs',
            cell: ({ getValue }) => <span className="font-mono">{getValue()?.toLocaleString('fr-FR') || '-'}</span>
        },
        {
            accessorKey: 'poids_actuel_kg', header: 'Poids Accepté (Kg)',
            cell: ({ getValue }) => <span className="font-mono font-bold text-primary">{getValue()?.toLocaleString('fr-FR') || '-'}</span>
        },
        {
            accessorKey: 'status', header: 'Statut',
            cell: ({ getValue }) => {
                const s = getValue();
                const v = { AVAILABLE: 'success', SYNCED: 'success', CONSUMED: 'secondary', EXPORTED: 'outline' };
                return <Badge variant={v[s] || 'outline'}>{s || 'N/A'}</Badge>;
            }
        },
    ];

    const importPreviewColumns = [
        { accessorKey: 'external_ref', header: 'Code Pesée / Réf.' },
        { accessorKey: 'bill_of_lading', header: 'N° Cnsment' },
        { accessorKey: 'date_reception', header: 'Date Pesée' },
        { accessorKey: 'departure_location', header: 'Provenance' },
        { accessorKey: 'quality_grade', header: 'Grade NAT' },
        { accessorKey: 'nb_sacs', header: 'Sacs' },
        { accessorKey: 'poids_net_kg', header: 'Poids Accepté (Kg)', cell: ({ getValue }) => <span className="font-bold">{getValue()?.toLocaleString()}</span> },
        { accessorKey: 'status', header: 'Etat', cell: () => <Badge variant="outline">Prêt</Badge> }
    ];


    // ===== RENDER =====
    return (
        <div className="space-y-4 p-4 h-full overflow-y-auto">
            {/* Mode Switcher */}
            <div className="flex items-center gap-3 w-full">
                <button
                    onClick={() => setActiveMode('sync')}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                        activeMode === 'sync'
                            ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                            : 'border-border text-muted-foreground hover:border-amber-300 hover:bg-muted/30'
                    }`}
                >
                    <Wifi size={20} />
                    <div className="text-left">
                        <p className="text-sm font-semibold">Sync Automatique CCC</p>
                        <p className="text-xs opacity-70">Récupérer directement depuis SAIGIC</p>
                    </div>
                </button>
                <button
                    onClick={() => setActiveMode('import')}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                        activeMode === 'import'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
                    }`}
                >
                    <UploadCloud size={20} />
                    <div className="text-left">
                        <p className="text-sm font-semibold">Import Fichier Excel</p>
                        <p className="text-xs opacity-70">Importer manuellement un fichier CCC</p>
                    </div>
                </button>
            </div>

            {/* ===== SYNC MODE ===== */}
            {activeMode === 'sync' && (
                <div className="space-y-4">
                    {/* Campaign Info + Sync Button */}
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
                                    <Wifi size={24} className="text-amber-700" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-semibold text-amber-900">Synchronisation SAIGIC</h3>
                                    {activeCampaign ? (
                                        <p className="text-sm text-amber-700/80 mt-0.5 truncate">
                                            Campagne <strong>{activeCampaign.libelle}</strong> — Du{' '}
                                            {new Date(activeCampaign.date_debut).toLocaleDateString('fr-FR')} au{' '}
                                            {new Date().toLocaleDateString('fr-FR')}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-amber-700/80 mt-0.5">
                                            Aucune campagne active — Créez-en une dans les paramètres
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button
                                onClick={handleManualSync}
                                disabled={isBusy || !activeCampaign}
                                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 px-5 py-2.5 shrink-0"
                            >
                                {isBusy ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                {isBusy ? 'Sync...' : 'Synchroniser'}
                            </Button>
                        </div>
                    </div>

                    {/* Auto-sync indicator */}
                    {isAutoSyncing && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
                            <Loader2 size={18} className="animate-spin text-blue-600" />
                            <span className="text-sm text-blue-800 font-medium">
                                Synchronisation automatique — Récupération des données CCC en cours...
                            </span>
                        </div>
                    )}

                    {/* Sync Success */}
                    {syncResult && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                            <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-emerald-900">{syncResult.message}</p>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-emerald-700">
                                    <span>📥 {syncResult.totalFetched || 0} réceptions CCC</span>
                                    <span>✅ {syncResult.newRecords} nouvelles</span>
                                    <span>⚡ {syncResult.duplicates} doublons ignorés</span>
                                    <span>⏱️ {((syncResult.executionTimeMs || 0) / 1000).toFixed(1)}s</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sync Error */}
                    {syncError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                            <WifiOff size={20} className="text-red-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-red-900">Échec de la synchronisation</p>
                                <p className="text-sm text-red-700 mt-1">{syncError}</p>
                            </div>
                        </div>
                    )}

                    {/* === Volumes Acceptés Table === */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <Database size={20} className="text-primary" />
                                    <h3 className="text-lg font-bold">Volumes Acceptés</h3>
                                    <Badge variant="outline" className="text-xs">{storedBatches.length} lot(s)</Badge>
                                </div>
                                {/* Dernière sync — always visible at top */}
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <Clock size={13} />
                                    {lastSync ? (
                                        <>
                                            <span>Dernière sync : {new Date(lastSync.sync_date).toLocaleString('fr-FR')}</span>
                                            {lastSync.status === 'SUCCESS' ? (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-xs ml-1">
                                                    {lastSync.new_records} nouveau(x)
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-red-600 border-red-200 text-xs ml-1">Échouée</Badge>
                                            )}
                                        </>
                                    ) : (
                                        <span className="italic">Dernière sync : Aucune</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold">{totalWeight.toLocaleString('fr-FR')} kg</p>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1 justify-end">
                                    <TrendingUp size={12} /> Volume Total Accepté
                                </p>
                            </div>
                        </div>

                        <DataGrid
                            data={storedBatches}
                            columns={batchColumns}
                            isLoading={isLoadingData}
                        />
                    </div>
                </div>
            )}

            {/* ===== IMPORT MODE ===== */}
            {activeMode === 'import' && (
                <>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary/20 rounded-lg">
                                <FileSpreadsheet size={24} className="text-secondary-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold tracking-tight">Import Excel CCC</h3>
                                <p className="text-sm text-muted-foreground">Fichier IdxRecepjournalier</p>
                            </div>
                        </div>
                        {parsedData.length > 0 && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                            >
                                <Save size={18} />
                                {isSaving ? 'Importation...' : `Valider ${parsedData.length} Lots`}
                            </button>
                        )}
                    </div>

                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                        <input {...getInputProps()} />
                        <UploadCloud size={40} className="text-muted-foreground mb-4" />
                        {isParsing ? (
                            <p className="text-lg font-medium animate-pulse">Analyse du fichier en cours...</p>
                        ) : file ? (
                            <div className="text-center">
                                <p className="text-lg font-medium text-foreground">{file.name}</p>
                                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                <Badge variant="success" className="mt-2">Fichier chargé</Badge>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-lg font-medium text-foreground">Glissez-déposez le fichier Excel ici</p>
                                <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 border border-destructive/20">
                            <AlertOctagon size={20} />
                            {error}
                        </div>
                    )}

                    {parsedData.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                Aperçu ({parsedData.length} lignes)
                            </h3>
                            <DataGrid
                                data={parsedData}
                                columns={[
                                    { accessorKey: 'external_ref', header: 'Ref Reçu' },
                                    { accessorKey: 'date_reception', header: 'Date' },
                                    { accessorKey: 'supplier_name', header: 'Fournisseur' },
                                    { accessorKey: 'nb_sacs', header: 'Sacs' },
                                    { accessorKey: 'poids_net_kg', header: 'Poids (Kg)', cell: ({ getValue }) => <span className="font-bold">{getValue()?.toLocaleString()}</span> },
                                    { accessorKey: 'status', header: 'Etat', cell: () => <Badge variant="outline">Prêt</Badge> }
                                ]}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ===== Helpers =====
function formatDateForCCC(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}
