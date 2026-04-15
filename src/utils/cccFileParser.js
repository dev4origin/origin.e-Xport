import * as XLSX from 'xlsx';

export const parseCCCFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Assume data is in the first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                // Scoring Strategy to find Header
                // We look for a row that contains the most expected keywords
                const keywords = ['date', 'reçu', 'recu', 'ref', 'ticket', 'fournisseur', 'coop', 'poids', 'net', 'sacs', 'produit'];

                let bestScore = 0;
                let headerRowIndex = -1;

                for (let i = 0; i < Math.min(rawData.length, 30); i++) {
                    const row = rawData[i];
                    if (!row || !Array.isArray(row)) continue;

                    let score = 0;
                    const rowStr = row.map(c => c ? c.toString().toLowerCase() : '').join(' ');

                    keywords.forEach(k => {
                        if (rowStr.includes(k)) score++;
                    });

                    // "Fournisseur : Tous" in metadata row might give 1 point.
                    // A real header "Date | Ref | Fournisseur | Poids" gives 4 points.
                    if (score > bestScore && score >= 3) {
                        bestScore = score;
                        headerRowIndex = i;
                    }
                }

                if (headerRowIndex === -1) {
                    console.log("Could not find a row with enough keywords in first 30 rows.");
                    reject(new Error("En-têtes introuvables. Vérifiez que le fichier contient 'Date', 'Ref/Ticket', 'Fournisseur', 'Poids'."));
                    return;
                }

                const headers = rawData[headerRowIndex];
                console.log("Header Candidate found at row " + headerRowIndex, headers);

                const normalizeStr = (str) => str ? str.toString().toLowerCase().replace(/\s+/g, ' ').trim() : '';
                const findCol = (searchTerms) => headers.findIndex(h => searchTerms.some(t => normalizeStr(h).includes(t)));

                // New exhaustive mapping based on exact CCC Headers:
                const idxDate = findCol(['date pesée', 'date pesee']);
                const idxRefCode = findCol(['code pesée', 'code pesee', 'code de pesée']); 
                const idxConnaissement = findCol(['n° cnsment', 'cnsment', 'connaissement']);
                const idxSupplierCode = findCol(['code fournisseur']);
                const idxSupplier = findCol(['nom fournisseur', 'fournisseur', 'coop']);
                const idxDepartement = findCol(['provenance departement', 'provenance']);
                const idxSacks = findCol(['nbre sacs', 'sacs acceptés', 'sacs']);
                const idxWeight = findCol(['poids accepté', 'poids accepte', 'poids net', 'poids']);
                const idxGrade = findCol(['grad nat', 'grade nat', 'grad', 'grade']);

                if (idxWeight === -1) {
                    reject(new Error("Colonne 'Poids Accepté' introuvable dans l'en-tête."));
                    return;
                }

                const normalizedData = [];

                for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                    const row = rawData[i];
                    if (!row || row.length === 0) continue;

                    // Check essential data
                    // Reference: Use Code Pesée as primary, fallback to Connaissement, then generate one
                    const connaissement = idxConnaissement !== -1 ? (row[idxConnaissement]?.toString() || null) : null;
                    const codePesee = idxRefCode !== -1 ? (row[idxRefCode]?.toString() || null) : null;
                    const externalRef = codePesee || connaissement || `CCC-MANUAL-${Date.now()}-${i}`;

                    normalizedData.push({
                        external_ref: externalRef,
                        date_reception: parseExcelDate(idxDate !== -1 ? row[idxDate] : null),
                        supplier_name: idxSupplier !== -1 ? row[idxSupplier] : 'Inconnu',
                        supplier_code: idxSupplierCode !== -1 ? row[idxSupplierCode] : null,
                        poids_net_kg: weight,
                        nb_sacs: idxSacks !== -1 ? parseInt(row[idxSacks]) || 0 : 0,
                        departure_location: idxDepartement !== -1 ? row[idxDepartement] : null,
                        quality_grade: idxGrade !== -1 ? row[idxGrade] : null,
                        bill_of_lading: connaissement,
                        ccc_code_pesee: codePesee,
                        status: 'IMPORTED',
                        source: 'CCC_FILE'
                    });
                }

                resolve(normalizedData);

            } catch (error) {
                console.error("Parsing Error", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const parseExcelDate = (value) => {
    if (!value) return new Date().toISOString().split('T')[0];
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'number') {
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
        if (value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    return new Date().toISOString().split('T')[0];
};
