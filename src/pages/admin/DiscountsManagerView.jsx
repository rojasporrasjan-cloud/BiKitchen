import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgePercent, Package, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ActiveDiscountsView from './ActiveDiscountsView';
import PackDiscountsView from './PackDiscountsView';
import IndividualDiscountsView from './IndividualDiscountsView';

export default function DiscountsManagerView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'active';
    
    const handleTabChange = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    const tabs = [
        { id: 'active', label: 'Resumen General', icon: BadgePercent },
        { id: 'packs', label: 'Packs', icon: Package },
        { id: 'individuals', label: 'Platos Individuales', icon: Utensils },
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* Tab Navigation */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                                isActive
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'active' && <ActiveDiscountsView />}
                        {activeTab === 'packs' && <PackDiscountsView />}
                        {activeTab === 'individuals' && <IndividualDiscountsView />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
