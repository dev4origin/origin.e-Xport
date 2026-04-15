import { supabase } from './supabase';
import { partnerService } from './partnerService';

export const clientService = {
  getClients: async (userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) return [];

    const { data, error } = await supabase
      .from('clients_export')
      .select('*')
      .eq('organization_id', myOrgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createClient: async (clientData, userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) throw new Error("Organisation non trouvée.");

    const { data, error } = await supabase
      .from('clients_export')
      .insert({
        organization_id: myOrgId,
        nom_client: clientData.nom_client,
        id_rainforest: clientData.id_rainforest || null,
        id_fairtrade: clientData.id_fairtrade || null,
        adresse: clientData.adresse || null,
        contact_commercial: clientData.contact_commercial || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateClient: async (id, updates) => {
    const { data, error } = await supabase
      .from('clients_export')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteClients: async (ids) => {
    const { error } = await supabase
      .from('clients_export')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  },

  _calculateStatutNantissement: (data) => {
    const reversement = data.taux_reversement !== null && data.taux_reversement !== undefined && data.taux_reversement !== '' ? parseFloat(data.taux_reversement) : null;
    const soutien = data.taux_soutien !== null && data.taux_soutien !== undefined && data.taux_soutien !== '' ? parseFloat(data.taux_soutien) : null;

    if ((reversement === null || reversement === 0 || isNaN(reversement)) && soutien !== null && soutien < 0) {
      return 'SOUTIEN';
    } else if (reversement !== null && reversement > 0 && !isNaN(reversement)) {
      return 'REVERSEMENT';
    }
    return null; // fallback or default
  },

  getExportContracts: async (userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) return [];

    const { data, error } = await supabase
      .from('export_contracts')
      .select(`
        *,
        clients_export:client_id ( nom_client )
      `)
      .eq('organization_id', myOrgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  addExportContract: async (contractData, userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) throw new Error("Organisation non trouvée.");

    const statut_contrat = clientService._calculateStatutNantissement(contractData);

    const payload = {
      organization_id: myOrgId,
      client_id: contractData.client_id,
      numero_contrat: contractData.numero_contrat || `EXP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      prix_caf_deblocage: contractData.prix_caf_deblocage ? parseFloat(contractData.prix_caf_deblocage) : null,
      drd: contractData.drd ? parseFloat(contractData.drd) : null,
      taux_reversement: contractData.taux_reversement ? parseFloat(contractData.taux_reversement) : null,
      taux_soutien: contractData.taux_soutien ? parseFloat(contractData.taux_soutien) : null,
      statut_contrat
    };

    const { data, error } = await supabase
      .from('export_contracts')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateExportContract: async (id, updates) => {
    if ('taux_reversement' in updates || 'taux_soutien' in updates) {
       updates.statut_contrat = clientService._calculateStatutNantissement(updates);
    }

    const { data, error } = await supabase
      .from('export_contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
