import { supabase } from './supabase';
import { profileService } from './profileService';
import { campaignService } from './campaignService';

/**
 * CCC Auto-Fetch Service
 * 
 * Orchestre la récupération automatique des volumes depuis la plateforme SAIGIC
 * du Conseil Café Cacao (https://www.conseilcafecacao.ci:8088).
 * 
 * Flux : 
 *   1. Récupère les credentials CCC du profil
 *   2. Appelle le proxy backend (Edge Function) qui fait la double auth
 *   3. Le proxy télécharge le rapport Excel EtatReception
 *   4. Parse les données et les retourne en JSON
 *   5. Insère dans la table de stock
 */

const PROXY_BASE_URL = '/api/ccc-proxy';

export const cccAutoFetchService = {

    /**
     * Teste la connexion avec les identifiants fournis (sans les sauvegarder)
     */
    async testConnection(credentials) {
        const response = await fetch(PROXY_BASE_URL + '/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur proxy (${response.status}): ${errorText}`);
        }

        return await response.json();
    },

    /**
     * Récupère les données CCC pour une période donnée
     * @param {string} orgId - ID de l'organisation
     * @param {string} dateDebut - Format DD/MM/YYYY
     * @param {string} dateFin - Format DD/MM/YYYY  
     * @param {string} produit - 'CACAO' ou 'CAFE'
     */
    async fetchReceptions(orgId, dateDebut, dateFin, produit = 'CACAO') {
        // 1. Get credentials
        const credentials = await profileService.getCCCCredentials(orgId);
        if (!credentials) {
            throw new Error('Aucun identifiant CCC configuré. Allez dans Profil > Accès CCC pour les ajouter.');
        }

        // 2. Call proxy to fetch the report
        const response = await fetch(PROXY_BASE_URL + '/fetch-receptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                browser_user: credentials.browser_user,
                browser_pass: credentials.browser_pass,
                login_user: credentials.login_user,
                login_pass: credentials.login_pass,
                date_debut: dateDebut,
                date_fin: dateFin,
                produit,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur proxy CCC (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data.records || [];
    },

    /**
     * Processus complet : Fetch + Parse + Insert
     */
    async syncReceptions(orgId, dateDebut, dateFin, produit = 'CACAO') {
        const startTime = Date.now();

        try {
            // 1. Fetch from CCC
            const records = await this.fetchReceptions(orgId, dateDebut, dateFin, produit);

            if (!records || records.length === 0) {
                return {
                    success: true,
                    message: 'Aucune réception trouvée pour cette période.',
                    newRecords: 0,
                    duplicates: 0,
                    executionTimeMs: Date.now() - startTime,
                };
            }

            // 2. Deduplicate against existing data
            const { existingRefs } = await this.getExistingRefs(orgId);
            const newRecords = records.filter(r => !existingRefs.has(r.external_ref));
            const duplicates = records.length - newRecords.length;

            // 3. Insert new records
            if (newRecords.length > 0) {
                await this.insertRecords(orgId, newRecords);
            }

            // 4. Log the sync 
            const executionTimeMs = Date.now() - startTime;
            await this.logSync({
                success: true,
                totalRecords: records.length,
                newRecords: newRecords.length,
                duplicates,
                executionTimeMs,
                period: `${dateDebut} - ${dateFin}`,
            });

            return {
                success: true,
                message: `${newRecords.length} nouvelle(s) réception(s) importée(s). ${duplicates} doublon(s) ignoré(s).`,
                newRecords: newRecords.length,
                duplicates,
                totalFetched: records.length,
                executionTimeMs,
            };
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            await this.logSync({
                success: false,
                totalRecords: 0,
                newRecords: 0,
                duplicates: 0,
                executionTimeMs,
                error: error.message,
            });
            throw error;
        }
    },

    /**
     * Get existing reception references to avoid duplicates
     */
    async getExistingRefs(orgId) {
        const { data, error } = await supabase
            .from('trace_batches')
            .select('reference')
            .eq('owner_id', orgId);

        if (error) throw error;

        const existingRefs = new Set((data || []).map(r => r.reference));
        return { existingRefs };
    },

    /**
     * Insert new reception records into trace_batches
     */
    async insertRecords(orgId, records) {
        const batchInserts = records.map(rec => ({
            reference: rec.external_ref,
            owner_id: orgId,
            produit_type: 'CACAO',
            etat_physique: 'BRUT',
            poids_initial_kg: rec.poids_net_kg,   // Mapped from Poids Accepté
            poids_actuel_kg: rec.poids_net_kg,    // Mapped from Poids Accepté
            quality_grade: rec.quality_grade || null, // Mapped from Grad NAT
            bag_count: rec.nb_sacs || null,           // Mapped from Nbre Sacs
            departure_location: rec.departure_location || null, // Mapped from Provenance Departement
            bill_of_lading_number: rec.bill_of_lading || null,  // Mapped from N° Cnsment
            // supplier_name isn't a direct column, but could try to find exact supplier_id if needed in the future
            status: 'AVAILABLE',
            campagne: rec.campagne || null,
            created_at: new Date(rec.date_reception).toISOString(), // Use the actual weigh date as creation
        }));

        const { data, error } = await supabase
            .from('trace_batches')
            .insert(batchInserts)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Log synchronization result
     */
    async logSync(result) {
        try {
            await supabase.from('ccc_sync_logs').insert({
                sync_date: new Date().toISOString(),
                status: result.success ? 'SUCCESS' : 'FAILED',
                total_records: result.totalRecords || 0,
                new_records: result.newRecords || 0,
                execution_time_ms: result.executionTimeMs || 0,
                error_message: result.error || (result.success
                    ? `Auto-sync: ${result.newRecords} new, ${result.duplicates} duplicates. Period: ${result.period || 'N/A'}`
                    : result.error),
            });
        } catch (e) {
            console.error('Failed to log sync:', e);
        }
    },

    /**
     * Get latest sync info
     */
    async getLastSync() {
        const { data, error } = await supabase
            .from('ccc_sync_logs')
            .select('*')
            .order('sync_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching last sync:', error);
            return null;
        }
        return data;
    },

    /**
     * Get the active campaign (status = 'ACTIVE' or date range includes today)
     */
    async getActiveCampaign() {
        try {
            const campaigns = await campaignService.getCampaigns();
            if (!campaigns || campaigns.length === 0) return null;

            const now = new Date();
            // Prefer explicit ACTIVE status
            let active = campaigns.find(c => c.status === 'ACTIVE');
            if (!active) {
                // Fallback: find the campaign whose date range includes today
                active = campaigns.find(c => {
                    const start = new Date(c.date_debut);
                    const end = new Date(c.date_fin);
                    return now >= start && now <= end;
                });
            }
            // Fallback: most recent campaign
            if (!active) active = campaigns[0];
            return active;
        } catch (e) {
            console.error('Error fetching active campaign:', e);
            return null;
        }
    },

    /**
     * Get stored trace_batches for display in the accepted volumes table
     * @param {string} orgId - Organization ID
     * @param {string} [campaignLabel] - Optional campaign label to filter
     */
    async getStoredBatches(orgId, campaignLabel) {
        let query = supabase
            .from('trace_batches')
            .select('*')
            .eq('owner_id', orgId)
            .order('created_at', { ascending: false });
        
        if (campaignLabel) {
            query = query.eq('campagne', campaignLabel);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching stored batches:', error);
            return [];
        }
        return data || [];
    },
};
