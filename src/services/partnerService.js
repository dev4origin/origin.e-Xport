import { supabase } from './supabase';

export const partnerService = {

    _getMyOrgId: async (userId) => {
        const { data: staff } = await supabase
            .from('fournisseur_staff')
            .select('fournisseur_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (staff?.fournisseur_id) return staff.fournisseur_id;

        const { data: owner } = await supabase
            .from('fournisseurs')
            .select('id')
            .eq('user_profile_id', userId)
            .maybeSingle();
            
        return owner?.id || null;
    },

    /**
     * Recherche des coopératives potentielles
     * @param {string} term - Terme de recherche
     * @param {Object} user - Utilisateur connecté (pour exclure son org)
     */
    /**
     * Recherche le statut de certification Fairtrade sur Flocert
     * @param {string} keyword - Mot clé (ex: SCNV)
     */
    searchFairtradeStatus: async (keyword) => {
        try {
            const params = new URLSearchParams();
            params.append('action', 'flo_customer_search');
            params.append('data[0][name]', 'flocert_language');
            params.append('data[0][value]', 'en');
            params.append('data[1][name]', 'flocert_widget_id');
            params.append('data[1][value]', 'flocert_en');
            params.append('data[2][name]', 'product-type');
            params.append('data[2][value]', '');
            params.append('data[3][name]', 'function');
            params.append('data[3][value]', '');
            params.append('data[4][name]', 'keyword');
            params.append('data[4][value]', keyword);
            params.append('is_glossary_enabled', '1');

            const targetUrl = 'https://www.flocert.net/wp/wp-admin/admin-ajax.php';
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

            const response = await fetch(proxyUrl, {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return null;
            const data = await response.json();

            if (data && data.customers && data.customers.length > 0) {
                // Return the first match's certification status and FLO ID
                return {
                    status: data.customers[0].statuses ? data.customers[0].statuses.replace(/<[^>]+>/g, '').trim() : 'Unknown',
                    floid: data.customers[0].floid,
                    name: data.customers[0].name
                };
            }
            return null; // Not found or not certified
        } catch (err) {
            console.error("Error fetching Fairtrade status:", err);
            return null;
        }
    },

    /**
     * Recherche des coopératives potentielles
     * @param {string} term - Terme de recherche
     * @param {Object} user - Utilisateur connecté (pour exclure son org)
     */
    searchPartners: async (term, user) => {
        if (!term || term.length < 2) return [];

        // 1. Get My Org ID (Optional for searching, just to exclude self)
        const myOrgId = await partnerService._getMyOrgId(user.id);
        const excludeId = myOrgId || '00000000-0000-0000-0000-000000000000';

        // 2. Direct Search Query on registered suppliers
        const { data: registeredData, error: registeredError } = await supabase
            .from('fournisseurs')
            .select('id, nom, fournisseur_officiel_id, region, type, culture_principale')
            .or(`nom.ilike.%${term}%,fournisseur_officiel_id.ilike.%${term}%`)
            .neq('id', excludeId) // Exclude myself
            .limit(10);

        if (registeredError) throw registeredError;

        const registeredSuppliers = (registeredData || []).map(s => ({
            ...s,
            is_registered: true
        }));

        const registeredOfficialIds = registeredSuppliers
            .map(s => s.fournisseur_officiel_id)
            .filter(Boolean);

        // 3. Search Query on reference table for unregistered suppliers
        const { data: refData, error: refError } = await supabase
            .from('referentiel_fournisseurs')
            .select('fournisseur_id, nom_court, denomination_complete, type_fournisseur')
            .or(`nom_court.ilike.%${term}%,fournisseur_id.ilike.%${term}%`)
            .limit(10);

        if (refError && refError.code !== '42P01') {
            // 42P01 means table does not exist, ignore if not yet created in remote DB
            console.error("Error fetching from referentiel_fournisseurs:", refError);
        }

        const unregisteredSuppliers = (refData || [])
            .filter(ref => !registeredOfficialIds.includes(ref.fournisseur_id))
            .map(ref => ({
                id: ref.fournisseur_id,
                nom: ref.nom_court || ref.denomination_complete,
                fournisseur_officiel_id: ref.fournisseur_id,
                region: 'N/A', // Usually not in the ref table
                type: ref.type_fournisseur || 'COOPERATIVE',
                culture_principale: 'N/A',
                is_registered: false
            }));

        // 4. Combine results
        return [...registeredSuppliers, ...unregisteredSuppliers].slice(0, 10);
    },

    /**
     * Récupère la liste des partenaires actifs
     * @param {Object} user 
     */
    getActivePartners: async (user) => {
        // 1. Get My Org ID
        const myOrgId = await partnerService._getMyOrgId(user.id);
        if (!myOrgId) return [];

        // 2. Get Relationships
        // Note: Removed contract_* columns as they appear missing in current DB schema
        const { data, error } = await supabase
            .from('partner_relationships')
            .select(`
              id,
              status,
              created_at,
              target:fournisseurs!partner_relationships_target_id_fkey (
                  id, nom, region, type, culture_principale
              )
          `)
            .eq('requester_id', myOrgId)
            .in('status', ['ACTIVE', 'PENDING'])
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Crée un nouveau partenariat avec contrat
     */
    createPartnership: async (targetId, contractDetails, user) => {
        // 1. Get My Org ID
        const myOrgId = await partnerService._getMyOrgId(user.id);
        if (!myOrgId) throw new Error("Organisation non trouvée.");

        // 2. Insert Relationship
        const { data, error } = await supabase
            .from('partner_relationships')
            .insert({
                requester_id: myOrgId,
                target_id: targetId,
                status: 'PENDING',
                // contract_* fields temporarily removed to match schema
                validated_by_user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Annule une demande de partenariat en attente
     */
    cancelPartnership: async (relationshipId, user) => {
        const myOrgId = await partnerService._getMyOrgId(user.id);
        const { error } = await supabase
            .from('partner_relationships')
            .delete()
            .match({ id: relationshipId, requester_id: myOrgId, status: 'PENDING' });
            
        if (error) throw error;
        return true;
    },

    /**
     * Rèvoque un partenariat actif (vérifie d'abord s'il y a des contrats)
     */
    revokePartnership: async (relationshipId, targetId, user) => {
        const myOrgId = await partnerService._getMyOrgId(user.id);
        
        // Verification des contrats en cours ou exécutés
        const { data: contracts, error: countError } = await supabase
            .from('sales_contracts')
            .select('id')
            .eq('buyer_id', myOrgId)
            .eq('seller_id', targetId)
            .in('status', ['ACTIVE', 'COMPLETED', 'EXECUTED', 'TERMINE']);
            
        if (countError) throw countError;
        
        if (contracts && contracts.length > 0) {
            throw new Error("Impossible de révoquer ce partenariat car des contrats sont en cours ou terminés avec cette coopérative.");
        }
        
        // On met à jour le statut à REVOKED (ou REJECTED/CANCELLED selon le besoin)
        const { error } = await supabase
            .from('partner_relationships')
            .update({ status: 'REJECTED' }) // assuming REJECTED / CANCELLED logic
            .match({ id: relationshipId, requester_id: myOrgId });
            
        if (error) throw error;
        return true;
    },

    /**
     * Crée un nouveau contrat d'achat (DRAFT ou ACTIVE)
     */
    addContract: async (contractDetails, targetId, user) => {
        const myOrgId = await partnerService._getMyOrgId(user.id);
        if (!myOrgId) throw new Error("Organisation non trouvée.");

        const { data, error } = await supabase
            .from('sales_contracts')
            .insert({
                buyer_id: myOrgId,
                seller_id: targetId,
                reference_interne: contractDetails.reference_interne,
                date_signature: contractDetails.date_signature,
                periode_livraison_start: contractDetails.periode_livraison_start || null,
                periode_livraison_end: contractDetails.periode_livraison_end || null,
                volume_total_kg: parseFloat(contractDetails.volume_total_kg) || 0,
                volume_livre_kg: 0,
                incoterm: contractDetails.incoterm || 'DAP',
                prix_unitaire_kg: parseFloat(contractDetails.prix_unitaire_kg) || null,
                prix_fixe_kg: parseFloat(contractDetails.prix_fixe_kg) || null,
                prime_certification: parseFloat(contractDetails.prime_certification) || 0,
                currency: contractDetails.currency || 'XOF',
                status: contractDetails.status || 'DRAFT',
                campaign: contractDetails.campaign || '',
                campagne_id: contractDetails.campagne_id || null,
                sustainability_program: contractDetails.sustainability_program || null,
                traceability_level: contractDetails.traceability_level || null,
                quality_required: contractDetails.quality_required || 'G1',
                volume_tolerance_pct: parseFloat(contractDetails.volume_tolerance_pct) || 5,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Finalise un contrat DRAFT → ACTIVE avec le volume réel
     */
    finalizeContract: async (contractId, updates) => {
        const { data, error } = await supabase
            .from('sales_contracts')
            .update({
                status: 'ACTIVE',
                volume_total_kg: parseFloat(updates.volume_total_kg) || 0,
                date_signature: updates.date_signature || new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString(),
            })
            .eq('id', contractId)
            .eq('status', 'DRAFT')
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Récupère les contrats d'achats (sales_contracts)
     * @param {Object} user 
     */
    getContracts: async (user) => {
        // 1. Get My Org ID
        const myOrgId = await partnerService._getMyOrgId(user.id);
        if (!myOrgId) return [];

        // 2. Fetch Contracts where I am the buyer
        const { data, error } = await supabase
            .from('sales_contracts')
            .select(`
                id,
                reference_interne,
                date_signature,
                volume_total_kg,
                volume_livre_kg,
                status,
                campaign,
                incoterm,
                seller:fournisseurs!sales_contracts_seller_id_fkey (
                    id, nom, region
                )
            `)
            .eq('buyer_id', myOrgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Récupère les statistiques de performance d'une coopérative
     * @param {string} fournisseurOfficielId - L'ID officiel du fournisseur (CCC)
     */
    getPartnerStats: async (fournisseurOfficielId) => {
        if (!fournisseurOfficielId) return null;

        const { data, error } = await supabase
            .from('vue_coop_network_stats')
            .select('*')
            .eq('fournisseur_officiel_id', fournisseurOfficielId)
            .maybeSingle();

        if (error) {
            console.error("Erreur lors de la récupération des statistiques du partenaire:", error);
            return null; // Don't crash the app if stats fail, just return null
        }

        return data; // { fournisseur_officiel_id, total_producteurs, total_parcelles, ... }
    },

    /**
     * Récupère les polygones des parcelles des fournisseurs sous contrat
     */
    /**
     * Récupère les polygones des parcelles des fournisseurs sous contrat
     */
    getPartnerPolygons: async (user) => {
        // 1. Get My Org ID
        const myOrgId = await partnerService._getMyOrgId(user.id);
        if (!myOrgId) return { polygons: [], stats: { producers: 0, parcels: 0 } };

        // 2. Get Suppliers with Active Contracts
        const { data: contracts } = await supabase
            .from('sales_contracts')
            .select('seller_id')
            .eq('buyer_id', myOrgId)
            .eq('status', 'ACTIVE');

        console.log("DEBUG: Contracts found:", contracts?.length);

        const supplierDescIds = contracts?.map(c => c.seller_id) || [];
        if (supplierDescIds.length === 0) return { polygons: [], stats: { producers: 0, parcels: 0 } };

        // 3. Get Official IDs (Text) from Supplier UUIDs
        const { data: suppliers } = await supabase
            .from('fournisseurs')
            .select('id, fournisseur_officiel_id, nom')
            .in('id', supplierDescIds);

        // Map: UUID -> Official ID (String)
        const activeSupplierOfficialIds = suppliers?.map(s => s.fournisseur_officiel_id).filter(Boolean) || [];
        console.log("DEBUG: Suppliers Official IDs:", activeSupplierOfficialIds);

        if (activeSupplierOfficialIds.length === 0) return { polygons: [], stats: { producers: 0, parcels: 0 } };

        // 4. Get Producers linked via 'liaisons_producteurs_fournisseurs'
        const { data: liaisons } = await supabase
            .from('liaisons_producteurs_fournisseurs')
            .select('producteur_id, fournisseur_officiel_id')
            .in('fournisseur_officiel_id', activeSupplierOfficialIds)
            // .eq('statut_liaison', 'valide_par_coop') // Temporarily comment out for debugging restriction
            .not('is_deleted', 'is', true);

        // Filter valid IDs and remove duplicates
        const producerIds = [...new Set(liaisons?.map(l => l.producteur_id).filter(Boolean))] || [];
        console.log("DEBUG: Producer IDs found:", producerIds.length);

        if (producerIds.length === 0) return { polygons: [], stats: { producers: 0, parcels: 0 } };

        // 5. Query polygones directly with joins (Legacy Portal Pattern)
        // Fetch all polygons with their parcelles and producteurs, then filter client-side
        const { data: polygonData, error } = await supabase
            .from('polygones')
            .select(`
                id,
                geometry,
                centroid,
                area_hectares,
                statut_polygone,
                parcelles!inner(
                    id,
                    nom_parcelle,
                    producteur_id,
                    producteurs(
                        id,
                        nom_complet
                    )
                )
            `)
            .limit(500); // Fetch broadly, filter client-side

        if (error) {
            console.error("Error fetching polygons:", error);
            return { polygons: [], stats: { producers: 0, parcels: 0 } };
        }

        // Filter client-side for our specific producer IDs
        const filteredPolygons = polygonData?.filter(poly => {
            const producerId = poly.parcelles?.producteurs?.id;
            return producerId && producerIds.includes(producerId);
        }) || [];

        // Map and enrich data
        const mappedPolygons = filteredPolygons.map(poly => {
            const parcel = poly.parcelles;
            const producer = parcel?.producteurs;

            // Find supplier mapping
            const liaison = liaisons.find(l => l.producteur_id === producer?.id);
            const supplier = suppliers.find(s => s.fournisseur_officiel_id === liaison?.fournisseur_officiel_id);

            return {
                ...poly,
                parcelle_id: parcel?.id,
                producer_id: producer?.id,
                culture: 'Cacao',
                producer_name: producer?.nom_complet || 'Inconnu',
                supplier_id: supplier?.id
            };
        });

        return {
            polygons: mappedPolygons,
            stats: {
                producers: new Set(mappedPolygons.map(p => p.parcelles?.producteurs?.id).filter(Boolean)).size,
                parcels: new Set(mappedPolygons.map(p => p.parcelle_id).filter(Boolean)).size
            }
        };
    }
};
