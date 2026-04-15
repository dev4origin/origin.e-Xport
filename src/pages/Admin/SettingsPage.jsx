import { useAuth } from '../../contexts/AuthContext';
import { Save, Upload, FileText, CheckCircle, AlertCircle, Plus, Calendar as CalendarIcon, Coins, Edit, Hash, Tag, Filter, SlidersHorizontal, ArrowUpDown, Palette, MoreHorizontal, LayoutGrid, Eye, Search, Share2, BarChart3, ChevronDown, X, Check, Trash2, Copy } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { DataGrid } from '../../components/shared/DataGrid';
import { campaignService } from '../../services/campaignService';

// Toolbar Component mimicking Airtable
// Visibility Menu Component (Lifted)
// Visibility Menu Component (Lifted)
const VisibilityMenu = ({ anchor, table, onClose }) => {
  if (!anchor || !table) return null;

  const allColumns = table.getAllLeafColumns();
  const hiddenCount = allColumns.filter(c => !c.getIsVisible()).length;
  const isAllVisible = hiddenCount === 0;

  const toggleAll = () => {
    if (isAllVisible) {
      // Hide all (except first one maybe? usually unsafe to hide all)
      // Actually standard behavior: Hide all allowed
      table.toggleAllColumnsVisible(false);
    } else {
      // Show all
      table.toggleAllColumnsVisible(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div
        className="fixed z-[101] w-64 bg-white dark:bg-zinc-900 border border-border rounded-md shadow-xl flex flex-col max-h-96 animate-in fade-in zoom-in-95"
        style={{ top: anchor.y, left: anchor.x }}
      >
        <div className="p-2 border-b border-border flex items-center justify-between bg-muted/30">
          <span className="text-xs font-semibold text-foreground">Colonnes</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleAll}
            className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10"
          >
            {isAllVisible ? 'Tout masquer' : 'Tout afficher'}
          </Button>
        </div>

        <div className="overflow-y-auto p-1 py-2 space-y-0.5">
          {allColumns.map(column => {
            const isVisible = column.getIsVisible();
            // Skip system columns if any (like actions) or use grouping
            return (
              <div
                key={column.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isVisible ? 'hover:bg-muted' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                onClick={() => column.toggleVisibility(!isVisible)}
              >
                <div className={`h-3.5 w-3.5 rounded-[3px] flex items-center justify-center border transition-all ${isVisible ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 bg-transparent'}`}>
                  {isVisible && <CheckCircle size={10} strokeWidth={3} />}
                </div>
                <span className={`text-xs truncate select-none ${isVisible ? 'font-medium' : ''}`}>
                  {typeof column.columnDef.header === 'function' ? (column.id || 'Col') : (column.columnDef.header || column.id)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-2 border-t border-border bg-muted/10 text-[10px] text-center text-muted-foreground">
          {allColumns.length - hiddenCount} affichées sur {allColumns.length}
        </div>
      </div>
    </>
  );
};

// Toolbar Component mimicking Airtable
const AirtableToolbar = ({ table, globalFilter, setGlobalFilter, columnVisibility, onColoringClick, onVisibilityClick }) => {
  return (
    <div className="flex items-center justify-between p-1.5 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10 gap-4 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 gap-2 text-muted-foreground font-normal hover:text-foreground text-xs px-2">
          <LayoutGrid size={14} className="text-blue-600" />
          <span className="font-medium text-foreground">1_Campagnes</span>
          <ChevronDown size={12} />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />

        {/* Column Visibility Button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-muted-foreground font-normal hover:bg-muted/50 hidden md:flex text-xs px-2"
            onClick={onVisibilityClick}
          >
            <Eye size={13} />
            {/* Show hidden count if any, else total visible */}
            <span>
              {table ? (
                (() => {
                  const hiddenCount = Object.values(columnVisibility || {}).filter(v => v === false).length;
                  return hiddenCount > 0 ? `(${hiddenCount}) masqués` : `0 masqués`;
                })()
              ) : 'Chargement...'}
            </span>
          </Button>
        </div>


      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 gap-2 text-xs border-dashed text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 shadow-none px-2 hidden lg:flex">
          <Share2 size={13} />
          Partager
        </Button>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter && setGlobalFilter(e.target.value)}
            className="h-7 pl-8 pr-3 text-xs bg-muted/30 border-none rounded-sm focus:ring-1 focus:ring-primary w-28 focus:w-48 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
    </div>
  );
};

// Helper for Header
const HeaderCell = ({ icon: Icon, title, onContextMenu }) => (
  <div
    className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide select-none w-full h-full"
    onContextMenu={onContextMenu}
  >
    {Icon && <Icon size={13} className="shrink-0 text-muted-foreground/60" />}
    <span className="whitespace-nowrap">{title}</span>
  </div>
);

const ColumnContextMenu = ({ visible, x, y, onClose, onHide, onGroup }) => {
  if (!visible) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white dark:bg-zinc-900 border border-border rounded-md shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
        style={{ top: y, left: x }}
      >
        <div
          className="px-3 py-2 text-xs hover:bg-muted cursor-pointer flex items-center gap-2 transition-colors"
          onClick={onHide}
        >
          <Eye size={13} className="text-muted-foreground" />
          Masquer ce champ
        </div>
        <div
          className="px-3 py-2 text-xs hover:bg-muted cursor-pointer flex items-center gap-2 transition-colors"
          onClick={onGroup}
        >
          <LayoutGrid size={13} className="text-muted-foreground" />
          Grouper selon ce champ
        </div>
      </div>
    </>
  );
};

const ColoringModal = ({ isOpen, onClose, onSave, columns }) => {
  const [rule, setRule] = useState({ columnId: '', value: '', color: 'bg-red-100 border-l-4 border-l-red-500' });

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onOpenChange={onClose} title="Colorer les lignes">
      <div className="space-y-4 pt-4">
        <div className="grid gap-2">
          <label className="text-xs font-medium">Si le champ...</label>
          <select
            className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:ring-1 focus:ring-primary"
            value={rule.columnId}
            onChange={e => setRule({ ...rule, columnId: e.target.value })}
          >
            <option value="">Choisir un champ...</option>
            {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-medium">Contient la valeur...</label>
          <Input
            value={rule.value}
            onChange={e => setRule({ ...rule, value: e.target.value })}
            placeholder="Ex: En Cours"
            className="h-9 text-xs"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-medium">Alors appliquer la couleur...</label>
          <div className="flex gap-2">
            {[
              { label: 'Rouge', class: 'bg-red-50 border-l-4 border-l-red-500' },
              { label: 'Vert', class: 'bg-green-50 border-l-4 border-l-green-500' },
              { label: 'Bleu', class: 'bg-blue-50 border-l-4 border-l-blue-500' },
              { label: 'Jaune', class: 'bg-yellow-50 border-l-4 border-l-yellow-500' },
            ].map((c) => (
              <div
                key={c.label}
                className={`w-8 h-8 rounded cursor-pointer ring-offset-2 ${rule.color === c.class ? 'ring-2 ring-primary' : ''} ${c.class.split(' ')[0]} border border-border`}
                onClick={() => setRule({ ...rule, color: c.class })}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={() => { onSave(rule); onClose(); }}>Appliquer</Button>
        </div>
      </div>
    </Modal>
  );
};

const ToolbarWrapper = ({ table, setTableInstance, globalFilter, setGlobalFilter, columnVisibility, onColoringClick, onVisibilityClick }) => {
  useEffect(() => {
    if (table) setTableInstance(table);
  }, [table, setTableInstance]);

  return <AirtableToolbar table={table} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} columnVisibility={columnVisibility} onColoringClick={onColoringClick} onVisibilityClick={onVisibilityClick} />;
};

const TableCapture = ({ table, setTableInstance }) => {
  useEffect(() => {
    if (table) setTableInstance(table);
  }, [table, setTableInstance]);
  return null;
};

// Row Context Menu
const RowContextMenu = ({ visible, x, y, onClose, onDelete, onDuplicate, selectedCount }) => {
  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 min-w-[160px] bg-background border border-border rounded-md shadow-md py-1 text-sm animate-in fade-in"
        style={{ top: y, left: x }}
      >
        {selectedCount > 1 ? (
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
            onClick={() => { onDelete(); onClose(); }}
          >
            <Trash2 size={14} /> Supprimer {selectedCount} lignes
          </button>
        ) : (
          <>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground"
              onClick={() => { onDuplicate(); onClose(); }}
            >
              <Copy size={14} /> Dupliquer la ligne
            </button>
            <div className="h-px bg-border my-1" />
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
              onClick={() => { onDelete(); onClose(); }}
            >
              <Trash2 size={14} /> Supprimer la ligne
            </button>
          </>
        )}
      </div>
    </>
  );
};

export const SettingsPage = () => {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  // Lifted state for Global Filter & Column Visibility
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  // State for Context Menu & Coloring
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, columnId: null });
  const [visibilityAnchor, setVisibilityAnchor] = useState(null); // { x, y }
  const [coloringRules, setColoringRules] = useState([]);
  const [coloringModalOpen, setColoringModalOpen] = useState(false);
  const [tableInstance, setTableInstance] = useState(null);

  const [rowContextMenu, setRowContextMenu] = useState({ visible: false, x: 0, y: 0, row: null });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState([]);

  // Handlers
  const handleContextMenu = (e, columnId) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, columnId });
  };

  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });

  const handleHideColumn = () => {
    if (tableInstance && contextMenu.columnId) {
      tableInstance.getColumn(contextMenu.columnId)?.toggleVisibility(false);
    }
    closeContextMenu();
  };

  const handleGroupColumn = () => {
    if (tableInstance && contextMenu.columnId) {
      const column = tableInstance.getColumn(contextMenu.columnId);
      column?.toggleGrouping(!column.getIsGrouped());
    }
    closeContextMenu();
  };

  const handleRowContextMenu = (e, row) => {
    e.preventDefault();
    setRowContextMenu({ visible: true, x: e.clientX, y: e.clientY, row });
  };

  const closeRowContextMenu = () => setRowContextMenu({ ...rowContextMenu, visible: false });

  const confirmDeleteRows = (rows) => {
    setRowsToDelete(rows);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteRows = async () => {
    setFormLoading(true);
    try {
      const idsToDelete = rowsToDelete.map(r => r.original?.id).filter(Boolean);
      await campaignService.deleteCampaigns(idsToDelete);
      setSuccess(`${idsToDelete.length} campagne(s) supprimée(s).`);
      setRowSelection({});
      await loadCampaigns();
      setDeleteConfirmOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la suppression.");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteFromMenu = () => {
    const selectedRows = tableInstance?.getSelectedRowModel().rows || [];
    if (selectedRows.length > 1) {
      confirmDeleteRows(selectedRows);
    } else if (rowContextMenu.row) {
      confirmDeleteRows([rowContextMenu.row]);
    }
  };

  const handleDuplicateRow = () => {
    if (rowContextMenu.row) {
      handleOpenCreate(rowContextMenu.row.original); // Pass the data to populate form
    }
  };

  const handleColoringSave = (rule) => {
    setColoringRules([...coloringRules, rule]);
  };

  const getRowClassName = (row) => {
    // 1. Status Logic (Default)
    let classes = isCampaignActive(row.original.date_debut, row.original.date_fin) ? 'bg-green-50/40 hover:bg-green-100/50' : 'hover:bg-muted/50';

    // 2. Coloring Rules Logic
    const matchingRule = coloringRules.find(r => {
      if (!r.columnId || !r.value) return false;
      // Use row.getValue() safely
      try {
        const cellValue = row.getValue(r.columnId);
        return String(cellValue).toLowerCase().includes(r.value.toLowerCase());
      } catch (e) { return false; }
    });

    if (matchingRule) {
      classes += ` ${matchingRule.color}`;
    }
    return classes;
  };

  // States for Modal Form (Create & Edit)
  const [editMode, setEditMode] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null); // For edit
  const [formLoading, setFormLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null); // For create preview or edit form state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Inline row creation state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const [inlineSaving, setInlineSaving] = useState(false);
  const inlineRowRef = useRef(null);

  // Fetch campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await campaignService.getCampaigns();
      setCampaigns(data || []);
    } catch (err) {
      console.error("Failed to load campaigns", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setPreviewData(null);

    try {
      const data = await campaignService.parseCampaignCSV(file, user);
      setPreviewData(data);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la lecture du fichier CSV. Vérifiez le format.");
    }
  };

  const handleOpenCreate = (initialData = null) => {
    setEditMode(false);
    setCurrentCampaign(null);
    if (initialData) {
      setPreviewData({
        ...initialData.bareme,
        libelle: `${initialData.libelle} (Copie)`,
        prix_bord_champ_fixe: initialData.prix_bord_champ_fixe,
      });
    } else {
      setPreviewData(null);
    }
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (campaign) => {
    setEditMode(true);
    setCurrentCampaign(campaign);

    const formData = {
      ...campaign.bareme,
      libelle: campaign.libelle,
      prix_bord_champ_fixe: campaign.prix_bord_champ_fixe,
      date_debut: campaign.date_debut,
      date_fin: campaign.date_fin,
    };

    setPreviewData(formData);
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!previewData) return;
    setFormLoading(true);
    setError(null);

    try {
      if (editMode) {
        // Update Logic
        const updatedBareme = { ...currentCampaign.bareme };

        Object.keys(updatedBareme).forEach(key => {
          if (previewData[key] !== undefined) {
            updatedBareme[key] = previewData[key];
          }
        });

        const updates = {
          prix_bord_champ_fixe: previewData.prix_bord_champ_fixe,
          bareme: updatedBareme
        };

        await campaignService.updateCampaign(currentCampaign.id, updates, user);
        setSuccess("Campagne mise à jour avec succès !");

      } else {
        // Create Logic
        await campaignService.createCampaign(previewData);
        setSuccess("Campagne créée avec succès !");
      }

      await loadCampaigns();
      setTimeout(() => {
        setModalOpen(false);
        setEditMode(false); // Reset editMode to prevent render crash
        setSuccess(null);
        setPreviewData(null);
      }, 1500);

    } catch (err) {
      console.error(err);
      setError("Erreur lors de l'opération : " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setPreviewData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Inline row handlers
  const handleStartInlineAdd = () => {
    const defaultRow = {
      libelle: '',
      date_debut: '',
      date_fin: '',
      prix_bord_champ_fixe: 0,
      'Prix_Commercialisation': 0,
      'PRIX CAF GARANTIS': 0,
      'DROIT UNIQUE DE SORTIE (DUS)': 0,
      "TAXE D'ENREGISTREMENT": 0,
      'REDEVENCE PESAGE': 0,
      'REDEVENCE SACHERIE BROUSSE': 0,
      'CONTROLE QUALITE': 0,
      'VALEUR LOCAUX MAG': 0,
      'VALEURS DES DÉBOURS ': 0,
      "FOND D'INVESTISSEMENT AGRICOLE": 0,
      "FOND D'INVESTISSEMENT EN MILIEU RURAL": 0,
      'SUBVENTION CHBRE AGRICULTURE ET FIRCA': 0,
      'CONTRIBUTION BUDGETS ORGANISMES INTERNATIONAUX': 0,
    };
    setNewRowData(defaultRow);
    setIsAddingRow(true);
    setTimeout(() => {
      inlineRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleCancelInlineAdd = () => {
    setIsAddingRow(false);
    setNewRowData({});
  };

  const handleInlineFieldChange = (key, value) => {
    setNewRowData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveInlineRow = async () => {
    if (!newRowData.libelle?.trim()) {
      return; // libelle is required
    }
    setInlineSaving(true);
    try {
      const now = new Date().toISOString();
      const bareme = {};
      Object.keys(newRowData).forEach(key => {
        if (!['libelle', 'date_debut', 'date_fin', 'prix_bord_champ_fixe', 'status', 'user_id'].includes(key)) {
          bareme[key] = newRowData[key];
        }
      });
      bareme['Add_By'] = user?.email || 'System';
      bareme['Add_Date'] = now;
      bareme['Maj_By'] = user?.email || 'System';
      bareme['Maj_Date'] = now;

      const campaignPayload = {
        libelle: newRowData.libelle,
        date_debut: newRowData.date_debut || new Date().toISOString().split('T')[0],
        date_fin: newRowData.date_fin || new Date().toISOString().split('T')[0],
        prix_bord_champ_fixe: parseFloat(newRowData.prix_bord_champ_fixe) || 0,
        status: 'FUTURE',
        user_id: user?.id,
        bareme,
      };
      await campaignService.createCampaign(campaignPayload);
      await loadCampaigns();
      setIsAddingRow(false);
      setNewRowData({});
    } catch (err) {
      console.error('Inline save failed', err);
    } finally {
      setInlineSaving(false);
    }
  };

  const getCampaignStatus = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now >= start && now <= end) return 'En Cours';
    if (now < start) return 'À venir';
    return 'Terminée';
  };

  const isCampaignActive = (startDate, endDate) => {
    return getCampaignStatus(startDate, endDate) === 'En Cours';
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return JSON.stringify(val); // Safe fallback
    const num = parseFloat(val);
    if (isNaN(num)) return val.toString();
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Memoize columns to prevent infinite re-renders
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <label className="flex items-center justify-center p-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            checked={table.getIsAllPageRowsSelected()}
            ref={(input) => {
              if (input) {
                input.indeterminate = table.getIsSomePageRowsSelected();
              }
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        </label>
      ),
      cell: ({ row }) => (
        <label className="flex items-center justify-center p-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        </label>
      ),
      size: 40,
    },
    {
      accessorKey: 'libelle',
      header: () => <HeaderCell icon={FileText} title="ID Campagne" onContextMenu={(e) => handleContextMenu(e, 'libelle')} />,
      size: 280,
      cell: ({ row }) => {
        const status = getCampaignStatus(row.original.date_debut, row.original.date_fin);
        let colorClass = 'bg-gray-300';
        if (status === 'En Cours') colorClass = 'bg-green-500';
        else if (status === 'À venir') colorClass = 'bg-blue-500';

        return (
          <div className="flex items-center gap-2 font-medium text-xs text-foreground group h-full cursor-pointer" onClick={() => handleOpenEdit(row.original)}>
            <span>{row.original.libelle}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'date_debut',
      header: () => <HeaderCell icon={CalendarIcon} title="Date Début" onContextMenu={(e) => handleContextMenu(e, 'date_debut')} />,
      size: 120,
      cell: ({ row }) => (
        <span className="text-xs text-foreground/80 font-normal">
          {row.original.date_debut ? new Date(row.original.date_debut).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      accessorKey: 'date_fin',
      header: () => <HeaderCell icon={CalendarIcon} title="Date Clôture" onContextMenu={(e) => handleContextMenu(e, 'date_fin')} />,
      size: 120,
      cell: ({ row }) => (
        <span className="text-xs text-foreground/80 font-normal">
          {row.original.date_fin ? new Date(row.original.date_fin).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      accessorFn: row => getCampaignStatus(row.date_debut, row.date_fin),
      id: 'status',
      header: () => <HeaderCell icon={Tag} title="Status" onContextMenu={(e) => handleContextMenu(e, 'status')} />,
      size: 100,
      cell: info => {
        const status = info.getValue();
        let badgeClass = 'bg-gray-100 text-gray-600';
        if (status === 'En Cours') badgeClass = 'bg-green-100 text-green-800';
        else if (status === 'À venir') badgeClass = 'bg-blue-100 text-blue-800';

        return <span className={`text-[11px] px-2 py-0.5 rounded-sm ${badgeClass}`}>{status}</span>;
      }
    },
    // Colonnes du Barème (Simplified & Styled)
    {
      accessorFn: row => row.bareme?.['Prix_Commercialisation'],
      id: 'prix_comm',
      header: () => <HeaderCell icon={Coins} title="PRIX COMM." onContextMenu={(e) => handleContextMenu(e, 'prix_comm')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['PRIX CAF GARANTIS'],
      id: 'prix_caf',
      header: () => <HeaderCell icon={Hash} title="PRIX CAF" onContextMenu={(e) => handleContextMenu(e, 'prix_caf')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['DROIT UNIQUE DE SORTIE (DUS)'],
      id: 'dus',
      header: () => <HeaderCell icon={Hash} title="DUS" onContextMenu={(e) => handleContextMenu(e, 'dus')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.["TAXE D'ENREGISTREMENT"],
      id: 'taxe_enr',
      header: () => <HeaderCell icon={Hash} title="TAXE ENR." onContextMenu={(e) => handleContextMenu(e, 'taxe_enr')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['REDEVENCE PESAGE'],
      id: 'red_pesage',
      header: () => <HeaderCell icon={Hash} title="RED. PESAGE" onContextMenu={(e) => handleContextMenu(e, 'red_pesage')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['REDEVENCE SACHERIE BROUSSE'],
      id: 'red_sacherie',
      header: () => <HeaderCell icon={Hash} title="RED. SACHERIE" onContextMenu={(e) => handleContextMenu(e, 'red_sacherie')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['CONTROLE QUALITE'],
      id: 'ctrl_qualite',
      header: () => <HeaderCell icon={CheckCircle} title="CTRL QUALITÉ" onContextMenu={(e) => handleContextMenu(e, 'ctrl_qualite')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['VALEUR LOCAUX MAG'],
      id: 'val_locaux',
      header: () => <HeaderCell icon={Hash} title="VAL LOCAUX" onContextMenu={(e) => handleContextMenu(e, 'val_locaux')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['VALEURS DES DÉBOURS '], // Attention espace fin
      id: 'debours',
      header: () => <HeaderCell icon={Coins} title="DÉBOURS" onContextMenu={(e) => handleContextMenu(e, 'debours')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.["FOND D'INVESTISSEMENT AGRICOLE"],
      id: 'fond_agri',
      header: () => <HeaderCell icon={Coins} title="FOND AGRI." onContextMenu={(e) => handleContextMenu(e, 'fond_agri')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.["FOND D'INVESTISSEMENT EN MILIEU RURAL"],
      id: 'fond_rural',
      header: () => <HeaderCell icon={Coins} title="FOND RURAL" onContextMenu={(e) => handleContextMenu(e, 'fond_rural')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['SUBVENTION CHBRE AGRICULTURE ET FIRCA'],
      id: 'subv_chambre',
      header: () => <HeaderCell icon={Coins} title="SUBV. CHAMBRE" onContextMenu={(e) => handleContextMenu(e, 'subv_chambre')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorFn: row => row.bareme?.['CONTRIBUTION BUDGETS ORGANISMES INTERNATIONAUX'],
      id: 'contr_org_int',
      header: () => <HeaderCell icon={Coins} title="CONTR. ORG. INT." onContextMenu={(e) => handleContextMenu(e, 'contr_org_int')} />,
      cell: info => <span className="font-mono text-xs text-foreground/70">{formatCurrency(info.getValue())}</span>
    },
    // Audit Cols
    {
      accessorFn: row => row.bareme?.['Add_By'],
      id: 'add_by',
      header: () => <HeaderCell icon={Edit} title="CRÉÉ PAR" onContextMenu={(e) => handleContextMenu(e, 'add_by')} />,
      cell: info => <span className="text-[11px] text-muted-foreground">{info.getValue()}</span>
    },
    {
      accessorFn: row => row.bareme?.['Add_Date'],
      id: 'add_date',
      header: () => <HeaderCell icon={CalendarIcon} title="CRÉÉ LE" onContextMenu={(e) => handleContextMenu(e, 'add_date')} />,
      cell: info => <span className="text-[11px] text-muted-foreground whitespace-nowrap text-xs">{info.getValue() ? new Date(info.getValue()).toLocaleString() : '-'}</span>
    },
    {
      accessorFn: row => row.bareme?.['Maj_By'],
      id: 'maj_by',
      header: () => <HeaderCell icon={Edit} title="MAJ PAR" onContextMenu={(e) => handleContextMenu(e, 'maj_by')} />,
      cell: info => <span className="text-[11px] text-muted-foreground">{info.getValue()}</span>
    },
    {
      accessorFn: row => row.bareme?.['Maj_Date'],
      id: 'maj_date',
      header: () => <HeaderCell icon={CalendarIcon} title="MAJ LE" onContextMenu={(e) => handleContextMenu(e, 'maj_date')} />,
      cell: info => <span className="text-[11px] text-muted-foreground whitespace-nowrap text-xs">{info.getValue() ? new Date(info.getValue()).toLocaleString() : '-'}</span>
    }
  ], [campaigns]); // Re-create if campaigns change (to update status if needed)

  return (
    <div className="max-w-full mx-auto" onClick={closeContextMenu}>
      {/* Modals & ContextMenu - Outside flow to prevent layout shift */}
      <ColumnContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={closeContextMenu}
        onHide={handleHideColumn}
        onGroup={handleGroupColumn}
      />
      <VisibilityMenu
        anchor={visibilityAnchor}
        table={tableInstance}
        onClose={() => setVisibilityAnchor(null)}
      />
      <RowContextMenu
        visible={rowContextMenu.visible}
        x={rowContextMenu.x}
        y={rowContextMenu.y}
        onClose={closeRowContextMenu}
        onDelete={confirmDeleteFromMenu}
        onDuplicate={handleDuplicateRow}
        selectedCount={tableInstance?.getSelectedRowModel().rows.length || 0}
      />
      <ColoringModal
        isOpen={coloringModalOpen}
        onClose={() => setColoringModalOpen(false)}
        onSave={handleColoringSave}
        columns={[
          { id: 'libelle', label: 'ID Campagne' },
          { id: 'status', label: 'Status' },
          { id: 'prix_comm', label: 'Prix Commercialisation' },
          { id: 'prix_bord_champ_fixe', label: 'Prix Bord Champs' }
        ]}
      />

      <div className="space-y-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <LayoutGrid size={20} className="text-primary" />
              Mes Campagnes
            </h2>
            <p className="text-muted-foreground text-xs">Gestion des périodes et barèmes.</p>
          </div>
          <Button onClick={() => handleOpenCreate()} size="sm" className="gap-2 shadow-sm h-8 text-xs">
            <Upload size={14} />
            Import de données
          </Button>
        </div>

        {/* Campaigns Table - Airtable Like */}
        <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden grid-cols-1">

          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-xs">Chargement des données...</span>
            </div>
          ) : (
            <>
              <ToolbarWrapper
                table={tableInstance}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                columnVisibility={columnVisibility}
                setTableInstance={setTableInstance}
                onColoringClick={() => setColoringModalOpen(true)}
                onVisibilityClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setVisibilityAnchor({ x: rect.left, y: rect.bottom + 4 });
                }}
              />
              <div className="overflow-x-auto">
                <div className="min-w-full inline-block align-middle">
                  <DataGrid
                    data={campaigns}
                    columns={columns}
                    globalFilter={globalFilter}
                    onGlobalFilterChange={setGlobalFilter}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    onRowContextMenu={handleRowContextMenu}
                    renderToolbar={(props) => (
                      <TableCapture table={props.table} setTableInstance={setTableInstance} />
                    )}
                    hideToolbar={false}
                    getRowClassName={getRowClassName}
                    className="rounded-none border-0"
                    renderAppendixRow={({ table }) => {
                      if (!isAddingRow) return null;
                      return (
                        <tr ref={inlineRowRef} className="border-t-2 border-primary/40 bg-primary/5 animate-in slide-in-from-bottom-2 duration-200 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
                          {table.getVisibleLeafColumns().map((column) => {
                            let content = null;
                            switch (column.id) {
                              case 'libelle':
                                content = <input autoFocus type="text" placeholder="Nom de la campagne..." value={newRowData.libelle || ''} onChange={(e) => handleInlineFieldChange('libelle', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs bg-background border border-input rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none" />;
                                break;
                              case 'date_debut':
                                content = <input type="date" value={newRowData.date_debut || ''} onChange={(e) => handleInlineFieldChange('date_debut', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'date_fin':
                                content = <input type="date" value={newRowData.date_fin || ''} onChange={(e) => handleInlineFieldChange('date_fin', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'status':
                                content = <span className="text-[11px] px-2 py-0.5 rounded-sm bg-blue-100 text-blue-800">Nouveau</span>;
                                break;
                              case 'prix_comm':
                                content = <input type="number" placeholder="0" value={newRowData['Prix_Commercialisation'] || ''} onChange={(e) => handleInlineFieldChange('Prix_Commercialisation', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'prix_caf':
                                content = <input type="number" placeholder="0" value={newRowData['PRIX CAF GARANTIS'] || ''} onChange={(e) => handleInlineFieldChange('PRIX CAF GARANTIS', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'dus':
                                content = <input type="number" placeholder="0" value={newRowData['DROIT UNIQUE DE SORTIE (DUS)'] || ''} onChange={(e) => handleInlineFieldChange('DROIT UNIQUE DE SORTIE (DUS)', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'taxe_enr':
                                content = <input type="number" placeholder="0" value={newRowData["TAXE D'ENREGISTREMENT"] || ''} onChange={(e) => handleInlineFieldChange("TAXE D'ENREGISTREMENT", e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'red_pesage':
                                content = <input type="number" placeholder="0" value={newRowData['REDEVENCE PESAGE'] || ''} onChange={(e) => handleInlineFieldChange('REDEVENCE PESAGE', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'red_sacherie':
                                content = <input type="number" placeholder="0" value={newRowData['REDEVENCE SACHERIE BROUSSE'] || ''} onChange={(e) => handleInlineFieldChange('REDEVENCE SACHERIE BROUSSE', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'ctrl_qualite':
                                content = <input type="number" placeholder="0" value={newRowData['CONTROLE QUALITE'] || ''} onChange={(e) => handleInlineFieldChange('CONTROLE QUALITE', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'val_locaux':
                                content = <input type="number" placeholder="0" value={newRowData['VALEUR LOCAUX MAG'] || ''} onChange={(e) => handleInlineFieldChange('VALEUR LOCAUX MAG', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'debours':
                                content = <input type="number" placeholder="0" value={newRowData['VALEURS DES DÉBOURS '] || ''} onChange={(e) => handleInlineFieldChange('VALEURS DES DÉBOURS ', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'fond_agri':
                                content = <input type="number" placeholder="0" value={newRowData["FOND D'INVESTISSEMENT AGRICOLE"] || ''} onChange={(e) => handleInlineFieldChange("FOND D'INVESTISSEMENT AGRICOLE", e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'fond_rural':
                                content = <input type="number" placeholder="0" value={newRowData["FOND D'INVESTISSEMENT EN MILIEU RURAL"] || ''} onChange={(e) => handleInlineFieldChange("FOND D'INVESTISSEMENT EN MILIEU RURAL", e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'subv_chambre':
                                content = <input type="number" placeholder="0" value={newRowData['SUBVENTION CHBRE AGRICULTURE ET FIRCA'] || ''} onChange={(e) => handleInlineFieldChange('SUBVENTION CHBRE AGRICULTURE ET FIRCA', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'contr_org_int':
                                content = <input type="number" placeholder="0" value={newRowData['CONTRIBUTION BUDGETS ORGANISMES INTERNATIONAUX'] || ''} onChange={(e) => handleInlineFieldChange('CONTRIBUTION BUDGETS ORGANISMES INTERNATIONAUX', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineRow(); if (e.key === 'Escape') handleCancelInlineAdd(); }} className="w-full h-8 px-2 text-xs font-mono bg-background border border-input rounded focus:ring-1 focus:ring-primary outline-none" />;
                                break;
                              case 'add_by':
                                content = <span className="text-[11px] text-muted-foreground">{user?.email || '-'}</span>;
                                break;
                              case 'add_date':
                                content = <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date().toLocaleDateString()}</span>;
                                break;
                              case 'maj_by':
                              case 'maj_date':
                                content = <span className="text-muted-foreground">-</span>;
                                break;
                              default:
                                content = null;
                            }
                            return (
                              <td key={column.id} className="p-2 align-middle border-r border-border/40 last:border-r-0">
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }}
                  />
                </div>
              </div>
              {/* Inline Row Actions / Add Button */}
              {isAddingRow ? (
                <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-t border-border mt-0">
                  <span className="text-[10px] text-muted-foreground mr-auto">Appuyez sur Entrée pour enregistrer, Échap pour annuler</span>
                  <button
                    onClick={handleCancelInlineAdd}
                    disabled={inlineSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background border border-border rounded hover:bg-muted transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveInlineRow}
                    disabled={inlineSaving || !newRowData.libelle?.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {inlineSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartInlineAdd}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground border-t border-border transition-colors group mt-0 bg-transparent"
                >
                  <Plus size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  <span>Ajouter une campagne</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode ? `Modifier: ${currentCampaign?.libelle}` : "Nouvelle Campagne"}
        description={editMode ? "Mettez à jour les valeurs du barème. Les modifications sont auditées." : "Ouvrir une nouvelle période de récolte en important le barème officiel (CSV)."}
      >
        <div className="space-y-6 pt-4">


          {!previewData ? ( // Si pas de données, on affiche l'upload (sauf si editMode + bug, mais ici on sécurise le rendu)
            <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors bg-muted/10">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Upload size={24} />
              </div>
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-foreground block mb-1">Cliquez pour uploader le barème</span>
                <span className="text-xs text-muted-foreground block mb-4">Format CSV (Airtable / CCC) uniquement</span>
                <Button variant="outline" size="sm" className="pointer-events-none">Choisir un fichier</Button>
                <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mode Édition ou Preview Création */}
              <div className="rounded-lg border bg-muted/20 p-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 border-b pb-2 sticky top-0 bg-background/95 backdrop-blur z-10">
                  <h4 className="font-semibold text-sm uppercase tracking-wide">
                    {editMode ? 'Formulaire d\'édition' : 'Prévisualisation'}
                  </h4>
                  {!editMode && (
                    <Button variant="ghost" size="xs" onClick={() => setPreviewData(null)} className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                      Annuler
                    </Button>
                  )}
                </div>

                {/* Champs Dynamiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Champs Fixes */}
                  <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-background rounded-md border mb-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Libellé</label>
                      <Input
                        value={previewData.libelle}
                        disabled
                        className="h-8 bg-muted"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Prix Bord Champ (XOF)</label>
                      <Input
                        value={previewData.prix_bord_champ_fixe}
                        onChange={(e) => handleInputChange('prix_bord_champ_fixe', e.target.value)}
                        disabled={!editMode}
                        className={`h-8 font-mono font-bold ${editMode ? 'bg-background' : 'bg-muted text-green-600'}`}
                      />
                    </div>
                  </div>

                  {/* Champs du Barème */}
                  {Object.keys(previewData).map((key) => {
                    // Filtrer les champs fixes et système
                    if (['libelle', 'prix_bord_champ_fixe', 'date_debut', 'date_fin', 'status', 'user_id', 'bareme'].includes(key)) return null;
                    if (['Add_By', 'Add_Date', 'Maj_By', 'Maj_Date', 'Status'].includes(key)) return null;

                    return (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground truncate" title={key}>{key}</label>
                        {editMode ? (
                          <Input
                            value={previewData[key]}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            className="h-8 font-mono"
                          />
                        ) : (
                          <div className="px-3 py-1.5 bg-background border rounded text-xs font-mono font-medium truncate">
                            {previewData[key]}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={formLoading} className="w-full sm:w-auto gap-2">
                  {formLoading ? 'Traitement...' : (editMode ? 'Enregistrer les modifications' : 'Valider & Ouvrir Campagne')}
                  <Save size={16} />
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-start gap-2 animate-in slide-in-from-top-1">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm flex items-center gap-2 animate-in slide-in-from-top-1">
              <CheckCircle size={16} /> {success}
            </div>
          )}
        </div>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer ces campagnes ? Cette action est irréversible."
      >
        <div className="space-y-4 pt-4">
          <p className="text-sm font-medium text-foreground">
            Vous allez supprimer {rowsToDelete.length} campagne(s).
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={executeDeleteRows} disabled={formLoading}>
              {formLoading ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
