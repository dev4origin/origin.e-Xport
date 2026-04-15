import { supabase } from './supabase';

export const processingService = {

    /**
     * Get all Machined Batches for the current factory (user's organization)
     */
    async getMachinedBatches() {
        const { data, error } = await supabase
            .from('machined_batches')
            .select(`
        *,
        inputs:processing_inputs(
            weight_used_kg,
            source_batch:trace_batches(batch_number)
        )
      `)
            .order('production_date', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get Available Trace Batches (Inputs) for processing
     * Only fetches batches with status 'AVAILABLE' (not yet processed or exported)
     */
    async getAvailableInputBatches() {
        const { data, error } = await supabase
            .from('trace_batches')
            .select('*')
            .eq('status', 'AVAILABLE') // Only take what's in stock
            .order('created_at', { ascending: true }); // Oldest first (FIFO suggestion)

        if (error) throw error;
        return data;
    },

    /**
     * Create a new Machined Batch (Run a processing session)
     */
    async createMachinedBatch({
        batchNumber,
        productionDate,
        outputWeight,
        certification,
        traceability,
        sourceBatchIds
    }) {
        const { data, error } = await supabase.rpc('create_machined_batch', {
            p_batch_number: batchNumber,
            p_production_date: productionDate,
            p_output_weight_kg: outputWeight,
            p_certification: certification,
            p_traceability: traceability,
            p_source_batch_ids: sourceBatchIds
        });

        if (error) throw error;
        return data;
    },

    /**
     * Get basic stats for Processing Dashboard
     */
    async getProcessingStats() {
        // Could be optimized with RPC or specific queries
        const { data: batches } = await supabase.from('machined_batches').select('output_weight_kg, input_total_weight_kg');

        const totalOutput = batches?.reduce((acc, b) => acc + (b.output_weight_kg || 0), 0) || 0;
        const totalInput = batches?.reduce((acc, b) => acc + (b.input_total_weight_kg || 0), 0) || 0;
        const avgYield = totalInput > 0 ? (totalOutput / totalInput) * 100 : 0;

        return {
            totalOutput,
            avgYield
        };
    }
};
