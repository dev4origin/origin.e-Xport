import Papa from 'papaparse';
import { supabase } from './supabase';

/**
 * Service pour la gestion des campagnes et du barème.
 */
export const campaignService = {

    /**
     * Parse le fichier CSV du barème officiel.
     * @param {File} file - Le fichier CSV uploadé.
     * @param {Object} user - L'utilisateur connecté (pour audit).
     * @returns {Promise<Object>} - Les données extraites et la campagne préparée.
     */
    parseCampaignCSV: (file, user) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        if (results.data.length === 0) {
                            throw new Error("Le fichier CSV est vide ou mal formaté.");
                        }

                        // On prend la première ligne de données (supposant une ligne de campagne par fichier ou la plus récente)
                        // Le fichier exemple montre une ligne de headers complexe et une ligne de données.
                        // PapaParse avec header:true va utiliser la première ligne comme clés.
                        const row = results.data[0];

                        // Mapping des données brutes vers notre structure
                        const campaignData = campaignService._processRowData(row, user);
                        resolve(campaignData);
                    } catch (err) {
                        reject(err);
                    }
                },
                error: (err) => {
                    reject(err);
                }
            });
        });
    },

    /**
     * Traite une ligne de données CSV pour en extraire les infos de campagne.
     */
    _processRowData: (row, user) => {
        // Extraction des champs principaux
        const libelle = row['Libellé'] || row['Libelle'];
        const periodeRecolte = row['Periode_Récolte'];
        const prixBordChamp = row['Prix_Commercialisation'] || row['PRIX BORD CHAMP'] || '0';

        // Nettoyage des valeurs numériques
        const cleanNumber = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.'));
        };

        // Calcul des dates
        const years = libelle.split('-'); // ex: ["2025", "2026"]
        let dateDebut, dateFin;
        let typeRecolte = null;

        if (years.length >= 2) {
            const yearN = parseInt(years[0]);
            const yearNPlus1 = parseInt(years[1]);

            if (periodeRecolte && (periodeRecolte.toUpperCase().includes('PRINCIPALE') || periodeRecolte.toUpperCase().includes('GRANDE'))) {
                typeRecolte = 'GRANDE';
                dateDebut = `${yearN}-10-01`;
                dateFin = `${yearNPlus1}-03-31`;
            } else if (periodeRecolte && (periodeRecolte.toUpperCase().includes('PETITE') || periodeRecolte.toUpperCase().includes('INTERMEDIAIRE'))) {
                typeRecolte = 'PETITE';
                dateDebut = `${yearNPlus1}-04-01`;
                dateFin = `${yearNPlus1}-09-30`;
            } else {
                dateDebut = `${yearN}-10-01`;
                dateFin = `${yearNPlus1}-09-30`;
            }
        }

        // Calcul du statut dynamique
        const now = new Date();
        const start = new Date(dateDebut);
        const end = new Date(dateFin);
        let status = 'FUTURE';
        if (now >= start && now <= end) {
            status = 'ACTIVE';
        } else if (now > end) {
            status = 'CLOTUREE';
        }

        // Construction de l'objet bareme avec Audit
        const bareme = {};
        Object.keys(row).forEach(key => {
            // On ignore les colonnes systèmes du CSV car on va les recalculer
            if (!['Add_By', 'Add_Date', 'Maj_By', 'Maj_Date', 'Status'].includes(key)) {
                bareme[key] = row[key];
            }
        });

        // Ajout des infos d'audit dans le JSON
        const auditInfo = {
            "Add_By": user?.email || 'System',
            "Add_Date": new Date().toISOString(),
            "Maj_By": user?.email || 'System',
            "Maj_Date": new Date().toISOString(),
            "Status": status
        };

        return {
            libelle: `${libelle} - ${periodeRecolte || 'Campagne'}`,
            date_debut: dateDebut,
            date_fin: dateFin,
            prix_bord_champ_fixe: cleanNumber(prixBordChamp),
            status: status,
            user_id: user?.id, // Pour la colonne created_by
            bareme: { ...bareme, ...auditInfo } // Fusion
        };
    },

    /**
     * Récupère la liste des campagnes.
     */
    getCampaigns: async () => {
        const { data, error } = await supabase
            .from('campagnes')
            .select('*')
            .order('date_debut', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Crée la campagne dans Supabase.
     */
    createCampaign: async (campaignData) => {
        const { data, error } = await supabase
            .from('campagnes')
            .insert([
                {
                    libelle: campaignData.libelle,
                    date_debut: campaignData.date_debut,
                    date_fin: campaignData.date_fin,
                    prix_bord_champ_fixe: campaignData.prix_bord_champ_fixe,
                    status: campaignData.status,
                    bareme: campaignData.bareme,
                    created_by: campaignData.user_id,
                    updated_by: campaignData.user_id
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    },

    /**
     * Met à jour une campagne.
     * @param {string} id - ID de la campagne.
     * @param {Object} updates - Champs à modifier (incluant bareme partiel ou complet).
     * @param {Object} user - Utilisateur qui modifie.
     */
    updateCampaign: async (id, updates, user) => {
        // 1. Récupérer la version actuelle pour fusionner le barème si nécessaire
        // (Pour simplifier ici, on suppose que 'updates.bareme' contient tout ou on le fusionne dans l'UI)
        // Mais pour l'audit, on doit mettre à jour le JSONB bareme.

        const now = new Date().toISOString();
        const baremeUpdates = updates.bareme || {};

        // Mettre à jour l'audit dans le barème
        const auditInfo = {
            "Maj_By": user?.email || 'System',
            "Maj_Date": now
        };

        // Si updates.bareme est fourni, on l'utilise, sinon on ne touche pas au bareme sauf pour l'audit ?
        // Dans notre cas d'usage Formulaire Dynamique, on envoie tout le bareme mis à jour.

        const finalBareme = {
            ...baremeUpdates,
            ...auditInfo
        };

        const { data, error } = await supabase
            .from('campagnes')
            .update({
                prix_bord_champ_fixe: updates.prix_bord_champ_fixe, // Si modifié
                bareme: finalBareme,
                updated_by: user?.id
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    },

    /**
     * Delete multiple campaigns.
     * @param {string[]} ids - Les identifiants des campagnes à supprimer
     */
    deleteCampaigns: async (ids) => {
        if (!ids || ids.length === 0) return true;

        const { data, error } = await supabase
            .from('campagnes')
            .delete()
            .in('id', ids)
            .select();

        if (error) throw error;

        // Si RLS bloque, la base de données ne renvoie pas d'erreur, elle retourne juste un tableau vide.
        if (!data || data.length === 0) {
            throw new Error("Action non autorisée ou lignes introuvables (Probablement un problème de permissions de sécurité RLS).");
        }

        return true;
    }
};
