import { useState, useEffect, useMemo } from 'react';
import { Factory, Scale, ArrowRight, CheckCircle, AlertTriangle, XCircle, Plus, Wand2 } from 'lucide-react';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';
import { processingService } from '../../services/processingService';

export const ProcessingPage = () => {
  const [machinedBatches, setMachinedBatches] = useState([]);
  const [availableInputs, setAvailableInputs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedInputs, setSelectedInputs] = useState([]); // IDs
  const [formData, setFormData] = useState({
    batchNumber: '',
    productionDate: new Date().toISOString().split('T')[0],
    outputWeight: '',
    certification: 'Rainforest Alliance',
    traceability: 'Mass Balance'
  });
  const [processingError, setProcessingError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [batches, inputs] = await Promise.all([
        processingService.getMachinedBatches(),
        processingService.getAvailableInputBatches()
      ]);
      setMachinedBatches(batches || []);
      setAvailableInputs(inputs || []);
    } catch (error) {
      console.error('Error loading processing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Calculations ---

  const totalInputWeight = useMemo(() => {
    return selectedInputs.reduce((sum, id) => {
      const batch = availableInputs.find(b => b.id === id);
      return sum + (batch?.poids_actuel_kg || 0);
    }, 0);
  }, [selectedInputs, availableInputs]);

  const yieldPercentage = useMemo(() => {
    const output = parseFloat(formData.outputWeight);
    if (!output || !totalInputWeight || totalInputWeight === 0) return 0;
    return (output / totalInputWeight) * 100;
  }, [formData.outputWeight, totalInputWeight]);

  const yieldStatus = useMemo(() => {
    if (yieldPercentage <= 0) return 'neutral';
    if (yieldPercentage > 100) return 'error'; // Impossible creation
    if (yieldPercentage < 90) return 'warning'; // Too much loss
    return 'success'; // 90-99%
  }, [yieldPercentage]);

  // --- Handlers ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleInputSelection = (batchId) => {
    setSelectedInputs(prev =>
      prev.includes(batchId)
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const handleAutoSelect = () => {
    const targetOutput = parseFloat(formData.outputWeight);
    if (!targetOutput || targetOutput <= 0) {
      alert("Veuillez d'abord saisir un Poids Sortie cible (Zone A).");
      return;
    }

    // Target Input = Output / 0.98 (Aiming for ~98% yield / 2% loss buffer)
    // This ensures we pick ENOUGH inputs to cover the output with reasonable loss.
    const targetInput = targetOutput / 0.98;

    // 1. Shuffle available inputs to ensure randomness
    const shuffled = [...availableInputs].sort(() => 0.5 - Math.random());

    // 2. Greedy selection
    let currentSum = 0;
    const newSelection = [];

    for (const batch of shuffled) {
      if (currentSum >= targetInput) break; // Reached target
      newSelection.push(batch.id);
      currentSum += batch.poids_actuel_kg;
    }

    setSelectedInputs(newSelection);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessingError(null);

    if (selectedInputs.length === 0) {
      alert("Veuillez sélectionner au moins un lot entrant.");
      return;
    }

    if (yieldStatus === 'error') {
      if (!confirm("Le rendement est supérieur à 100% (Impossible). Êtes-vous sûr de vouloir continuer ?")) return;
    }

    try {
      const result = await processingService.createMachinedBatch({
        batchNumber: formData.batchNumber,
        productionDate: formData.productionDate,
        outputWeight: parseFloat(formData.outputWeight),
        certification: formData.certification,
        traceability: formData.traceability,
        sourceBatchIds: selectedInputs
      });

      if (result.success) {
        alert(`Lot Usiné créé avec succès ! Rendement: ${parseFloat(result.yield).toFixed(2)}%`);
        // Reset form
        setFormData({
          batchNumber: '',
          productionDate: new Date().toISOString().split('T')[0],
          outputWeight: '',
          certification: 'Rainforest Alliance',
          traceability: 'Mass Balance'
        });
        setSelectedInputs([]);
        loadData(); // Refresh all
      } else {
        setProcessingError(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error(error);
      setProcessingError(error.message);
    }
  };

  return (
    <div className="space-y-8 p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-full">
          <Factory size={32} className="text-primary" />
        </div>
        <div>
          <p className="text-muted-foreground">Transformation des lots bruts en produits semi-finis (Mass Balance)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ZONE A: Output Form */}
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">A</span>
            Produit Fini (Output)
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">N° Lot Usine</label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleInputChange}
                placeholder="ex: L-USINE-2601"
                className="w-full mt-1 p-2 border rounded-md bg-background"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Date Production</label>
              <input
                type="date"
                name="productionDate"
                value={formData.productionDate}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Programme</label>
              <select
                name="certification"
                value={formData.certification}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                <option>Rainforest Alliance</option>
                <option>Fairtrade</option>
                <option>Bio</option>
                <option>Conventionnel</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Traceability</label>
              <select
                name="traceability"
                value={formData.traceability}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                <option>Mass Balance</option>
                <option>Segregated</option>
                <option>IP</option>
              </select>
            </div>

            <div className="pt-2 border-t">
              <label className="text-sm font-bold text-foreground">Poids Sortie (Kg)</label>
              <input
                type="number"
                name="outputWeight"
                value={formData.outputWeight}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full mt-1 p-3 border-2 border-primary/20 focus:border-primary rounded-md bg-background text-lg font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* ZONE B: Input Selector */}
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm lg:col-span-2 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">B</span>
              Mélangeur Inputs (Lots Disponibles)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoSelect}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md bg-action-blue/10 text-action-blue hover:bg-action-blue/20 transition-colors"
                title="Sélection automatique aléatoire pour atteindre le poids cible"
              >
                <Wand2 size={14} /> Shuffle Auto
              </button>
              <Badge variant="outline">{availableInputs.length} lots stocks</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground sticky top-0">
                <tr>
                  <th className="p-2 text-left w-10"></th>
                  <th className="p-2 text-left">Ref Lot</th>
                  <th className="p-2 text-left">Poids (Kg)</th>
                  <th className="p-2 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {availableInputs.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Aucun lot disponible.</td></tr>
                ) : (
                  availableInputs.map(batch => (
                    <tr
                      key={batch.id}
                      className={`border-b hover:bg-accent cursor-pointer ${selectedInputs.includes(batch.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleInputSelection(batch.id)}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInputs.includes(batch.id)}
                          readOnly
                        />
                      </td>
                      <td className="p-2 font-mono">{batch.batch_number || batch.id.slice(0, 8)}</td>
                      <td className="p-2">{batch.poids_actuel_kg} kg</td>
                      <td className="p-2"><Badge variant="secondary">{batch.status}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total Bar */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between border">
            <span className="font-medium text-muted-foreground">Total Entrant Sélectionné</span>
            <span className="text-xl font-bold">{totalInputWeight.toLocaleString()} kg</span>
          </div>
        </div>

      </div>

      {/* ZONE C: Yield Monitor & Actions */}
      <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Yield Visualizer */}
          <div className="flex-1 w-full">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">C</span>
              Rendement Usine (Yield)
            </h3>

            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold font-mono">
                {yieldPercentage.toFixed(1)}%
              </div>
              <div className="flex-1">
                {/* Status Message */}
                {yieldStatus === 'success' && (
                  <div className="flex items-center text-success-green font-medium"><CheckCircle className="mr-2" size={20} /> Excellent (Perte normale)</div>
                )}
                {yieldStatus === 'warning' && (
                  <div className="flex items-center text-warning-yellow font-medium"><AlertTriangle className="mr-2" size={20} /> Perte importante détectée</div>
                )}
                {yieldStatus === 'error' && (
                  <div className="flex items-center text-destructive font-medium"><XCircle className="mr-2" size={20} /> Erreur: Création de matière impossible</div>
                )}
                {yieldStatus === 'neutral' && (
                  <div className="text-muted-foreground">En attente de saisie...</div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div>
            {processingError && <p className="text-destructive text-sm mb-2 text-right">{processingError}</p>}
            <button
              onClick={handleSubmit}
              disabled={selectedInputs.length === 0 || !formData.outputWeight || !formData.batchNumber}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-lg font-bold text-lg flex items-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-2" />
              Valider la Production
            </button>
          </div>
        </div>
      </div>

      {/* History Grid */}
      <div className="pt-8">
        <h3 className="text-xl font-bold mb-4">Historique des Lots Usinés</h3>
        <DataGrid
          data={machinedBatches}
          columns={[
            { accessorKey: 'batch_number', header: 'N° Lot' },
            { accessorKey: 'production_date', header: 'Date' },
            { accessorKey: 'input_total_weight_kg', header: 'Input (kg)' },
            { accessorKey: 'output_weight_kg', header: 'Output (kg)' },
            {
              header: 'Rendement',
              cell: ({ row }) => {
                const input = row.original.input_total_weight_kg;
                const output = row.original.output_weight_kg;
                const y = input ? (output / input) * 100 : 0;
                return <span className={y > 100 || y < 90 ? "text-destructive font-bold" : "text-success-green"}>{y.toFixed(1)}%</span>
              }
            },
            { accessorKey: 'status', header: 'Statut', cell: ({ getValue }) => <Badge variant="outline">{getValue()}</Badge> }
          ]}
        />
      </div>
    </div>
  );
};
