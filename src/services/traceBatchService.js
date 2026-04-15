import { supabase } from './supabase';

export const traceBatchService = {
    /**
     * Fetch all trace batches
     */
    async getBatches() {
        const { data, error } = await supabase
            .from('trace_batches')
            .select(`
        *,
        compliance_reports(
          is_compliant,
          risk_score,
          analysis_date,
          volume_consistency_score,
          yield_anomalies_count
        )
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Run the full certification audit (Geo + Mass Balance)
     * @param {string} batchId 
     */
    async runAudit(batchId) {
        const { data, error } = await supabase
            .rpc('run_full_certification_audit', { p_batch_id: batchId });

        if (error) throw error;
        return data;
    },

    /**
     * Get specific compliance report for a batch
     */
    async getComplianceReport(batchId) {
        const { data, error } = await supabase
            .from('compliance_reports')
            .select('*')
            .eq('batch_id', batchId)
            .single();

        if (error) throw error;
        return data;
    }
};
