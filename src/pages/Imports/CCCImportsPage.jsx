import { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertOctagon, Save } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { parseCCCFile } from '../../utils/cccFileParser';
import { cccImportService } from '../../services/cccImportService';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';

export const CCCImportsPage = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsParsing(true);
        setError(null);
        setParsedData([]);

        try {
            const data = await parseCCCFile(uploadedFile);
            setParsedData(data);
        } catch (err) {
            console.error(err);
            setError("Erreur de lecture du fichier : " + err.message);
        } finally {
            setIsParsing(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1
    });

    const handleSave = async () => {
        if (!file || parsedData.length === 0) return;

        setIsSaving(true);
        try {
            await cccImportService.processImport(file.name, parsedData);
            alert('Import réussi ! Les lots sont maintenant disponibles dans le stock.');
            // Reset
            setFile(null);
            setParsedData([]);
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la sauvegarde : ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        { accessorKey: 'external_ref', header: 'Ref Reçu' },
        { accessorKey: 'date_reception', header: 'Date' },
        { accessorKey: 'supplier_name', header: 'Fournisseur' },
        { accessorKey: 'nb_sacs', header: 'Sacs' },
        { accessorKey: 'poids_net_kg', header: 'Poids (Kg)', cell: ({ getValue }) => <span className="font-bold">{getValue()?.toLocaleString()}</span> },
        { accessorKey: 'status', header: 'Etat', cell: () => <Badge variant="outline">Prêt</Badge> }
    ];

    return (
        <div className="space-y-6 p-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <FileSpreadsheet size={32} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Import Reçus CCC</h2>
                        <p className="text-muted-foreground">Intégration des fichiers Excel "IdxRecepjournalier"</p>
                    </div>
                </div>

                {parsedData.length > 0 && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                    >
                        <Save size={18} />
                        {isSaving ? 'Importation...' : `Valider ${parsedData.length} Lots`}
                    </button>
                )}
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
            >
                <input {...getInputProps()} />
                <UploadCloud size={48} className="text-muted-foreground mb-4" />
                {isParsing ? (
                    <p className="text-lg font-medium animate-pulse">Analyse du fichier en cours...</p>
                ) : file ? (
                    <div className="text-center">
                        <p className="text-lg font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        <Badge variant="success" className="mt-2">Fichier chargé</Badge>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-lg font-medium text-foreground">Glissez-déposez le fichier Excel ici</p>
                        <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner</p>
                        <p className="text-xs text-muted-foreground mt-2">Format supporté: IdxRecepjournalier (.xls, .xlsx)</p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 border border-destructive/20">
                    <AlertOctagon size={20} />
                    {error}
                </div>
            )}

            {/* Preview Grid */}
            {parsedData.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Aperçu des données ({parsedData.length} lignes)</h3>
                    <DataGrid
                        data={parsedData}
                        columns={columns}
                    />
                </div>
            )}
        </div>
    );
};
