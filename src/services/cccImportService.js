import { supabase } from './supabase';

export const cccImportService = {

    /**
     * 1. Save import log
     * 2. Insert batches into 'trace_batches' (External Stock)
     */
    async processImport(filename, records) {
        if (!records || records.length === 0) throw new Error("Aucun enregistrement à importer.");

        // 1. Create Log Entry
        const { data: logEntry, error: logError } = await supabase
            .from('ccc_sync_logs')
            .insert({
                status: 'SUCCESS',
                total_records: records.length,
                new_records: records.length,
                execution_time_ms: 0,
                error_message: `Import fichier: ${filename}`
            })
            .select()
            .single();

        if (logError) throw logError;

        // 2. Transform to Batch format
        const batchInserts = records.map(rec => ({
            reference: rec.external_ref, // Changed from batch_number to reference
            poids_initial_kg: rec.poids_net_kg, // Mapped from Poids Accepté
            poids_actuel_kg: rec.poids_net_kg,  // Mapped from Poids Accepté
            quality_grade: rec.quality_grade || null, // Mapped from Grad NAT
            bag_count: rec.nb_sacs || null,           // Mapped from Nbre Sacs
            departure_location: rec.departure_location || null, // Mapped from Provenance Departement
            bill_of_lading_number: rec.bill_of_lading || null,  // Mapped from N° Cnsment
            status: 'AVAILABLE', // Ready for processing
            created_at: new Date(rec.date_reception).toISOString(), // Use actual weigh date
            // Note: owner_id needs to be passed or derived based on your auth context.
            // Currently, this service doesn't seem to receive orgId. You might need to add it to the signature in the future.
            produit_type: 'CACAO',
            etat_physique: 'BRUT',
        }));

        // NOTE: We need to handle 'supplier_id' linkage if we want proper FKs.
        // For this MVP step, we might insert without supplier_id 
        // OR try to resolve supplier by name?
        // Let's assume we insert with NULL supplier for now, or use a default 'UNKNOWN_SUPPLIER'

        const { data, error } = await supabase
            .from('trace_batches')
            .insert(batchInserts)
            .select();

        if (error) throw error;

        return data;
    }
};
