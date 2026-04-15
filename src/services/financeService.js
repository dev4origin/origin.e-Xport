import { supabase } from './supabase';

export const financeService = {
  /**
   * Fetch all pledges for the dashboard
   */
  async getPledges() {
    const { data, error } = await supabase
      .from('pledge_files')
      .select(`
        *,
        banks ( nom_banque ),
        pledged_lots ( count )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform data to flat structure if needed for DataGrid
    return data.map(item => ({
      ...item,
      bank: item.banks?.nom_banque || 'Unknown',
      lots: item.pledged_lots?.[0]?.count || 0 // Assuming simple count or aggregation logic needed
    }));
  },

  /**
   * Create a new pledge folder
   */
  async createPledge(pledgeData) {
    const { data, error } = await supabase
      .from('pledge_files')
      .insert([pledgeData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update status (e.g., SUBMIT, CLOSE)
   */
  async updateStatus(id, newStatus) {
    const { data, error } = await supabase
      .from('pledge_files')
      .update({ statut: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get Dashboard Metrics (Mock logic with real queries potential)
   */
  async getMetrics() {
    // In a real app, this might be a specialized RPC call or view
    // For now, we calculate from getPledges or dedicated queries
    const { count: activeCount, error: err1 } = await supabase
      .from('pledge_files')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'ACTIVE');
      
    if (err1) throw err1;

    return {
      activePledges: activeCount || 0,
      totalVolume: 750, // Placeholder until aggregation query
      totalValue: 500000000 // Placeholder
    };
  }
};
