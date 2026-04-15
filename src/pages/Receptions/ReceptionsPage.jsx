import { useState } from 'react';
import { Truck, FileCheck, ClipboardList } from 'lucide-react';
import { CCCImportsView } from '../Imports/CCCImportsView';
import { DeclaredVolumesView } from './DeclaredVolumesView';

export const ReceptionsPage = () => {
    const [activeTab, setActiveTab] = useState('declared');

    return (
        <div className="space-y-6 pt-2 h-full flex flex-col">
            <div className="flex items-center gap-3 px-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Truck size={32} className="text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Réceptions & Stocks</h2>
                    <p className="text-muted-foreground">Gestion des entrées de matières premières (Déclaré vs Validé CCC)</p>
                </div>
            </div>

            {/* Tabs Header */}
            <div className="px-4 border-b flex items-center gap-6">
                <button
                    onClick={() => setActiveTab('declared')}
                    className={`pb-3 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'declared'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <ClipboardList size={18} />
                    Volumes Déclarés (Fournisseurs)
                </button>

                <button
                    onClick={() => setActiveTab('accepted')}
                    className={`pb-3 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'accepted'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <FileCheck size={18} />
                    Volumes Acceptés (CCC)
                </button>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'declared' && <DeclaredVolumesView />}
                {activeTab === 'accepted' && <CCCImportsView />}
            </div>
        </div>
    );
};
