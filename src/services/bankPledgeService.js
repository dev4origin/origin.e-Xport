import { supabase } from './supabase';
import { partnerService } from './partnerService';

export const bankPledgeService = {
  getPledges: async (userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) return [];

    const { data, error } = await supabase
      .from('bank_pledge_parameters')
      .select(`
        *,
        banks:bank_id ( nom_banque ),
        campagnes:campagne_id ( libelle, id )
      `)
      .eq('organization_id', myOrgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createPledge: async (pledgeData, userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) throw new Error("Organisation non trouvée.");

    const payload = {
      organization_id: myOrgId,
      bank_id: pledgeData.bank_id,
      campagne_id: pledgeData.campagne_id,
      type_application: pledgeData.type_application || 'REVERSEMENT',
      taux_prix_contrat: pledgeData.taux_prix_contrat ? parseFloat(pledgeData.taux_prix_contrat) : null,
      taux_prix_marche: pledgeData.taux_prix_marche ? parseFloat(pledgeData.taux_prix_marche) : null,
      taux_drd_finance: pledgeData.taux_drd_finance ? parseFloat(pledgeData.taux_drd_finance) : null,
      taux_valeurs_debours: pledgeData.taux_valeurs_debours ? parseFloat(pledgeData.taux_valeurs_debours) : null,
      taux_valeur_locaux_mag: pledgeData.taux_valeur_locaux_mag ? parseFloat(pledgeData.taux_valeur_locaux_mag) : null,
      taux_sequestre: pledgeData.taux_sequestre ? parseFloat(pledgeData.taux_sequestre) : null,
      prix_sequestre_kg: pledgeData.prix_sequestre_kg ? parseFloat(pledgeData.prix_sequestre_kg) : null,
    };

    const { data, error } = await supabase
      .from('bank_pledge_parameters')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updatePledge: async (id, updates) => {
    const { data, error } = await supabase
      .from('bank_pledge_parameters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deletePledges: async (ids) => {
    const { error } = await supabase
      .from('bank_pledge_parameters')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  }
};
