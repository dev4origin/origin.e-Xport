import { Building, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, MapPin, Phone, Save, Shield, User, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataGrid } from '../../components/shared/DataGrid';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { profileService } from '../../services/profileService';
import { cccAutoFetchService } from '../../services/cccAutoFetchService';
import { useAuth } from '../../contexts/AuthContext';

export const ProfilePage = () => {
    const { profile: authProfile, profileLoading: authProfileLoading, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('org'); // 'org' | 'staff' | 'ccc'
    const [staffList, setStaffList] = useState([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(false);
    const [isEditingOrg, setIsEditingOrg] = useState(false);
    const [orgForm, setOrgForm] = useState({});

    // CCC Credentials state
    const [cccForm, setCccForm] = useState({
        browser_user: '',
        browser_pass: '',
        login_user: '',
        login_pass: '',
    });
    const [cccLoading, setCccLoading] = useState(false);
    const [cccTestLoading, setCccTestLoading] = useState(false);
    const [cccSaveSuccess, setCccSaveSuccess] = useState(false);
    const [cccTestResult, setCccTestResult] = useState(null);
    const [cccError, setCccError] = useState('');
    const [showPasswords, setShowPasswords] = useState({ browser: false, login: false });

    // Sync orgForm with authProfile
    useEffect(() => {
        if (authProfile?.organization) {
            setOrgForm(authProfile.organization);
        }
    }, [authProfile]);

    // Load staff list
    useEffect(() => {
        const loadStaff = async () => {
            if (!authProfile?.organization?.id) return;
            try {
                setIsLoadingStaff(true);
                const staff = await profileService.getOrgStaff(authProfile.organization.id);
                setStaffList(staff);
            } catch (err) {
                console.error('Error loading staff:', err);
            } finally {
                setIsLoadingStaff(false);
            }
        };

        if (activeTab === 'staff') {
            loadStaff();
        }
    }, [activeTab, authProfile?.organization?.id]);

    const loadCCCCredentials = async () => {
        if (!authProfile?.organization?.id) return;
        try {
            setCccLoading(true);
            const creds = await profileService.getCCCCredentials(authProfile.organization.id);
            if (creds) {
                setCccForm({
                    browser_user: creds.browser_user || '',
                    browser_pass: creds.browser_pass || '',
                    login_user: creds.login_user || '',
                    login_pass: creds.login_pass || '',
                });
            }
        } catch (error) {
            console.error('Error loading CCC credentials:', error);
        } finally {
            setCccLoading(false);
        }
    };

    // Load CCC creds when switching to the tab
    useEffect(() => {
        if (activeTab === 'ccc' && authProfile?.organization?.id) {
            loadCCCCredentials();
        }
    }, [activeTab, authProfile?.organization?.id]);

    const handleOrgUpdate = async (e) => {
        e.preventDefault();
        try {
            await profileService.updateOrganization(authProfile.organization.id, orgForm);
            setIsEditingOrg(false);
            // The AuthContext will catch the update if we want, 
            // but for now let's just update local state if needed or let the user refresh.
            // Ideally notify user.
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    const handleSaveCCCCredentials = async (e) => {
        if (e) e.preventDefault();
        setCccError('');
        setCccSaveSuccess(false);
        setCccTestResult(null);

        console.log('[ProfilePage] Attempting to save CCC credentials...');

        if (!cccForm.browser_user || !cccForm.browser_pass || !cccForm.login_user || !cccForm.login_pass) {
            setCccError('Tous les champs sont obligatoires.');
            return;
        }

        const orgId = authProfile?.organization?.id;
        if (!orgId) {
            setCccError('Identifiant d\'organisation manquant. Veuillez rafraîchir la page.');
            return;
        }

        try {
            setCccLoading(true);
            await profileService.saveCCCCredentials(orgId, cccForm);
            setCccSaveSuccess(true);
            setTimeout(() => setCccSaveSuccess(false), 5000);
        } catch (error) {
            console.error('[ProfilePage] CCC save failed:', error);
            setCccError(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
        } finally {
            setCccLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setCccError('');
        setCccSaveSuccess(false);
        setCccTestResult(null);

        if (!cccForm.browser_user || !cccForm.browser_pass || !cccForm.login_user || !cccForm.login_pass) {
            setCccError('Remplissez tous les champs avant de tester.');
            return;
        }

        try {
            setCccTestLoading(true);
            const result = await cccAutoFetchService.testConnection(cccForm);
            setCccTestResult(result);
            if (!result.success) {
                setCccError(result.error || 'La connexion a échoué.');
            }
        } catch (error) {
            console.error('[ProfilePage] Connection test failed:', error);
            setCccError(`Erreur de connexion : ${error.message}`);
        } finally {
            setCccTestLoading(false);
        }
    };

    const staffColumns = [
        { accessorKey: 'name', header: 'Nom Complet' },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'department', header: 'Département' },
        { 
            accessorKey: 'role', 
            header: 'Rôle',
            cell: ({ getValue }) => <Badge variant="secondary">{getValue()}</Badge>
        },
        { 
            accessorKey: 'joinedAt', 
            header: 'Depuis le',
            cell: ({ getValue }) => new Date(getValue()).toLocaleDateString()
        }
    ];

    if (authLoading || (authProfileLoading && !authProfile)) return (
        <div className="flex flex-col h-64 items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-muted-foreground animate-pulse">Chargement de votre profil...</div>
        </div>
    );
    if (!authProfile) return <div className="p-8 text-destructive border border-destructive/20 rounded-lg bg-destructive/5">Impossible de charger le profil. Veuillez vérifier votre connexion ou contacter un administrateur.</div>;

    const { user, organization, roleInOrg } = authProfile;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <User size={40} />
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-2xl font-bold">{user.first_name || 'Utilisateur'} {user.last_name || ''}</h1>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                        <Mail size={16} /> {user.email}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                        <Badge>{roleInOrg || 'Membre'}</Badge>
                        <Badge variant="outline">{organization?.nom || 'Aucune Organisation'}</Badge>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('org')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'org' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Building size={18} />
                    Mon Organisation
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'staff' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Users size={18} />
                    Gestion du Staff
                </button>
                <button
                    onClick={() => setActiveTab('ccc')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'ccc' 
                        ? 'border-amber-600 text-amber-600' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Shield size={18} />
                    Accès CCC
                </button>
            </div>

            {/* Tab Content: Organization */}
            {activeTab === 'org' && organization && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Informations de la Structure</h3>
                        {!isEditingOrg && (roleInOrg === 'directeur' || roleInOrg === 'OWNER') && (
                            <Button variant="outline" onClick={() => setIsEditingOrg(true)}>Modifier</Button>
                        )}
                    </div>

                    {isEditingOrg ? (
                        <form onSubmit={handleOrgUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nom de la structure</label>
                                    <Input 
                                        value={orgForm.nom || ''} 
                                        onChange={e => setOrgForm({...orgForm, nom: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email Professionnel</label>
                                    <Input 
                                        value={orgForm.email_professionnel || ''} 
                                        onChange={e => setOrgForm({...orgForm, email_professionnel: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Téléphone</label>
                                    <Input 
                                        value={orgForm.telephone_representant_legal || ''} 
                                        onChange={e => setOrgForm({...orgForm, telephone_representant_legal: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Adresse / Siège</label>
                                    <Input 
                                        value={orgForm.coord_gps_siege || ''} 
                                        onChange={e => setOrgForm({...orgForm, coord_gps_siege: e.target.value})} 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsEditingOrg(false)}>Annuler</Button>
                                <Button type="submit" className="gap-2"><Save size={16}/> Enregistrer</Button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase">Structure</label>
                                <p className="font-medium text-lg">{organization.nom}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase">Type</label>
                                <p className="font-medium">{organization.type}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Mail size={12}/> Email</label>
                                <p className="font-medium">{organization.email_professionnel || 'Non renseigné'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase flex items-center gap-1"><Phone size={12}/> Téléphone</label>
                                <p className="font-medium">{organization.telephone_representant_legal || 'Non renseigné'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase flex items-center gap-1"><MapPin size={12}/> Siège</label>
                                <p className="font-medium">{organization.coord_gps_siege || 'Non renseigné'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase">Contribuable</label>
                                <p className="font-medium font-mono bg-muted inline-block px-2 py-1 rounded text-sm">{organization.code_contribuable || 'N/A'}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content: Staff */}
            {activeTab === 'staff' && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-semibold">Membres de l'équipe</h3>
                            <p className="text-sm text-muted-foreground">Gérez les accès et les rôles de vos collaborateurs.</p>
                        </div>
                        <Button className="gap-2"><Users size={16}/> Ajouter un membre</Button>
                    </div>

                    <DataGrid 
                        data={staffList} 
                        columns={staffColumns} 
                        title="Liste du Personnel"
                    />
                </div>
            )}

            {/* Tab Content: CCC Credentials */}
            {activeTab === 'ccc' && (
                <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                                <Shield size={28} className="text-amber-700" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-amber-900">Connexion SAIGIC — Conseil Café Cacao</h3>
                                <p className="text-sm text-amber-700/80 mt-1">
                                    Configurez vos identifiants pour permettre la synchronisation automatique des volumes acceptés depuis la plateforme du Conseil Café Cacao (
                                    <a href="https://www.conseilcafecacao.ci:8088" target="_blank" rel="noopener noreferrer" className="underline font-medium">conseilcafecacao.ci</a>).
                                </p>
                                <p className="text-xs text-amber-600/70 mt-2">
                                    🔒 Vos identifiants sont chiffrés et ne sont utilisés que pour la récupération des données de réception.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveCCCCredentials} className="space-y-6">
                        {/* Browser Auth Card */}
                        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <KeyRound size={18} className="text-blue-700" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">Accès fenêtre du navigateur</h4>
                                    <p className="text-xs text-muted-foreground">Authentification HTTP — première requête vers le portail SAIGIC</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Identifiant</label>
                                    <Input
                                        id="ccc-browser-user"
                                        value={cccForm.browser_user}
                                        onChange={e => setCccForm({ ...cccForm, browser_user: e.target.value })}
                                        placeholder="Ex: ASONDO"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Mot de passe</label>
                                    <div className="relative">
                                        <Input
                                            id="ccc-browser-pass"
                                            type={showPasswords.browser ? 'text' : 'password'}
                                            value={cccForm.browser_pass}
                                            onChange={e => setCccForm({ ...cccForm, browser_pass: e.target.value })}
                                            placeholder="••••••••"
                                            autoComplete="off"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(p => ({ ...p, browser: !p.browser }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPasswords.browser ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Application Login Card */}
                        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <User size={18} className="text-emerald-700" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">Accès Login applicatif</h4>
                                    <p className="text-xs text-muted-foreground">Connexion au formulaire « Se connecter » du portail SAIGIC</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Identifiant (Login)</label>
                                    <Input
                                        id="ccc-login-user"
                                        value={cccForm.login_user}
                                        onChange={e => setCccForm({ ...cccForm, login_user: e.target.value })}
                                        placeholder="Ex: ASONDO"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Mot de passe</label>
                                    <div className="relative">
                                        <Input
                                            id="ccc-login-pass"
                                            type={showPasswords.login ? 'text' : 'password'}
                                            value={cccForm.login_pass}
                                            onChange={e => setCccForm({ ...cccForm, login_pass: e.target.value })}
                                            placeholder="••••••••"
                                            autoComplete="off"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(p => ({ ...p, login: !p.login }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPasswords.login ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error / Success Messages */}
                        {cccError && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                {cccError}
                            </div>
                        )}
                        {cccSaveSuccess && (
                            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                Identifiants CCC enregistrés avec succès !
                            </div>
                        )}
                        {cccTestResult?.success && (
                            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200 flex items-center gap-2">
                                <Zap size={16} />
                                Connexion au portail SAIGIC réussie ! Vous pouvez maintenant enregistrer.
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={cccTestLoading || cccLoading}
                                className="gap-2"
                            >
                                {cccTestLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                Tester la connexion
                            </Button>
                            <Button
                                type="submit"
                                disabled={cccLoading || cccTestLoading}
                                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 min-w-[200px]"
                            >
                                {cccLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Enregistrer les identifiants
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
