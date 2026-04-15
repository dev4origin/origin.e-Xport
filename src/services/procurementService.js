import { supabase } from './supabase';

export const procurementService = {
  /**
   * Fetch all active Purchase Contracts for the current organization (Buyer)
   */
  async getContracts(orgId) {
    if (!orgId) return [];

    const { data, error } = await supabase
      .from('sales_contracts')
      .select(`
        *,
        seller:fournisseurs!seller_id(nom, type)
      `)
      .eq('buyer_id', orgId)
      .order('date_signature', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all Suppliers (Sellers) available for contracts
   */
  async getSuppliers() {
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('id, nom, type, departement')
      .in('type', ['cooperative', 'producteur']) // Assuming these are the sellers
      .order('nom');

    if (error) throw error;
    return data;
  },

  /**
   * Fetch recent deliveries (Factory Receptions) linked to contracts or pending
   */
  async getDeliveries(orgId) {
    if (!orgId) return [];

    const { data, error } = await supabase
      .from('livraisons')
      .select(`
        *,
        producteur:producteurs(nom_complet),
        contract:sales_contracts(reference_interne, seller:fournisseurs!sales_contracts_seller_id_fkey(nom))
      `)
      .eq('acheteur_id', orgId) // Assuming current org is the buyer
      .order('date_livraison', { ascending: false })
      .limit(50); // Fetch last 50 deliveries for dashboard

    if (error) throw error;
    return data;
  },

  /**
   * Create a new Purchase Contract
   */
  async createContract(contractData) {
    const { data, error } = await supabase
      .from('sales_contracts')
      .insert([contractData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
