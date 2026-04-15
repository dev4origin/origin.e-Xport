import { supabase } from './supabase';
import { partnerService } from './partnerService';

export const bankService = {
  getBanks: async (userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) return [];

    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('organization_id', myOrgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createBank: async (bankData, userId) => {
    const myOrgId = await partnerService._getMyOrgId(userId);
    if (!myOrgId) throw new Error("Organisation non trouvée.");

    const { data, error } = await supabase
      .from('banks')
      .insert({
        organization_id: myOrgId,
        nom_banque: bankData.nom_banque,
        type_compte: bankData.type_compte || 'COURANT',
        code_bic: bankData.code_bic || null,
        iban: bankData.iban || null,
        contact_gestionnaire: bankData.contact_gestionnaire || null,
        email_gestionnaire: bankData.email_gestionnaire || null,
        nom_gestionnaire: bankData.nom_gestionnaire || null,
        logo_url: bankData.logo_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateBank: async (id, updates) => {
    const { data, error } = await supabase
      .from('banks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteBanks: async (ids) => {
    const { error } = await supabase
      .from('banks')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  },

  uploadBankLogo: async (file, orgId) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${orgId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('banks_logos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('banks_logos')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
};
