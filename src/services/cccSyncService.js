import { supabase } from './supabase';

/**
 * Service de synchronisation des fournisseurs CCC (Côté Client)
 * 
 * Cette version s'exécute dans le navigateur car le serveur CCC
 * bloque les connexions depuis les serveurs Supabase.
 */

const SAIGIC_BASE_URL = "https://www.conseilcafecacao.ci:8088";

export const cccSyncService = {
    /**
     * Récupère la liste des fournisseurs depuis l'API CCC
     * S'exécute dans le navigateur pour contourner les restrictions réseau
     */
    async fetchCCCSuppliers() {
        try {
            // Étape 1: Établir une session en visitant la page d'accueil
            console.log("🔐 Établissement de la session CCC...");
            await fetch(SAIGIC_BASE_URL, {
                method: 'GET',
                mode: 'no-cors', // Important pour éviter les erreurs CORS
            });

            // Attendre un peu pour que les cookies soient établis
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Étape 2: Récupérer la liste des fournisseurs
            console.log("📥 Récupération de la liste des fournisseurs...");
            const timestamp = Date.now();
            const url = `${SAIGIC_BASE_URL}/Fournisseur/GetFournisseurJson?option=ACHETEUR%2BCOOPERATIVE&_=${timestamp}`;

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include', // Inclure les cookies
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const suppliers = await response.json();
            console.log(`✅ ${suppliers.length} fournisseurs récupérés`);

            return suppliers;
        } catch (error) {
            console.error("❌ Erreur lors de la récupération des fournisseurs:", error);
            throw error;
        }
    },

    /**
     * Synchronise les fournisseurs dans Supabase
     */
    async syncToDatabase(suppliers) {
        let newRecords = 0;
        let updatedRecords = 0;
        const now = new Date().toISOString();

        console.log(`💾 Synchronisation de ${suppliers.length} fournisseurs...`);

        for (const supplier of suppliers) {
            try {
                // Vérifier si le fournisseur existe déjà
                const { data: existing } = await supabase
                    .from('referentiel_fournisseurs')
                    .select('fournisseur_id')
                    .eq('fournisseur_id', supplier.Fournisseur_Id)
                    .single();

                const supplierData = {
                    fournisseur_id: supplier.Fournisseur_Id,
                    nom_court: supplier.NomCourt,
                    denomination_complete: supplier.Denomination,
                    type_fournisseur: supplier.TypeFournisseur,
                    statut_systeme: 'actif',
                    last_sync_date: now,
                };

                if (existing) {
                    // UPDATE
                    await supabase
                        .from('referentiel_fournisseurs')
                        .update(supplierData)
                        .eq('fournisseur_id', supplier.Fournisseur_Id);
                    updatedRecords++;
                } else {
                    // INSERT
                    await supabase
                        .from('referentiel_fournisseurs')
                        .insert(supplierData);
                    newRecords++;
                }
            } catch (error) {
                console.error(`⚠️ Erreur pour ${supplier.Fournisseur_Id}:`, error);
            }
        }

        console.log(`✅ Synchronisation terminée: ${newRecords} nouveaux, ${updatedRecords} mis à jour`);
        return { newRecords, updatedRecords };
    },

    /**
     * Enregistre le résultat de la synchronisation
     */
    async logSyncResult(result) {
        const logEntry = {
            sync_date: new Date().toISOString(),
            status: result.success ? 'SUCCESS' : 'FAILED',
            total_records: result.totalRecords,
            new_records: result.newRecords,
            updated_records: result.updatedRecords,
            error_message: result.error || null,
            execution_time_ms: result.executionTimeMs,
        };

        await supabase.from('ccc_sync_logs').insert(logEntry);
    },

    /**
     * Déclenche une synchronisation complète (côté client)
     */
    async triggerSync() {
        const startTime = Date.now();

        try {
            // Étape 1: Récupérer les fournisseurs depuis l'API CCC
            const suppliers = await this.fetchCCCSuppliers();

            // Étape 2: Synchroniser dans Supabase
            const { newRecords, updatedRecords } = await this.syncToDatabase(suppliers);

            // Étape 3: Logger le résultat
            const executionTimeMs = Date.now() - startTime;
            const result = {
                success: true,
                totalRecords: suppliers.length,
                newRecords,
                updatedRecords,
                executionTimeMs,
            };

            await this.logSyncResult(result);

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Logger l'échec
            await this.logSyncResult({
                success: false,
                totalRecords: 0,
                newRecords: 0,
                updatedRecords: 0,
                executionTimeMs,
                error: errorMessage,
            });

            return {
                success: false,
                error: errorMessage,
            };
        }
    },

    /**
     * Récupère les statistiques de synchronisation
     */
    async getSyncStats() {
        try {
            const { data, error } = await supabase.rpc('get_ccc_sync_stats');

            if (error) throw error;

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des stats:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
     * Récupère l'historique des synchronisations
     */
    async getSyncHistory(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('ccc_sync_logs')
                .select('*')
                .order('sync_date', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
     * Vérifie si un fournisseur est dans le référentiel CCC
     */
    async verifyApproval(nom, type = null) {
        try {
            const { data, error } = await supabase.rpc('verify_ccc_approval', {
                p_nom: nom,
                p_type: type,
            });

            if (error) throw error;

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('Erreur lors de la vérification CCC:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    /**
     * Récupère tous les fournisseurs du référentiel CCC
     */
    async getAllSuppliers(type = null) {
        try {
            let query = supabase
                .from('referentiel_fournisseurs')
                .select('*')
                .order('nom_court');

            if (type) {
                query = query.eq('type_fournisseur', type);
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des fournisseurs:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    },
};
