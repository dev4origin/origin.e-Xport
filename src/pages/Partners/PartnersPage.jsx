import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { partnerService } from '../../services/partnerService';
import { campaignService } from '../../services/campaignService';
import { bankService } from '../../services/bankService';
import { bankPledgeService } from '../../services/bankPledgeService';
import { clientService } from '../../services/clientService';
import { DataGrid } from '../../components/shared/DataGrid';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Search, Plus, Handshake, Building2, Calendar, FileText, CheckCircle, AlertCircle, Loader2, Map as MapIcon, Info, Edit2, Upload, TreeDeciduous, Users, Cross, Droplets, Home, AlertTriangle, ChevronRight, Save } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, Popup, GeoJSON, ScaleControl, CircleMarker, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Helper for Zoom Event
const ZoomHandler = ({ setZoomLevel }) => {
    const map = useMapEvents({
        zoomend: () => {
            setZoomLevel(map.getZoom());
        },
    });
    return null;
};

// --- LEAFLET ICON FIX ---
// This fixes the missing marker icons issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon Helper (Simplified from reference)
const createCustomIcon = (color, svgPath) => {
    return L.divIcon({
        className: "custom-map-icon",
        html: `<div style="background-color: white; border: 2px solid ${color}; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="${svgPath}" />
             </svg>
           </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15],
    });
};

export const PartnersPage = () => {
    const { user } = useAuth();

    // UI State
    const [mainTab, setMainTab] = useState('fournisseurs'); 
    const [subTab, setSubTab] = useState('liste_globale'); 
    const [zoomLevel, setZoomLevel] = useState(7); // Initial zoom level logic

    // Data States
    const [partners, setPartners] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [productionData, setProductionData] = useState({ polygons: [], stats: { producers: 0, parcels: 0 } });
    const [protectedAreas, setProtectedAreas] = useState(null);
    const [mapZoom, setMapZoom] = useState(13);

    // Context / Handlers for Banks & Clients
    const [banks, setBanks] = useState([]);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [isAddingBank, setIsAddingBank] = useState(false);
    const [newBankData, setNewBankData] = useState({});
    const [bankSaving, setBankSaving] = useState(false);
    const bankInlineRowRef = useRef(null);

    const [pledges, setPledges] = useState([]);
    const [loadingPledges, setLoadingPledges] = useState(false);
    const [isAddingPledge, setIsAddingPledge] = useState(false);
    const [newPledgeData, setNewPledgeData] = useState({ type_application: 'REVERSEMENT' });
    const [pledgeSaving, setPledgeSaving] = useState(false);
    const pledgeInlineRowRef = useRef(null);

    const [clients, setClients] = useState([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [newClientData, setNewClientData] = useState({});
    const [clientSaving, setClientSaving] = useState(false);
    const clientInlineRowRef = useRef(null);

    const [exportContracts, setExportContracts] = useState([]);
    const [loadingExportContracts, setLoadingExportContracts] = useState(false);
    const [isAddingExportContract, setIsAddingExportContract] = useState(false);
    const [newExportContractData, setNewExportContractData] = useState({});
    const [exportContractSaving, setExportContractSaving] = useState(false);
    const exportContractInlineRowRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [loadingMap, setLoadingMap] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    // Campaigns State
    const [campaignsList, setCampaignsList] = useState([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        actionType: null, // 'CANCEL' or 'REVOKE'
        relationshipId: null,
        targetId: null,
        partnerName: ''
    });

    // Contract Form Modal State
    const [contractFormModal, setContractFormModal] = useState({
        isOpen: false,
        targetId: null,
        partnerName: ''
    });
    const [contractCreateMode, setContractCreateMode] = useState('DRAFT'); // 'DRAFT' or 'ACTIVE'

    // Finalize Modal State
    const [finalizeModal, setFinalizeModal] = useState({
        isOpen: false,
        contract: null,
        volume_total_kg: '',
        date_signature: ''
    });

    // Modal & Form States
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Search, 2: Contract
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [partnerStats, setPartnerStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [fairtradeStatus, setFairtradeStatus] = useState(null);
    const [loadingFairtrade, setLoadingFairtrade] = useState(false);

    // Contract Form State
    const [contractData, setContractData] = useState({
        reference_interne: '',
        date_signature: '',
        periode_livraison_start: '',
        periode_livraison_end: '',
        volume_total_kg: '',
        incoterm: 'DAP',
        prix_unitaire_kg: '',
        prix_fixe_kg: '',
        prime_certification: '0',
        currency: 'XOF',
        campaign: '',
        campagne_id: null,
        sustainability_program: '',
        traceability_level: '',
        quality_required: 'G1',
        volume_tolerance_pct: '5'
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Initial Load
    useEffect(() => {
        loadPartners();
        loadCampaignsList();
    }, [user]);

    // Load Contracts/Map when tab changes
    useEffect(() => {
        if (mainTab === 'fournisseurs' && subTab === 'contrats_brousse' && contracts.length === 0) {
            loadContracts();
        }
        if (mainTab === 'fournisseurs' && subTab === 'zone_production') {
            if (productionData.polygons.length === 0) loadMapData();
            if (!protectedAreas) loadProtectedAreas();
        }
        if (mainTab === 'banques' && subTab === 'liste_globale' && banks.length === 0) {
            loadBanks();
        }
        if (mainTab === 'banques' && subTab === 'parametres_nantissement' && pledges.length === 0) {
            loadPledges();
        }
        if (mainTab === 'clients' && subTab === 'liste_globale' && clients.length === 0) {
            loadClients();
        }
        if (mainTab === 'clients' && subTab === 'contrats_commercialisation' && exportContracts.length === 0) {
            loadExportContracts();
        }
    }, [mainTab, subTab]);

    const loadBanks = async () => {
        setLoadingBanks(true);
        try {
            const data = await bankService.getBanks(user?.id);
            setBanks(data);
        } catch (err) {
            console.error("Erreur chargement banques", err);
        } finally {
            setLoadingBanks(false);
        }
    };

    const loadPledges = async () => {
        setLoadingPledges(true);
        try {
            const data = await bankPledgeService.getPledges(user?.id);
            setPledges(data);
        } catch (err) {
            console.error("Erreur chargement nantissements", err);
        } finally {
            setLoadingPledges(false);
        }
    };

    const loadClients = async () => {
        setLoadingClients(true);
        try {
            const data = await clientService.getClients(user?.id);
            setClients(data);
        } catch (err) {
            console.error("Failed to load clients", err);
        } finally {
            setLoadingClients(false);
        }
    };

    const loadExportContracts = async () => {
        setLoadingExportContracts(true);
        try {
            const data = await clientService.getExportContracts(user?.id);
            setExportContracts(data);
        } catch (err) {
            console.error("Erreur chargement contrats export", err);
        } finally {
            setLoadingExportContracts(false);
        }
    };

    const loadCampaignsList = async () => {
        setLoadingCampaigns(true);
        try {
            const data = await campaignService.getCampaigns();
            setCampaignsList(data || []);
        } catch (err) {
            console.error("Failed to load campaigns", err);
        } finally {
            setLoadingCampaigns(false);
        }
    };

    const loadPartners = async () => {
        setLoading(true);
        try {
            const data = await partnerService.getActivePartners(user);
            setPartners(data);
        } catch (err) {
            console.error("Failed to load partners", err);
        } finally {
            setLoading(false);
        }
    };

    const loadContracts = async () => {
        setLoadingContracts(true);
        try {
            const data = await partnerService.getContracts(user);
            setContracts(data);
        } catch (err) {
            console.error("Failed to load contracts", err);
        } finally {
            setLoadingContracts(false);
        }
    };

    const loadMapData = async () => {
        setLoadingMap(true);
        try {
            const data = await partnerService.getPartnerPolygons(user);
            setProductionData(data);
        } catch (err) {
            console.error("Failed to load map data", err);
        } finally {
            setLoadingMap(false);
        }
    };

    const loadProtectedAreas = async () => {
        try {
            const response = await fetch('/data/ZONE_PROTEGEE_CIV.geojson');
            if (response.ok) {
                const data = await response.json();
                setProtectedAreas(data);
            } else {
                console.error("Failed to load protected areas GeoJSON");
            }
        } catch (err) {
            console.error("Error loading protected areas", err);
        }
    };

    // Search Helpers
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm) return;
        setSearchLoading(true);
        setError(null);
        try {
            const results = await partnerService.searchPartners(searchTerm, user);
            setSearchResults(results);
            if (results.length === 0) setError("Aucune coopérative trouvée.");
        } catch (err) {
            console.error("Erreur de recherche:", err);
            setError(err.message || "Erreur lors de la recherche.");
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSelectPartner = async (partner) => {
        setSelectedPartner(partner);
        setStep(2);
        setError(null);
        setFairtradeStatus(null);
        setPartnerStats(null);

        // Fetch Fairtrade status using the cooperative name
        if (partner && partner.nom) {
            setLoadingFairtrade(true);
            const ftStatus = await partnerService.searchFairtradeStatus(partner.nom);
            setFairtradeStatus(ftStatus);
            setLoadingFairtrade(false);
        }

        // Fetch stats if possible
        if (partner.fournisseur_officiel_id) {
            setLoadingStats(true);
            const stats = await partnerService.getPartnerStats(partner.fournisseur_officiel_id);
            setPartnerStats(stats);
            setLoadingStats(false);
        }
    };

    // Submit Helper
    const handleSubmitPartnershipRequest = async () => {
        setSubmitLoading(true);
        setError(null);

        try {
            await partnerService.createPartnership(selectedPartner.id, {}, user);
            setSuccess("Demande de partenariat envoyée avec succès !");
            await loadPartners(); // Refresh list

            setTimeout(() => {
                handleCloseModal();
            }, 1500);

        } catch (err) {
            setError("Erreur lors de l'enregistrement : " + err.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setStep(1);
        setSearchTerm('');
        setSearchResults([]);
        setSelectedPartner(null);
        setPartnerStats(null);
        setContractData({ reference_interne: '', date_signature: '', periode_livraison_start: '', periode_livraison_end: '', volume_total_kg: '', incoterm: 'DAP', prix_unitaire_kg: '', prix_fixe_kg: '', prime_certification: '0', currency: 'XOF', campaign: '', campagne_id: null, sustainability_program: '', traceability_level: '', quality_required: 'G1', volume_tolerance_pct: '5' });
        setError(null);
        setSuccess(null);
    };

    const openConfirmModal = (actionType, partner) => {
        setConfirmModal({
            isOpen: true,
            actionType,
            relationshipId: partner.id,
            targetId: partner.target.id,
            partnerName: partner.target.nom
        });
    };

    const handleConfirmAction = async () => {
        const { actionType, relationshipId, targetId } = confirmModal;
        setActionLoading(relationshipId);
        try {
            if (actionType === 'CANCEL') {
                await partnerService.cancelPartnership(relationshipId, user);
            } else if (actionType === 'REVOKE') {
                await partnerService.revokePartnership(relationshipId, targetId, user);
            }
            await loadPartners();
            setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
            console.error(`Erreur ${actionType}:`, err);
            alert(`Erreur: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenContractForm = (partner) => {
        const defaultCampaign = campaignsList.find(c => c.status === 'ACTIVE') || campaignsList[0];
        
        setContractData({
            reference_interne: `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            date_signature: new Date().toISOString().split('T')[0],
            periode_livraison_start: '',
            periode_livraison_end: '',
            volume_total_kg: '',
            incoterm: 'DAP',
            prix_unitaire_kg: '',
            prix_fixe_kg: '',
            prime_certification: '0',
            currency: 'XOF',
            campaign: defaultCampaign ? defaultCampaign.libelle : '',
            campagne_id: defaultCampaign ? defaultCampaign.id : null,
            sustainability_program: '',
            traceability_level: '',
            quality_required: 'G1',
            volume_tolerance_pct: '5'
        });
        setContractCreateMode('DRAFT');
        setContractFormModal({
            isOpen: true,
            targetId: partner.target.id,
            partnerName: partner.target.nom
        });
    };

    const handleSubmitContract = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await partnerService.addContract({...contractData, status: contractCreateMode}, contractFormModal.targetId, user);
            setSuccess(contractCreateMode === 'DRAFT' ? "Brouillon de contrat créé avec succès !" : "Contrat actif créé avec succès !");
            await loadContracts(); // Refresh contracts list
            setTimeout(() => {
                setContractFormModal({ ...contractFormModal, isOpen: false });
                setSuccess(null);
                setMainTab('fournisseurs');
                setSubTab('contrats_brousse'); // Switch to contracts tab to see it
            }, 1500);
        } catch (err) {
            console.error("Erreur création contrat:", err);
            setError(err.message || "Impossible de créer le contrat");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleOpenFinalizeModal = (contract) => {
        setFinalizeModal({
            isOpen: true,
            contract,
            volume_total_kg: contract.volume_total_kg || '',
            date_signature: contract.date_signature || new Date().toISOString().split('T')[0]
        });
    };

    const handleFinalizeContract = async () => {
        setActionLoading(finalizeModal.contract?.id);
        setError(null);
        try {
            await partnerService.finalizeContract(finalizeModal.contract.id, {
                volume_total_kg: finalizeModal.volume_total_kg,
                date_signature: finalizeModal.date_signature
            });
            await loadContracts();
            setFinalizeModal({ isOpen: false, contract: null, volume_total_kg: '', date_signature: '' });
        } catch (err) {
            console.error("Erreur finalisation", err);
            alert(`Erreur: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // Helper for Map Colors
    const getPolygonColor = (culture) => {
        switch (culture?.toLowerCase()) {
            case 'cacao': return '#d97706'; // amber-600
            case 'hevea': return '#16a34a'; // green-600
            case 'anacarde': return '#dc2626'; // red-600
            default: return '#2563eb'; // blue-600
        }
    };

    const getAddButtonText = () => {
        switch (mainTab) {
            case 'fournisseurs': return 'Ajouter un Fournisseur';
            case 'sous_traitants': return 'Ajouter un Sous-traitant';
            case 'banques': return 'Ajouter une Banque';
            case 'clients': return 'Ajouter un Client';
            default: return 'Ajouter un Partenaire';
        }
    };

    const handleSaveBankRow = async () => {
        if (!newBankData.nom_banque?.trim()) return;
        setBankSaving(true);
        try {
            let finalLogoUrl = newBankData.logo_url || null;
            if (newBankData.logoTemplateFile) {
                const myOrgId = await partnerService._getMyOrgId(user?.id);
                finalLogoUrl = await bankService.uploadBankLogo(newBankData.logoTemplateFile, myOrgId);
            }
            await bankService.createBank({ ...newBankData, logo_url: finalLogoUrl }, user?.id);
            await loadBanks();
            setNewBankData({});
            setIsAddingBank(false);
        } catch (err) {
            console.error("Bank inline save failed", err);
        } finally {
            setBankSaving(false);
        }
    };

    const handleSaveClientRow = async () => {
        if (!newClientData.nom_client?.trim()) return;
        setClientSaving(true);
        try {
            await clientService.createClient(newClientData, user?.id);
            await loadClients();
            setNewClientData({});
            setIsAddingClient(false);
        } catch (err) {
            console.error("Client inline save failed", err);
        } finally {
            setClientSaving(false);
        }
    };

    const handleSavePledgeRow = async () => {
        if (!newPledgeData.bank_id || !newPledgeData.campagne_id) return;
        setPledgeSaving(true);
        try {
            await bankPledgeService.createPledge(newPledgeData, user?.id);
            await loadPledges();
            setNewPledgeData({ type_application: 'REVERSEMENT' });
            setIsAddingPledge(false);
        } catch (err) {
            console.error("Pledge inline save failed", err);
        } finally {
            setPledgeSaving(false);
        }
    };

    const handleSaveExportContractRow = async () => {
        if (!newExportContractData.client_id) return;
        setExportContractSaving(true);
        try {
            await clientService.addExportContract(newExportContractData, user?.id);
            await loadExportContracts();
            setNewExportContractData({});
            setIsAddingExportContract(false);
        } catch (err) {
            console.error("Export contract inline save failed", err);
        } finally {
            setExportContractSaving(false);
        }
    };

    const bankColumns = useMemo(() => [
        {
            accessorKey: 'logo_url',
            header: 'Logo',
            cell: ({ row }) => row.original.logo_url ? <img src={row.original.logo_url} alt="Logo" className="h-8 w-auto object-contain rounded" /> : <span className="text-muted-foreground text-[10px] italic">Aucun</span>
        },
        {
            accessorKey: 'nom_banque',
            header: 'Nom de la Banque',
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.nom_banque}</span>
        },
        {
            accessorKey: 'type_compte',
            header: 'Type',
            cell: ({ row }) => <span className="text-muted-foreground"><Badge variant="outline" className="text-[10px]">{row.original.type_compte || 'COURANT'}</Badge></span>
        },
        {
            accessorKey: 'iban',
            header: 'IBAN',
            cell: ({ row }) => <span className="text-muted-foreground font-mono text-[10px] bg-muted/30 px-1 rounded">{row.original.iban || '-'}</span>
        },
        {
            accessorKey: 'code_bic',
            header: 'Code BIC',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.code_bic || '-'}</span>
        },
        {
            accessorKey: 'contact_gestionnaire',
            header: 'Contact',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.contact_gestionnaire || '-'}</span>
        },
        {
            accessorKey: 'nom_gestionnaire',
            header: 'Nom Gestionnaire',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.nom_gestionnaire || '-'}</span>
        },
        {
            accessorKey: 'email_gestionnaire',
            header: 'Email',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.email_gestionnaire || '-'}</span>
        }
    ], []);

    const clientColumns = useMemo(() => [
        {
            accessorKey: 'nom_client',
            header: 'Nom du Client',
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.nom_client}</span>
        },
        {
            accessorKey: 'id_rainforest',
            header: 'ID Rainforest',
            cell: ({ row }) => <span className="text-muted-foreground font-mono text-xs">{row.original.id_rainforest || '-'}</span>
        },
        {
            accessorKey: 'id_fairtrade',
            header: 'ID Fairtrade',
            cell: ({ row }) => <span className="text-muted-foreground font-mono text-xs">{row.original.id_fairtrade || '-'}</span>
        },
        {
            accessorKey: 'contact_commercial',
            header: 'Contact',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.contact_commercial || '-'}</span>
        },
        {
            accessorKey: 'adresse',
            header: 'Adresse',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.adresse || '-'}</span>
        }
    ], []);

    const exportContractColumns = useMemo(() => [
        {
            accessorKey: 'client_id',
            header: 'Client',
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.clients_export?.nom_client || '-'}</span>
        },
        {
            accessorKey: 'numero_contrat',
            header: 'N° Contrat',
            cell: ({ row }) => <span className="text-muted-foreground font-mono text-[10px]">{row.original.numero_contrat || '-'}</span>
        },
        {
            accessorKey: 'prix_caf_deblocage',
            header: 'PRIX CAF / DÉBLOCAGE',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.prix_caf_deblocage || '-'}</span>
        },
        {
            accessorKey: 'drd',
            header: 'DRD',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.drd || '-'}</span>
        },
        {
            accessorKey: 'taux_reversement',
            header: 'TAUX REVERSEMENT',
            cell: ({ row }) => <span className="text-xs">{row.original.taux_reversement || '-'}</span>
        },
        {
            accessorKey: 'taux_soutien',
            header: 'TAUX SOUTIEN',
            cell: ({ row }) => <span className="text-xs">{row.original.taux_soutien || '-'}</span>
        },
        {
            accessorKey: 'statut_contrat',
            header: 'STATUT CONTRAT',
            cell: ({ row }) => {
                if (!row.original.statut_contrat) return <span className="text-[10px] text-muted-foreground">N/A</span>;
                return <Badge variant={row.original.statut_contrat === 'REVERSEMENT' ? 'success' : 'outline'}>{row.original.statut_contrat}</Badge>
            }
        }
    ], []);

    const pledgeColumns = useMemo(() => [
        {
            accessorKey: 'bank_id',
            header: 'Banque',
            cell: ({ row }) => <span className="font-medium">{row.original.banks?.nom_banque || '-'}</span>
        },
        {
            accessorKey: 'campagne_id',
            header: 'Campagne',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.campagnes?.libelle || '-'}</span>
        },
        {
            accessorKey: 'type_application',
            header: 'Type',
            cell: ({ row }) => <Badge variant="outline" className="text-[10px]">{row.original.type_application}</Badge>
        },
        {
            accessorKey: 'taux_prix_contrat',
            header: '% CONTRAT',
            cell: ({ row }) => <span className="text-[10px]">{row.original.taux_prix_contrat || '-'}</span>
        },
        {
            accessorKey: 'taux_prix_marche',
            header: '% MARCHÉ',
            cell: ({ row }) => <span className="text-[10px]">{row.original.taux_prix_marche || '-'}</span>
        },
        {
            accessorKey: 'taux_drd_finance',
            header: '% DRD',
            cell: ({ row }) => <span className="text-[10px]">{row.original.taux_drd_finance || '-'}</span>
        },
        {
            accessorKey: 'taux_valeurs_debours',
            header: '% DÉBOURS',
            cell: ({ row }) => <span className="text-[10px]">{row.original.taux_valeurs_debours || '-'}</span>
        },
        {
            accessorKey: 'taux_valeur_locaux_mag',
            header: '% MAG',
            cell: ({ row }) => <span className="text-[10px]">{row.original.taux_valeur_locaux_mag || '-'}</span>
        },
        {
            accessorKey: 'taux_sequestre',
            header: '% SQ',
            cell: ({ row }) => <span className="text-[10px]">{row.original.taux_sequestre || '-'}</span>
        },
        {
            accessorKey: 'prix_sequestre_kg',
            header: 'PX SQ/KG',
            cell: ({ row }) => <span className="text-[10px]">{row.original.prix_sequestre_kg || '-'}</span>
        }
    ], []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 min-h-[80vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Réseau & Partenaires</h2>
                    <p className="text-muted-foreground">Gérez vos relations contractuelles et vos approvisionnements.</p>
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex items-center space-x-1 border-b border-border pb-0 shrink-0 mb-4 mt-2">
                {[
                    { id: 'fournisseurs', label: 'Fournisseurs' },
                    { id: 'sous_traitants', label: 'Sous-traitants' },
                    { id: 'banques', label: 'Banques' },
                    { id: 'clients', label: 'Clients' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setMainTab(tab.id); setSubTab('liste_globale'); }}
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors ${
                            mainTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub Tabs Navigation */}
            <div className="flex items-center space-x-6 border-b border-border/30 mb-6 shrink-0">
                {mainTab === 'fournisseurs' && (
                    <>
                        <button onClick={() => setSubTab('liste_globale')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'liste_globale' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Liste Globale</button>
                        <button onClick={() => setSubTab('contrats_brousse')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'contrats_brousse' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Contrats Produits Brousse</button>
                        <button onClick={() => setSubTab('zone_production')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'zone_production' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Zone de production</button>
                    </>
                )}
                {mainTab === 'sous_traitants' && (
                    <>
                        <button onClick={() => setSubTab('liste_globale')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'liste_globale' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Liste Globale</button>
                        <button onClick={() => setSubTab('contrats_sous_traitance')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'contrats_sous_traitance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Contrats Sous-traitance</button>
                    </>
                )}
                {mainTab === 'banques' && (
                    <>
                        <button onClick={() => setSubTab('liste_globale')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'liste_globale' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Liste Globale</button>
                        <button onClick={() => setSubTab('parametres_nantissement')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'parametres_nantissement' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Paramètres Nantissement</button>
                    </>
                )}
                {mainTab === 'clients' && (
                    <>
                        <button onClick={() => setSubTab('liste_globale')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'liste_globale' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Liste Globale</button>
                        <button onClick={() => setSubTab('contrats_commercialisation')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'contrats_commercialisation' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'}`}>Contrats Commercialisation</button>
                    </>
                )}
            </div>

            {/* TAB CONTENT: SUPPLIERS */}
            {mainTab === 'fournisseurs' && subTab === 'liste_globale' && (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-full">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
                            ))}
                        </div>
                    ) : partners.length === 0 ? (
                        <div className="py-16 text-center">
                            <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground font-medium">Aucun fournisseur actif.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                <tr>
                                    <th className="px-6 py-4">Fournisseur</th>
                                    <th className="px-6 py-4">Localisation</th>
                                    <th className="px-6 py-4">Type & Culture</th>
                                    <th className="px-6 py-4">Depuis</th>
                                    <th className="px-6 py-4 text-center">Statut</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {partners.map((p) => (
                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-emerald-700 text-white flex items-center justify-center font-bold shadow-md shadow-blue-900/10">
                                                    {p.target.nom.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.target.nom}</p>
                                                    <p className="text-xs text-muted-foreground">{p.target.id.substring(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted">
                                                {p.target.region || 'Côte d\'Ivoire'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium text-foreground capitalize">{p.target.type}</span>
                                                <span className="text-xs text-muted-foreground">{p.target.culture_principale || 'Cacao'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.status === 'PENDING' ? (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                    EN ATTENTE
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    ACTIF
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {p.status === 'PENDING' ? (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2"
                                                    onClick={() => openConfirmModal('CANCEL', p)}
                                                    disabled={actionLoading === p.id}
                                                >
                                                    {actionLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : "Retirer"}
                                                </Button>
                                            ) : (
                                                <div className="flex gap-2 justify-end">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs px-2 gap-1"
                                                        onClick={() => handleOpenContractForm(p)}
                                                        disabled={actionLoading === p.id}
                                                    >
                                                        <FileText size={12} />
                                                        Nouveau Contrat
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2"
                                                        onClick={() => openConfirmModal('REVOKE', p)}
                                                        disabled={actionLoading === p.id}
                                                    >
                                                        {actionLoading === p.id ? <Loader2 size={12} className="animate-spin" /> : "Révoquer"}
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <button
                        onClick={() => setModalOpen(true)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground border-t border-border transition-colors group mt-0 bg-transparent"
                    >
                        <Plus size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                        <span>{getAddButtonText()}</span>
                    </button>
                </div>
            )}

            {/* TAB CONTENT: CONTRACTS */}
            {mainTab === 'fournisseurs' && subTab === 'contrats_brousse' && (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-full">
                    {loadingContracts ? (
                        <div className="p-8 space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
                            ))}
                        </div>
                    ) : contracts.length === 0 ? (
                        <div className="py-16 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground font-medium">Aucun contrat d'achat trouvé.</p>
                            <p className="text-muted-foreground text-xs mt-1">Créez des contrats avec vos fournisseurs pour suivre les volumes.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 whitespace-nowrap">Référence</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Fournisseur</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Statut / Programme</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Volume (Kg)</th>
                                    <th className="px-6 py-4 whitespace-nowrap text-center">Progression</th>
                                    <th className="px-6 py-4 whitespace-nowrap text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {contracts.map((c) => {
                                    const progress = c.volume_total_kg > 0 ? (c.volume_livre_kg / c.volume_total_kg) * 100 : 0;
                                    const isCompleted = progress >= 100;

                                    return (
                                        <tr key={c.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4">
                                                <span className="font-mono font-medium text-foreground group-hover:text-primary transition-colors block">
                                                    {c.reference_interne}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{c.campaign}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                        {c.seller?.nom?.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-foreground">{c.seller?.nom || 'Inconnu'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 align-start">
                                                    <Badge className={`w-fit ${
                                                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                        c.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                        c.status === 'FULFILLED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                        c.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-200' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {c.status === 'DRAFT' ? 'BROUILLON' : c.status}
                                                    </Badge>
                                                    {c.sustainability_program && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 w-fit">
                                                            <Building2 size={10} />
                                                            {c.sustainability_program}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-muted-foreground">
                                                <span className="text-foreground font-semibold">{(c.volume_livre_kg || 0).toLocaleString()}</span>
                                                <span className="text-xs text-muted-foreground/70 mx-1">/</span>
                                                <span>{(c.volume_total_kg || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-24 bg-muted border border-border rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono font-medium">{Math.round(progress)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {c.status === 'DRAFT' ? (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                                            onClick={() => handleOpenFinalizeModal(c)}
                                                            disabled={actionLoading === c.id}
                                                        >
                                                            {actionLoading === c.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                                            Finaliser
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            {c.document_contrat_url ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 w-8 p-0 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                                                                    onClick={() => window.open(c.document_contrat_url, '_blank')}
                                                                    title="Voir le contrat"
                                                                >
                                                                    <FileText size={14} />
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">Aucun doc</span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* TAB CONTENT: MAP */}
            {mainTab === 'fournisseurs' && subTab === 'zone_production' && (
                <div className="relative flex-1 bg-muted/20 border border-border/50 rounded-xl overflow-hidden min-h-[500px]">
                    {loadingMap ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {/* Stats Card */}
                            {/* Stats Card */}
                            <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200 rounded-xl p-3 w-56 animate-in slide-in-from-right-4 duration-500">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                    <MapIcon size={14} className="text-primary" />
                                    Zone de Production
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                        <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Producteurs</p>
                                        <p className="text-lg font-bold text-blue-900 leading-tight">{productionData.stats.producers}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                        <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">Parcelles</p>
                                        <p className="text-lg font-bold text-emerald-900 leading-tight">{productionData.stats.parcels}</p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-1">
                                    <Info size={12} />
                                    Données des fournisseurs sous contrat.
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="absolute bottom-6 left-4 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 max-w-[200px] text-xs">
                                <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">Légende</h4>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-amber-600 opacity-60 border border-amber-600 rounded-sm"></div>
                                        <span>Cacao</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-600 opacity-60 border border-green-600 rounded-sm"></div>
                                        <span>Hévéa</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-600 opacity-60 border border-red-600 rounded-sm"></div>
                                        <span>Anacarde</span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
                                        <div className="w-4 h-4 bg-green-500/10 border-2 border-green-500 border-dashed rounded-sm"></div>
                                        <span>Aire Protégée</span>
                                    </div>
                                </div>
                            </div>

                            {/* Map */}
                            <MapContainer
                                key={`${mainTab}-${subTab}`} // Force remount on tab change
                                center={[6.8, -5.3]} // Centered on Cote d'Ivoire approx
                                zoom={7}
                                style={{ height: '600px', width: '100%', zIndex: 0 }}
                                className="z-0"
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {/* Protected Areas Layer */}
                                {protectedAreas && (
                                    <GeoJSON
                                        data={protectedAreas}
                                        style={{
                                            color: "#22c55e",
                                            weight: 2,
                                            fillColor: "#22c55e",
                                            fillOpacity: 0.1,
                                            dashArray: "5, 5",
                                        }}
                                        onEachFeature={(feature, layer) => {
                                            const name = feature.properties?.NOM || feature.properties?.nom || "Aire Protégée";
                                            layer.bindPopup(`<p class="font-bold text-green-600">${name}</p>`);
                                        }}
                                    />
                                )}

                                {/* Zoom Handler to track zoom level */}
                                <ZoomHandler setZoomLevel={setZoomLevel} />

                                <ScaleControl position="bottomright" imperial={false} />

                                {/* Parcel Polygons or Aggregated Clusters based on Zoom */}
                                {(() => {
                                    // At low zoom (zoomed out): aggregate by producer and show count
                                    if (zoomLevel < 10) {
                                        // Group polygons by producer
                                        const producerGroups = {};
                                        productionData.polygons.forEach(poly => {
                                            const producerId = poly.producer_id || 'unknown';
                                            if (!producerGroups[producerId]) {
                                                producerGroups[producerId] = {
                                                    producer_name: poly.producer_name,
                                                    culture: poly.culture,
                                                    polygons: [],
                                                    totalArea: 0
                                                };
                                            }
                                            producerGroups[producerId].polygons.push(poly);
                                            producerGroups[producerId].totalArea += (poly.area_hectares || 0);
                                        });

                                        // Render one marker per producer with count
                                        return Object.entries(producerGroups).map(([producerId, group]) => {
                                            // Calculate average centroid for the group
                                            let avgLat = 0, avgLng = 0, validCount = 0;

                                            group.polygons.forEach(poly => {
                                                try {
                                                    let coords = [];
                                                    if (poly.geometry.type === 'Polygon') {
                                                        coords = poly.geometry.coordinates[0].map(c => [c[1], c[0]]);
                                                    } else if (poly.geometry.type === 'MultiPolygon') {
                                                        coords = poly.geometry.coordinates[0][0].map(c => [c[1], c[0]]);
                                                    }

                                                    if (coords.length > 0) {
                                                        const latSum = coords.reduce((sum, c) => sum + c[0], 0);
                                                        const lngSum = coords.reduce((sum, c) => sum + c[1], 0);
                                                        avgLat += latSum / coords.length;
                                                        avgLng += lngSum / coords.length;
                                                        validCount++;
                                                    }
                                                } catch (e) {
                                                    // Skip invalid geometry
                                                }
                                            });

                                            if (validCount === 0) return null;

                                            const center = [avgLat / validCount, avgLng / validCount];
                                            const count = group.polygons.length;

                                            const baseRadius = 14;
                                            const scaledRadius = Math.min(baseRadius + count * 3, 32);

                                            return (
                                                <CircleMarker
                                                    key={`cluster-${producerId}`}
                                                    center={center}
                                                    radius={scaledRadius}
                                                    pathOptions={{
                                                        color: getPolygonColor(group.culture),
                                                        fillColor: getPolygonColor(group.culture),
                                                        fillOpacity: 0.65,
                                                        weight: 3
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="text-sm">
                                                            <p className="font-bold">{group.producer_name}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {count} parcelle{count > 1 ? 's' : ''}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Surface totale: {group.totalArea.toFixed(2)} ha
                                                            </p>
                                                            <p className="text-xs text-blue-600 mt-2">
                                                                Zoomez pour voir les polygones
                                                            </p>
                                                        </div>
                                                    </Popup>

                                                </CircleMarker>
                                            );
                                        }).concat(
                                            // Add count labels using Leaflet Marker with DivIcon
                                            Object.entries(producerGroups).map(([producerId, group]) => {
                                                let avgLat = 0, avgLng = 0, validCount = 0;

                                                group.polygons.forEach(poly => {
                                                    try {
                                                        let coords = [];
                                                        if (poly.geometry.type === 'Polygon') {
                                                            coords = poly.geometry.coordinates[0].map(c => [c[1], c[0]]);
                                                        } else if (poly.geometry.type === 'MultiPolygon') {
                                                            coords = poly.geometry.coordinates[0][0].map(c => [c[1], c[0]]);
                                                        }
                                                        if (coords.length > 0) {
                                                            const latSum = coords.reduce((sum, c) => sum + c[0], 0);
                                                            const lngSum = coords.reduce((sum, c) => sum + c[1], 0);
                                                            avgLat += latSum / coords.length;
                                                            avgLng += lngSum / coords.length;
                                                            validCount++;
                                                        }
                                                    } catch (e) { }
                                                });

                                                if (validCount === 0) return null;
                                                const center = [avgLat / validCount, avgLng / validCount];
                                                const count = group.polygons.length;

                                                // Calculate dynamic sizes based on circle radius
                                                const baseRadius = 14;
                                                const scaledRadius = Math.min(baseRadius + count * 3, 32);

                                                // Badge size scales with circle (60-80% of circle diameter)
                                                const badgeSize = Math.max(Math.floor(scaledRadius * 1.4), 24);

                                                // Font size scales with badge (35-45% of badge size)
                                                const fontSize = Math.max(Math.floor(badgeSize * 0.4), 11);

                                                // Border thickness scales with badge
                                                const borderWidth = Math.max(Math.floor(badgeSize * 0.1), 2);

                                                return (
                                                    <Marker
                                                        key={`count-${producerId}`}
                                                        position={center}
                                                        icon={L.divIcon({
                                                            className: 'custom-cluster-count',
                                                            html: `<div style="background: white; border-radius: 50%; width: ${badgeSize}px; height: ${badgeSize}px; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; font-weight: bold; color: ${getPolygonColor(group.culture)}; border: ${borderWidth}px solid ${getPolygonColor(group.culture)}; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${count}</div>`,
                                                            iconSize: [badgeSize, badgeSize],
                                                            iconAnchor: [badgeSize / 2, badgeSize / 2]
                                                        })}
                                                    />
                                                );
                                            })
                                        );
                                    } else {
                                        // At high zoom (zoomed in): show individual polygons
                                        return productionData.polygons.map((poly) => {
                                            let coords = [];

                                            try {
                                                if (poly.geometry.type === 'Polygon') {
                                                    coords = poly.geometry.coordinates[0].map(c => [c[1], c[0]]);
                                                } else if (poly.geometry.type === 'MultiPolygon') {
                                                    coords = poly.geometry.coordinates[0][0].map(c => [c[1], c[0]]);
                                                }
                                            } catch (e) {
                                                return null;
                                            }

                                            if (coords.length === 0) return null;

                                            return (
                                                <Polygon
                                                    key={poly.id}
                                                    positions={coords}
                                                    pathOptions={{
                                                        color: getPolygonColor(poly.culture),
                                                        fillOpacity: 0.4,
                                                        weight: 1
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="text-sm">
                                                            <p className="font-bold">{poly.producer_name || 'Producteur Inconnu'}</p>
                                                            <p className="text-muted-foreground text-xs mb-1">
                                                                Fournisseur: {partners.find(p => p.target.id === poly.supplier_id)?.target.nom || 'N/A'}
                                                            </p>
                                                            <Badge variant="outline" className="text-xs h-5 px-1">
                                                                {poly.culture || 'Culture Inconnue'}
                                                            </Badge>
                                                            <p className="mt-2 text-xs">
                                                                Surface: {(poly.area_hectares || 0).toFixed(2)} ha
                                                            </p>
                                                        </div>
                                                    </Popup>
                                                </Polygon>
                                            );
                                        });
                                    }
                                })()}
                            </MapContainer>
                        </>
                    )}
                </div>
            )}

            {/* TAB CONTENT: BANQUES (Liste Globale) */}
            {mainTab === 'banques' && subTab === 'liste_globale' && (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-full flex flex-col mt-4">
                    <DataGrid
                        data={banks}
                        columns={bankColumns}
                        title=""
                        hideToolbar={false}
                        className="m-0"
                        renderAppendixRow={({ table }) => {
                            if (!isAddingBank) return (
                                <tr>
                                    <td colSpan={bankColumns.length + 1} className="p-0 border-t border-border/40">
                                        <button
                                            onClick={() => setIsAddingBank(true)}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors group mt-0 bg-transparent text-left"
                                        >
                                            <Plus size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                                            <span>Ajouter une Banque</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                            return (
                                <tr 
                                    ref={bankInlineRowRef} 
                                    onKeyDown={e => { if(e.key==='Enter') handleSaveBankRow(); if(e.key==='Escape') {setIsAddingBank(false); setNewBankData({})}}}
                                    className="border-t-2 border-primary/40 bg-primary/5 animate-in slide-in-from-bottom-2 duration-200 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]"
                                >
                                    {table.getVisibleLeafColumns().filter(col => col.id !== 'select').map(column => {
                                        let content = null;
                                        switch (column.id) {
                                            case 'logo_url':
                                                content = <input type="file" accept="image/*" onChange={e => setNewBankData({...newBankData, logoTemplateFile: e.target.files[0]})} className="w-full text-[10px] pt-1" />;
                                                break;
                                            case 'nom_banque':
                                                content = <input autoFocus type="text" placeholder="Nom..." value={newBankData.nom_banque || ''} onChange={e => setNewBankData({...newBankData, nom_banque: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'type_compte':
                                                content = (
                                                    <select value={newBankData.type_compte || 'COURANT'} onChange={e => setNewBankData({...newBankData, type_compte: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary">
                                                        <option value="COURANT">COURANT</option>
                                                        <option value="SEQUESTRE">SEQUESTRE</option>
                                                        <option value="DEBOURS">DEBOURS</option>
                                                    </select>
                                                );
                                                break;
                                            case 'iban':
                                                content = <input type="text" placeholder="IBAN..." value={newBankData.iban || ''} onChange={e => setNewBankData({...newBankData, iban: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'code_bic':
                                                content = <input type="text" placeholder="BIC..." value={newBankData.code_bic || ''} onChange={e => setNewBankData({...newBankData, code_bic: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'contact_gestionnaire':
                                                content = <input type="text" placeholder="Contact..." value={newBankData.contact_gestionnaire || ''} onChange={e => setNewBankData({...newBankData, contact_gestionnaire: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'nom_gestionnaire':
                                                content = <input type="text" placeholder="Gestionnaire..." value={newBankData.nom_gestionnaire || ''} onChange={e => setNewBankData({...newBankData, nom_gestionnaire: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'email_gestionnaire':
                                                content = <input type="email" placeholder="Email..." value={newBankData.email_gestionnaire || ''} onChange={e => setNewBankData({...newBankData, email_gestionnaire: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                        }
                                        return <td key={column.id} className="p-2 align-middle border-r border-border/40 last:border-r-0">{content}</td>;
                                    })}
                                </tr>
                            );
                        }}
                    />
                    {isAddingBank && (
                        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-t border-border mt-0 shrink-0">
                            <span className="text-[10px] text-muted-foreground mr-auto">Appuyez sur Entrée pour enregistrer, Échap pour annuler</span>
                            <button onClick={() => {setIsAddingBank(false); setNewBankData({})}} className="px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-background border border-input rounded hover:bg-muted transition-colors text-foreground shadow-sm">Annuler</button>
                            <button onClick={handleSaveBankRow} disabled={bankSaving || !newBankData.nom_banque} className="px-4 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2">
                                {bankSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: BANQUES (Paramètres Nantissement) */}
            {mainTab === 'banques' && subTab === 'parametres_nantissement' && (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-full flex flex-col mt-4 overflow-x-auto">
                    <DataGrid
                        data={pledges}
                        columns={pledgeColumns}
                        title=""
                        hideToolbar={false}
                        className="m-0"
                        renderAppendixRow={({ table }) => {
                            if (!isAddingPledge) return (
                                <tr>
                                    <td colSpan={pledgeColumns.length + 1} className="p-0 border-t border-border/40">
                                        <button
                                            onClick={() => setIsAddingPledge(true)}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors group mt-0 bg-transparent text-left"
                                        >
                                            <Plus size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                                            <span>Ajouter un Paramètre de Nantissement</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                            return (
                                <tr 
                                    ref={pledgeInlineRowRef} 
                                    onKeyDown={e => { if(e.key==='Enter') handleSavePledgeRow(); if(e.key==='Escape') {setIsAddingPledge(false); setNewPledgeData({ type_application: 'REVERSEMENT' })}}}
                                    className="border-t-2 border-primary/40 bg-primary/5 animate-in slide-in-from-bottom-2 duration-200 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]"
                                >
                                    {table.getVisibleLeafColumns().filter(col => col.id !== 'select').map(column => {
                                        let content = null;
                                        switch (column.id) {
                                            case 'bank_id':
                                                content = (
                                                    <select autoFocus value={newPledgeData.bank_id || ''} onChange={e => setNewPledgeData({...newPledgeData, bank_id: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded">
                                                        <option value="">Sélectionner</option>
                                                        {banks.map(b => <option key={b.id} value={b.id}>{b.nom_banque}</option>)}
                                                    </select>
                                                );
                                                break;
                                            case 'campagne_id':
                                                content = (
                                                    <select value={newPledgeData.campagne_id || ''} onChange={e => setNewPledgeData({...newPledgeData, campagne_id: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded">
                                                        <option value="">Sélectionner</option>
                                                        {campaignsList.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                                                    </select>
                                                );
                                                break;
                                            case 'type_application':
                                                content = (
                                                    <select value={newPledgeData.type_application || 'REVERSEMENT'} onChange={e => setNewPledgeData({...newPledgeData, type_application: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded">
                                                        <option value="REVERSEMENT">REVERSEMENT</option>
                                                        <option value="SOUTIENT">SOUTIENT</option>
                                                    </select>
                                                );
                                                break;
                                            case 'taux_prix_contrat':
                                                content = <input type="number" step="0.01" placeholder="%" value={newPledgeData.taux_prix_contrat || ''} onChange={e => setNewPledgeData({...newPledgeData, taux_prix_contrat: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'taux_prix_marche':
                                                content = <input type="number" step="0.01" placeholder="%" value={newPledgeData.taux_prix_marche || ''} onChange={e => setNewPledgeData({...newPledgeData, taux_prix_marche: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'taux_drd_finance':
                                                content = <input type="number" step="0.01" placeholder="%" value={newPledgeData.taux_drd_finance || ''} onChange={e => setNewPledgeData({...newPledgeData, taux_drd_finance: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'taux_valeurs_debours':
                                                content = <input type="number" step="0.01" placeholder="%" value={newPledgeData.taux_valeurs_debours || ''} onChange={e => setNewPledgeData({...newPledgeData, taux_valeurs_debours: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'taux_valeur_locaux_mag':
                                                content = <input type="number" step="0.01" placeholder="%" value={newPledgeData.taux_valeur_locaux_mag || ''} onChange={e => setNewPledgeData({...newPledgeData, taux_valeur_locaux_mag: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'taux_sequestre':
                                                content = <input type="number" step="0.01" placeholder="%" value={newPledgeData.taux_sequestre || ''} onChange={e => setNewPledgeData({...newPledgeData, taux_sequestre: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'prix_sequestre_kg':
                                                content = <input type="number" step="0.01" placeholder="Fcfa" value={newPledgeData.prix_sequestre_kg || ''} onChange={e => setNewPledgeData({...newPledgeData, prix_sequestre_kg: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                        }
                                        return <td key={column.id} className="p-1 align-middle border-r border-border/40 last:border-r-0">{content}</td>;
                                    })}
                                </tr>
                            );
                        }}
                    />
                    {isAddingPledge && (
                        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-t border-border mt-0 shrink-0">
                            <span className="text-[10px] text-muted-foreground mr-auto">Appuyez sur Entrée pour valider, Échap pour annuler</span>
                            <button onClick={() => {setIsAddingPledge(false); setNewPledgeData({ type_application: 'REVERSEMENT' })}} className="px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-background border border-input rounded hover:bg-muted transition-colors text-foreground shadow-sm">Annuler</button>
                            <button onClick={handleSavePledgeRow} disabled={pledgeSaving || !newPledgeData.bank_id || !newPledgeData.campagne_id} className="px-4 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2">
                                {pledgeSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: CLIENTS (Liste Globale) */}
            {mainTab === 'clients' && subTab === 'liste_globale' && (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-full flex flex-col mt-4">
                    <DataGrid
                        data={clients}
                        columns={clientColumns}
                        title=""
                        hideToolbar={false}
                        className="m-0"
                        renderAppendixRow={({ table }) => {
                            if (!isAddingClient) return (
                                <tr>
                                    <td colSpan={clientColumns.length + 1} className="p-0 border-t border-border/40">
                                        <button
                                            onClick={() => setIsAddingClient(true)}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors group mt-0 bg-transparent text-left"
                                        >
                                            <Plus size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                                            <span>Ajouter un Client</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                            return (
                                <tr 
                                    ref={clientInlineRowRef} 
                                    onKeyDown={e => { if(e.key==='Enter') handleSaveClientRow(); if(e.key==='Escape') {setIsAddingClient(false); setNewClientData({})}}}
                                    className="border-t-2 border-primary/40 bg-primary/5 animate-in slide-in-from-bottom-2 duration-200 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]"
                                >
                                    {table.getVisibleLeafColumns().filter(col => col.id !== 'select').map(column => {
                                        let content = null;
                                        switch (column.id) {
                                            case 'nom_client':
                                                content = <input autoFocus type="text" placeholder="Nom..." value={newClientData.nom_client || ''} onChange={e => setNewClientData({...newClientData, nom_client: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'id_rainforest':
                                                content = <input type="text" placeholder="RA ID..." value={newClientData.id_rainforest || ''} onChange={e => setNewClientData({...newClientData, id_rainforest: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'id_fairtrade':
                                                content = <input type="text" placeholder="FLO ID..." value={newClientData.id_fairtrade || ''} onChange={e => setNewClientData({...newClientData, id_fairtrade: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'contact_commercial':
                                                content = <input type="text" placeholder="Contact..." value={newClientData.contact_commercial || ''} onChange={e => setNewClientData({...newClientData, contact_commercial: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                            case 'adresse':
                                                content = <input type="text" placeholder="Adresse..." value={newClientData.adresse || ''} onChange={e => setNewClientData({...newClientData, adresse: e.target.value})} className="w-full h-8 px-2 text-xs bg-background border border-input rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary" />;
                                                break;
                                        }
                                        return <td key={column.id} className="p-2 align-middle border-r border-border/40 last:border-r-0">{content}</td>;
                                    })}
                                </tr>
                            );
                        }}
                    />
                    {isAddingClient && (
                        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-t border-border mt-0 shrink-0">
                            <span className="text-[10px] text-muted-foreground mr-auto">Appuyez sur Entrée pour enregistrer, Échap pour annuler</span>
                            <button onClick={() => {setIsAddingClient(false); setNewClientData({})}} className="px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-background border border-input rounded hover:bg-muted transition-colors text-foreground shadow-sm">Annuler</button>
                            <button onClick={handleSaveClientRow} disabled={clientSaving || !newClientData.nom_client} className="px-4 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2">
                                {clientSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: CLIENTS (Contrats Commercialisation) */}
            {mainTab === 'clients' && subTab === 'contrats_commercialisation' && (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-full flex flex-col mt-4 overflow-x-auto">
                    <DataGrid
                        data={exportContracts}
                        columns={exportContractColumns}
                        title=""
                        hideToolbar={false}
                        className="m-0"
                        renderAppendixRow={({ table }) => {
                            if (!isAddingExportContract) return (
                                <tr>
                                    <td colSpan={exportContractColumns.length + 1} className="p-0 border-t border-border/40">
                                        <button
                                            onClick={() => setIsAddingExportContract(true)}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors group mt-0 bg-transparent text-left"
                                        >
                                            <Plus size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                                            <span>Ajouter un Contrat Export</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                            return (
                                <tr 
                                    ref={exportContractInlineRowRef} 
                                    onKeyDown={e => { if(e.key==='Enter') handleSaveExportContractRow(); if(e.key==='Escape') {setIsAddingExportContract(false); setNewExportContractData({})}}}
                                    className="border-t-2 border-primary/40 bg-primary/5 animate-in slide-in-from-bottom-2 duration-200 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]"
                                >
                                    {table.getVisibleLeafColumns().filter(col => col.id !== 'select').map(column => {
                                        let content = null;
                                        switch (column.id) {
                                            case 'client_id':
                                                content = (
                                                    <select autoFocus value={newExportContractData.client_id || ''} onChange={e => setNewExportContractData({...newExportContractData, client_id: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded">
                                                        <option value="">Sélectionner</option>
                                                        {clients.map(c => <option key={c.id} value={c.id}>{c.nom_client}</option>)}
                                                    </select>
                                                );
                                                break;
                                            case 'numero_contrat':
                                                content = <input type="text" placeholder="Auto..." value={newExportContractData.numero_contrat || ''} onChange={e => setNewExportContractData({...newExportContractData, numero_contrat: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'prix_caf_deblocage':
                                                content = <input type="number" step="0.01" placeholder="Prix CAF" value={newExportContractData.prix_caf_deblocage || ''} onChange={e => setNewExportContractData({...newExportContractData, prix_caf_deblocage: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'drd':
                                                content = <input type="number" step="0.01" placeholder="DRD" value={newExportContractData.drd || ''} onChange={e => setNewExportContractData({...newExportContractData, drd: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'taux_reversement':
                                                content = <input type="number" step="0.01" placeholder="%" value={newExportContractData.taux_reversement || ''} onChange={e => setNewExportContractData({...newExportContractData, taux_reversement: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" />;
                                                break;
                                            case 'taux_soutien':
                                                content = <input type="number" step="0.01" placeholder="%" value={newExportContractData.taux_soutien || ''} onChange={e => setNewExportContractData({...newExportContractData, taux_soutien: e.target.value})} className="w-full h-8 px-1 text-[10px] bg-background border border-input rounded" disabled={newExportContractData.taux_reversement > 0} />;
                                                break;
                                            case 'statut_contrat':
                                                let statut = 'INCONNU';
                                                const rev = newExportContractData.taux_reversement ? parseFloat(newExportContractData.taux_reversement) : null;
                                                const sou = newExportContractData.taux_soutien ? parseFloat(newExportContractData.taux_soutien) : null;
                                                if ((!rev || rev === 0) && sou !== null && sou < 0) statut = 'SOUTIEN';
                                                else if (rev !== null && rev > 0) statut = 'REVERSEMENT';
                                                
                                                content = <span className="text-[10px] ml-2 font-medium">{statut === 'INCONNU' ? '-' : <Badge variant={statut === 'REVERSEMENT' ? 'success' : 'outline'}>{statut}</Badge>}</span>;
                                                break;
                                        }
                                        return <td key={column.id} className="p-1 align-middle border-r border-border/40 last:border-r-0">{content}</td>;
                                    })}
                                </tr>
                            );
                        }}
                    />
                    {isAddingExportContract && (
                        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-t border-border mt-0 shrink-0">
                            <span className="text-[10px] text-muted-foreground mr-auto">Appuyez sur Entrée pour valider, Échap pour annuler</span>
                            <button onClick={() => {setIsAddingExportContract(false); setNewExportContractData({})}} className="px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-background border border-input rounded hover:bg-muted transition-colors text-foreground shadow-sm">Annuler</button>
                            <button onClick={handleSaveExportContractRow} disabled={exportContractSaving || !newExportContractData.client_id} className="px-4 py-1.5 text-[10px] font-semibold tracking-wide uppercase bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2">
                                {exportContractSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* PLACEHOLDERS FOR UNIMPLEMENTED TABS */}
            {!(
                (mainTab === 'fournisseurs' && ['liste_globale', 'contrats_brousse', 'zone_production'].includes(subTab)) ||
                (mainTab === 'banques' && ['liste_globale', 'parametres_nantissement'].includes(subTab)) ||
                (mainTab === 'clients' && ['liste_globale', 'contrats_commercialisation'].includes(subTab))
            ) && (
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-full flex flex-col mt-4">
                    <div className="flex-1 py-16 text-center flex flex-col items-center justify-center">
                        <Info className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground font-medium">Contenu en cours de développement.</p>
                        <p className="text-muted-foreground text-sm mt-1">
                            L'onglet "{subTab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}" pour les "{mainTab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}" sera bientôt disponible.
                        </p>
                    </div>

                    {subTab === 'liste_globale' && (
                        <button
                            onClick={() => setModalOpen(true)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground border-t border-border transition-colors group mt-0 bg-transparent"
                        >
                            <Plus size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                            <span>{getAddButtonText()}</span>
                        </button>
                    )}
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={step === 1 ? "Rechercher un Partenaire" : `Demande de partenariat : ${selectedPartner?.nom}`}
                description={step === 1 ? "Trouvez une coopérative pour initier un partenariat." : "Confirmez votre volonté de vous connecter à cette coopérative."}
            >
                {/* ... (Modal content reused from previous version) ... */}
                <div className="space-y-6 pt-2">
                    {/* STATUS MESSAGES */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm flex items-center gap-2">
                            <CheckCircle size={16} /> {success}
                        </div>
                    )}

                    {/* STEP 1: SEARCH */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                                <Search className="w-5 h-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-semibold mb-1">Rechercher un fournisseur</p>
                                    <p className="text-blue-700/80">
                                        Recherchez par <strong>nom, sigle ou identifiant</strong> pour trouver une coopérative existante dans le réseau Origin.e.
                                    </p>
                                </div>
                            </div>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input
                                    placeholder="Nom de la coopérative..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-muted/30"
                                    autoFocus
                                />
                                <Button type="submit" disabled={searchLoading || !searchTerm}>
                                    {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                    <span className="sr-only">Rechercher</span>
                                </Button>
                            </form>

                            {/* Results List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {searchResults.map(res => (
                                    <div key={res.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {res.nom.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm">{res.nom}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {res.fournisseur_officiel_id ? <span className="font-mono text-[10px] mr-1 border border-border/50 bg-muted/30 px-1 rounded">{res.fournisseur_officiel_id}</span> : ''}
                                                {res.region} • {res.type}
                                            </p>
                                        </div>
                                        {res.is_already_partner ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">Connecté</Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelectPartner(res)}
                                                className="shrink-0 gap-1.5 shadow-sm text-xs h-8 pl-3 pr-2.5 transition-transform hover:scale-105"
                                            >
                                                Sélectionner
                                                <ChevronRight size={14} className="opacity-70" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONTRACT FORM */}
                    {step === 2 && selectedPartner && (
                        <div className="space-y-6">
                            {/* Performance Card (only for registered) */}
                            {selectedPartner.is_registered ? (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Building2 size={64} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-blue-900">{selectedPartner.nom}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="bg-white/50 border-blue-200 text-blue-800 shrink-0 text-xs">
                                                        {selectedPartner.type}
                                                    </Badge>
                                                    <span className="text-xs text-blue-700/80">{selectedPartner.region || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {loadingStats ? (
                                            <div className="flex gap-4">
                                                <div className="h-16 flex-1 bg-white/40 rounded-lg animate-pulse"></div>
                                                <div className="h-16 flex-1 bg-white/40 rounded-lg animate-pulse"></div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white">
                                                    <div className="flex items-center gap-2 text-blue-800 mb-1">
                                                        <Users size={16} />
                                                        <span className="text-xs font-semibold uppercase tracking-wider">Producteurs</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-blue-950">
                                                        {partnerStats ? partnerStats.total_producteurs : '---'}
                                                    </p>
                                                    <p className="text-[10px] text-blue-600/70 mt-0.5">Vérifiés sur le réseau</p>
                                                </div>
                                                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white">
                                                    <div className="flex items-center gap-2 text-emerald-700 mb-1">
                                                        <MapIcon size={16} />
                                                        <span className="text-xs font-semibold uppercase tracking-wider">Parcelles</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-emerald-900">
                                                        {partnerStats ? partnerStats.total_parcelles : '---'}
                                                    </p>
                                                    <p className="text-[10px] text-emerald-600/70 mt-0.5">Cartographiées</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-amber-900">{selectedPartner.nom}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="bg-white/50 border-amber-300 text-amber-800 shrink-0 text-xs shadow-sm">
                                                        {selectedPartner.type}
                                                    </Badge>
                                                    <span className="text-xs text-amber-700/80 font-medium">Non inscrit sur Origin.e-Vault</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Fairtrade Certification Status */}
                            {loadingFairtrade ? (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center gap-3 mt-4">
                                    <Loader2 className="animate-spin text-gray-400" size={18} />
                                    <span className="text-sm text-gray-500">Vérification de la certification Fairtrade (Flocert) en cours...</span>
                                </div>
                            ) : fairtradeStatus ? (
                                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex items-start gap-3 mt-4">
                                    <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                                    <div>
                                        <p className="text-sm font-medium text-emerald-900">Certification Fairtrade (Flocert)</p>
                                        <p className="text-xs text-emerald-800 mt-1">
                                            Statut : <strong>{fairtradeStatus.status}</strong><br />
                                            FLO ID : {fairtradeStatus.floid}<br />
                                            Nom enregistré : {fairtradeStatus.name}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-start gap-3 mt-4">
                                    <AlertCircle className="text-gray-400 mt-0.5 shrink-0" size={18} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Certification Fairtrade (Flocert)</p>
                                        <p className="text-xs text-gray-500 mt-1">Aucune certification Fairtrade trouvée pour "{selectedPartner?.nom}" ou coopérative introuvable dans la base publique.</p>
                                    </div>
                                </div>
                            )}

                            <div className={`p-4 rounded-lg border flex items-start gap-3 mt-4 ${selectedPartner.is_registered ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                <Info className={`${selectedPartner.is_registered ? 'text-blue-600' : 'text-amber-600'} mt-0.5 shrink-0`} size={18} />
                                <div>
                                    <p className={`text-sm font-medium ${selectedPartner.is_registered ? 'text-blue-900' : 'text-amber-900'}`}>À propos de la demande</p>
                                    <p className={`text-xs mt-1 ${selectedPartner.is_registered ? 'text-blue-700' : 'text-amber-700'}`}>
                                        {selectedPartner.is_registered ? (
                                            <>En envoyant cette demande, vous invitez <strong>{selectedPartner.nom}</strong> à rejoindre votre réseau. La coopérative devra valider cette demande de son côté avant qu'un contrat puisse être formellement établi.</>
                                        ) : (
                                            <>Cette coopérative n'est pas encore inscrite sur le système. Invitez-la à s'enregistrer sur <strong>Origin.e-Vault</strong> pour pouvoir collaborer et établir des contrats formels.</>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
                                <Button variant="ghost" onClick={() => setStep(1)} disabled={submitLoading}>Retour</Button>
                                {selectedPartner.is_registered ? (
                                    <Button onClick={handleSubmitPartnershipRequest} disabled={submitLoading}>
                                        {submitLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Handshake size={16} className="mr-2" />}
                                        Envoyer la demande
                                    </Button>
                                ) : (
                                    <Button onClick={() => handleCloseModal()} className="bg-amber-600 hover:bg-amber-700 text-white">
                                        Terminer
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* CONFIRMATION MODAL */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                title={confirmModal.actionType === 'CANCEL' ? "Retirer la demande" : "Révoquer le partenariat"}
                description=""
            >
                <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-100 text-red-900">
                        <AlertTriangle className="w-6 h-6 shrink-0 text-red-600 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-800">
                                Êtes-vous sûr de vouloir {confirmModal.actionType === 'CANCEL' ? "retirer" : "révoquer"} {confirmModal.actionType === 'CANCEL' ? "cette demande avec" : "le partenariat avec"} <span className="font-bold">{confirmModal.partnerName}</span> ?
                            </p>
                            <p className="text-sm text-red-700/80 mt-1">
                                {confirmModal.actionType === 'CANCEL' 
                                    ? "La coopérative ne verra plus votre invitation. Vous pourrez toujours en envoyer une nouvelle plus tard." 
                                    : "Cette action est irréversible. Toutes les relations liées à ce fournisseur seront considérées comme inactives, sauf s'il y a des contrats en cours d'exécution."}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
                        <Button 
                            variant="ghost" 
                            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                            disabled={actionLoading === confirmModal.relationshipId}
                        >
                            Annuler
                        </Button>
                        <Button 
                            className="bg-red-600 hover:bg-red-700 text-white" 
                            onClick={handleConfirmAction} 
                            disabled={actionLoading === confirmModal.relationshipId}
                        >
                            {actionLoading === confirmModal.relationshipId ? (
                                <Loader2 size={16} className="animate-spin mr-2" /> 
                            ) : null}
                            Confirmer
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* CONTRACT FORM MODAL */}
            <Modal
                isOpen={contractFormModal.isOpen}
                onClose={() => setContractFormModal({ ...contractFormModal, isOpen: false })}
                title={`Nouveau Contrat : ${contractFormModal.partnerName}`}
                description="Définissez les termes du contrat d'achat produit brousse."
            >
                <form onSubmit={handleSubmitContract} className="space-y-5 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 flex items-start gap-2">
                            <CheckCircle size={16} className="mt-0.5 shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* DRAFT / ACTIVE Toggle */}
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Type de contrat</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setContractCreateMode('DRAFT')}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${
                                    contractCreateMode === 'DRAFT'
                                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm ring-2 ring-amber-200'
                                        : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                                }`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className="font-semibold">Brouillon</span>
                                    <span className="text-[10px] opacity-70">Pré-accord, finalisé en fin de campagne</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setContractCreateMode('ACTIVE')}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${
                                    contractCreateMode === 'ACTIVE'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm ring-2 ring-emerald-200'
                                        : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                                }`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className="font-semibold">Contrat actif</span>
                                    <span className="text-[10px] opacity-70">Contrat définitif avec volumes confirmés</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Section 1: Informations générales */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-3 flex items-center gap-2"><FileText size={14} /> Informations générales</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Référence interne *</label>
                                <Input value={contractData.reference_interne} onChange={e => setContractData({...contractData, reference_interne: e.target.value})} placeholder="Ex: CTR-2024-001" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Date de signature *</label>
                                <Input type="date" value={contractData.date_signature} onChange={e => setContractData({...contractData, date_signature: e.target.value})} required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Campagne *</label>
                                {loadingCampaigns ? (
                                    <div className="text-sm text-muted-foreground flex items-center gap-2 h-10"><Loader2 size={16} className="animate-spin" /> Chargement...</div>
                                ) : campaignsList.length === 0 ? (
                                    <div className="text-sm text-red-600 font-medium h-10 flex items-center">Aucune campagne. Créez-en une dans Paramètres.</div>
                                ) : (
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={contractData.campagne_id || ''} onChange={e => { const sel = campaignsList.find(c => c.id === e.target.value); setContractData({...contractData, campagne_id: e.target.value, campaign: sel ? sel.libelle : ''}); }} required>
                                        {campaignsList.map(c => (<option key={c.id} value={c.id}>{c.libelle} {c.status === 'ACTIVE' ? '(Active)' : ''}</option>))}
                                    </select>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Qualité requise</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={contractData.quality_required} onChange={e => setContractData({...contractData, quality_required: e.target.value})}>
                                    <option value="G1">Grade 1 (G1)</option>
                                    <option value="G2">Grade 2 (G2)</option>
                                    <option value="Hors Standard">Hors Standard</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Période de livraison & Volumes */}
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2"><Calendar size={14} /> Période & Volumes</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Début livraison</label>
                                <Input type="date" value={contractData.periode_livraison_start} onChange={e => setContractData({...contractData, periode_livraison_start: e.target.value})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Fin livraison</label>
                                <Input type="date" value={contractData.periode_livraison_end} onChange={e => setContractData({...contractData, periode_livraison_end: e.target.value})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Volume total (Kg) *</label>
                                <Input type="number" value={contractData.volume_total_kg} onChange={e => setContractData({...contractData, volume_total_kg: e.target.value})} placeholder="Ex: 50000" min="0" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Tolérance volume (%)</label>
                                <Input type="number" value={contractData.volume_tolerance_pct} onChange={e => setContractData({...contractData, volume_tolerance_pct: e.target.value})} placeholder="5" min="0" max="100" />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Conditions commerciales */}
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-2"><Building2 size={14} /> Conditions commerciales</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Incoterm</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={contractData.incoterm} onChange={e => setContractData({...contractData, incoterm: e.target.value})}>
                                    <option value="DAP">DAP (Rendu au lieu de destination)</option>
                                    <option value="FOB">FOB (Franco à bord)</option>
                                    <option value="CIF">CIF (Coût, assurance, fret)</option>
                                    <option value="EXW">EXW (Départ usine)</option>
                                    <option value="FCA">FCA (Franco transporteur)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Devise</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={contractData.currency} onChange={e => setContractData({...contractData, currency: e.target.value})}>
                                    <option value="XOF">XOF (Franc CFA)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                    <option value="USD">USD (Dollar US)</option>
                                    <option value="GBP">GBP (Livre Sterling)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Prix unitaire / Kg</label>
                                <Input type="number" value={contractData.prix_unitaire_kg} onChange={e => setContractData({...contractData, prix_unitaire_kg: e.target.value})} placeholder="Ex: 1000" min="0" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Prix fixé / Kg</label>
                                <Input type="number" value={contractData.prix_fixe_kg} onChange={e => setContractData({...contractData, prix_fixe_kg: e.target.value})} placeholder="Ex: 900" min="0" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Prime certification / Kg</label>
                                <Input type="number" value={contractData.prime_certification} onChange={e => setContractData({...contractData, prime_certification: e.target.value})} placeholder="0" min="0" />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Durabilité & Traçabilité */}
                    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-700 mb-3 flex items-center gap-2"><TreeDeciduous size={14} /> Durabilité & Traçabilité</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Programme de durabilité</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={contractData.sustainability_program} onChange={e => setContractData({...contractData, sustainability_program: e.target.value})}>
                                    <option value="">-- Aucun --</option>
                                    <option value="Fairtrade">Fairtrade</option>
                                    <option value="Rainforest Alliance">Rainforest Alliance</option>
                                    <option value="RSPO">RSPO</option>
                                    <option value="Agriculture Biologique">Agriculture Biologique</option>
                                    <option value="Conventionnelle">Conventionnelle</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Niveau de traçabilité</label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={contractData.traceability_level} onChange={e => setContractData({...contractData, traceability_level: e.target.value})}>
                                    <option value="">-- Non spécifié --</option>
                                    <option value="Identité Préservée">Identité Préservée</option>
                                    <option value="Ségrégation">Ségrégation</option>
                                    <option value="Mass Balance">Mass Balance</option>
                                    <option value="EUDR Compliance">EUDR Compliance</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
                        <Button type="button" variant="ghost" onClick={() => setContractFormModal({ ...contractFormModal, isOpen: false })} disabled={submitLoading}>
                            Annuler
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={submitLoading || campaignsList.length === 0}
                            className={contractCreateMode === 'DRAFT' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                        >
                            {submitLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                            {contractCreateMode === 'DRAFT' ? 'Enregistrer le brouillon' : 'Créer le contrat actif'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* FINALIZE CONTRACT MODAL */}
            <Modal
                isOpen={finalizeModal.isOpen}
                onClose={() => setFinalizeModal({ isOpen: false, contract: null, volume_total_kg: '', date_signature: '' })}
                title="Finaliser le contrat"
                description={`Activez le contrat ${finalizeModal.contract?.reference_interne || ''} avec les volumes réels.`}
            >
                <div className="space-y-4 pt-4">
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-amber-900">Ce brouillon va devenir un contrat actif.</p>
                                <p className="text-xs text-amber-700/80 mt-1">Ajustez le volume total au volume réellement livré par la coopérative avant de confirmer.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Référence</span>
                                <p className="font-mono font-semibold text-foreground">{finalizeModal.contract?.reference_interne}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Fournisseur</span>
                                <p className="font-semibold text-foreground">{finalizeModal.contract?.seller?.nom || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Campagne</span>
                                <p className="font-medium text-foreground">{finalizeModal.contract?.campaign}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Volume estimé (brouillon)</span>
                                <p className="font-mono text-foreground">{(finalizeModal.contract?.volume_total_kg || 0).toLocaleString()} Kg</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Volume total réel (Kg) *</label>
                            <Input 
                                type="number" 
                                value={finalizeModal.volume_total_kg} 
                                onChange={e => setFinalizeModal({...finalizeModal, volume_total_kg: e.target.value})} 
                                placeholder="Volume réel en kg" 
                                min="0" 
                                required 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Date de signature *</label>
                            <Input 
                                type="date" 
                                value={finalizeModal.date_signature} 
                                onChange={e => setFinalizeModal({...finalizeModal, date_signature: e.target.value})} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setFinalizeModal({ isOpen: false, contract: null, volume_total_kg: '', date_signature: '' })}
                            disabled={actionLoading}
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={handleFinalizeContract} 
                            disabled={actionLoading || !finalizeModal.volume_total_kg}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                            Activer le contrat
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PartnersPage;
