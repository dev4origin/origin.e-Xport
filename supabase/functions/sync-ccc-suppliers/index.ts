import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Edge Function: Synchronisation des Fournisseurs CCC
 * 
 * Cette fonction récupère la liste officielle des fournisseurs agréés
 * par le Conseil Café-Cacao et met à jour la table referentiel_fournisseurs.
 * 
 * Déclenchement: CRON tous les 6 mois ou appel manuel
 */

const SAIGIC_BASE_URL = "http://www.conseilcafecacao.ci:8088";
const SAIGIC_INTRO = "dEXeSma4";
const SAIGIC_LOGIN = "asondo^004";

interface CCCSupplier {
    Fournisseur_Id: string;
    NomCourt: string;
    Denomination: string;
    TypeFournisseur: "ACHETEUR" | "COOPERATIVE";
}

interface SyncResult {
    success: boolean;
    totalRecords: number;
    newRecords: number;
    updatedRecords: number;
    executionTimeMs: number;
    error?: string;
}

/**
 * Établit une session avec le portail SAIGIC
 */
async function establishSession(): Promise<string> {
    console.log("🔐 Établissement de la session SAIGIC...");

    try {
        const homeResponse = await fetch(SAIGIC_BASE_URL, {
            method: "GET",
            headers: {
                "User-Agent": "Origin.e-One/1.0 (Automated Sync)",
            },
        });

        const cookies = homeResponse.headers.get("set-cookie");

        if (cookies) {
            console.log("✅ Session établie via page d'accueil");
            return cookies;
        }

        console.log("🔄 Tentative d'authentification avec credentials...");
        const loginResponse = await fetch(`${SAIGIC_BASE_URL}/Account/Login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Origin.e-One/1.0 (Automated Sync)",
            },
            body: new URLSearchParams({
                username: SAIGIC_INTRO,
                password: SAIGIC_LOGIN,
            }),
        });

        const loginCookies = loginResponse.headers.get("set-cookie");

        if (loginCookies) {
            console.log("✅ Session établie via authentification");
            return loginCookies;
        }

        throw new Error("Impossible d'établir une session");
    } catch (error) {
        console.error("❌ Erreur lors de l'établissement de la session:", error);
        throw error;
    }
}

/**
 * Récupère la liste des fournisseurs depuis l'API CCC
 */
async function fetchCCCSuppliers(cookies: string): Promise<CCCSupplier[]> {
    console.log("📥 Récupération de la liste des fournisseurs CCC...");

    const timestamp = Date.now();
    const url = `${SAIGIC_BASE_URL}/Fournisseur/GetFournisseurJson?option=ACHETEUR%2BCOOPERATIVE&_=${timestamp}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Cookie: cookies,
                "User-Agent": "Origin.e-One/1.0 (Automated Sync)",
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const suppliers: CCCSupplier[] = await response.json();
        console.log(`✅ ${suppliers.length} fournisseurs récupérés`);

        return suppliers;
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des fournisseurs:", error);
        throw error;
    }
}

/**
 * Synchronise les fournisseurs dans Supabase (table referentiel_fournisseurs)
 */
async function syncSuppliersToDatabase(
    suppliers: CCCSupplier[],
    supabaseClient: any
): Promise<{ newRecords: number; updatedRecords: number }> {
    console.log("💾 Synchronisation avec la base de données...");

    let newRecords = 0;
    let updatedRecords = 0;
    const now = new Date().toISOString();

    for (const supplier of suppliers) {
        try {
            // Vérifier si le fournisseur existe déjà (par fournisseur_id)
            const { data: existing, error: selectError } = await supabaseClient
                .from("referentiel_fournisseurs")
                .select("fournisseur_id, nom_court")
                .eq("fournisseur_id", supplier.Fournisseur_Id)
                .single();

            if (selectError && selectError.code !== "PGRST116") {
                // PGRST116 = not found (normal)
                console.error(`⚠️ Erreur SELECT pour ${supplier.Fournisseur_Id}:`, selectError);
                continue;
            }

            const supplierData = {
                fournisseur_id: supplier.Fournisseur_Id,
                nom_court: supplier.NomCourt,
                denomination_complete: supplier.Denomination,
                type_fournisseur: supplier.TypeFournisseur,
                statut_systeme: "actif", // Statut par défaut pour les fournisseurs CCC
                last_sync_date: now,
            };

            if (existing) {
                // UPDATE
                const { error: updateError } = await supabaseClient
                    .from("referentiel_fournisseurs")
                    .update(supplierData)
                    .eq("fournisseur_id", existing.fournisseur_id);

                if (updateError) {
                    console.error(`⚠️ Erreur UPDATE pour ${supplier.Fournisseur_Id}:`, updateError);
                } else {
                    updatedRecords++;
                }
            } else {
                // INSERT
                const { error: insertError } = await supabaseClient
                    .from("referentiel_fournisseurs")
                    .insert(supplierData);

                if (insertError) {
                    console.error(`⚠️ Erreur INSERT pour ${supplier.Fournisseur_Id}:`, insertError);
                } else {
                    newRecords++;
                }
            }
        } catch (error) {
            console.error(`⚠️ Erreur lors du traitement de ${supplier.Fournisseur_Id}:`, error);
        }
    }

    console.log(`✅ Synchronisation terminée: ${newRecords} nouveaux, ${updatedRecords} mis à jour`);
    return { newRecords, updatedRecords };
}

/**
 * Enregistre le résultat de la synchronisation
 */
async function logSyncResult(
    result: SyncResult,
    supabaseClient: any
): Promise<void> {
    const logEntry = {
        sync_date: new Date().toISOString(),
        status: result.success ? "SUCCESS" : "FAILED",
        total_records: result.totalRecords,
        new_records: result.newRecords,
        updated_records: result.updatedRecords,
        error_message: result.error || null,
        execution_time_ms: result.executionTimeMs,
    };

    const { error } = await supabaseClient
        .from("ccc_sync_logs")
        .insert(logEntry);

    if (error) {
        console.error("⚠️ Erreur lors de l'enregistrement du log:", error);
    }
}

/**
 * Handler principal
 */
serve(async (req) => {
    const startTime = Date.now();

    // CORS headers
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    try {
        console.log("🚀 Démarrage de la synchronisation CCC...");

        // Initialiser Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Étape 1: Établir session SAIGIC
        const cookies = await establishSession();

        // Étape 2: Récupérer les fournisseurs
        const suppliers = await fetchCCCSuppliers(cookies);

        // Étape 3: Synchroniser avec la base de données
        const { newRecords, updatedRecords } = await syncSuppliersToDatabase(
            suppliers,
            supabase
        );

        // Étape 4: Calculer le temps d'exécution
        const executionTimeMs = Date.now() - startTime;

        // Étape 5: Enregistrer le résultat
        const result: SyncResult = {
            success: true,
            totalRecords: suppliers.length,
            newRecords,
            updatedRecords,
            executionTimeMs,
        };

        await logSyncResult(result, supabase);

        console.log(`✅ Synchronisation réussie en ${executionTimeMs}ms`);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Synchronisation réussie",
                data: result,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        const executionTimeMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error("❌ Erreur lors de la synchronisation:", errorMessage);

        // Enregistrer l'échec
        try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const supabase = createClient(supabaseUrl, supabaseKey);

            await logSyncResult(
                {
                    success: false,
                    totalRecords: 0,
                    newRecords: 0,
                    updatedRecords: 0,
                    executionTimeMs,
                    error: errorMessage,
                },
                supabase
            );
        } catch (logError) {
            console.error("⚠️ Impossible d'enregistrer l'erreur:", logError);
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: errorMessage,
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
});
