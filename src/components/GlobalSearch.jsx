import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Package, Utensils, Tag, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PACKS_DATA } from '../data/packsData';
import { individualesData } from '../data/individualesData';

export default function GlobalSearch({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Datos de búsqueda combinados
    const searchData = useMemo(() => {
        const items = [];

        // Packs - extraer de PACKS_DATA
        Object.entries(PACKS_DATA).forEach(([key, category]) => {
            if (category.packs) {
                category.packs.forEach((pack, index) => {
                    items.push({
                        id: `pack-${key}-${index}`,
                        type: 'pack',
                        name: pack.name,
                        description: pack.desc || category.title,
                        price: pack.weekly,
                        path: `/packs`,
                        icon: Package,
                        keywords: [pack.name, 'pack', 'semanal', 'comidas', category.title]
                    });
                });
            }
        });

        // Individuales
        individualesData.forEach(item => {
            items.push({
                id: `ind-${item.id}`,
                type: 'individual',
                name: item.name,
                description: item.description?.substring(0, 60) + '...' || '',
                price: item.price,
                path: '/individuales',
                icon: Utensils,
                keywords: [item.name, 'individual', 'plato', item.category, ...(item.tags || [])]
            });
        });

        // Páginas estáticas
        const pages = [
            { name: 'Promociones', path: '/promociones', icon: Tag, keywords: ['ofertas', 'descuentos', 'cupones'] },
            { name: 'Cómo Funciona', path: '/como-funciona', icon: ArrowRight, keywords: ['proceso', 'pedido', 'entrega'] },
            { name: 'Preguntas Frecuentes', path: '/faq', icon: ArrowRight, keywords: ['faq', 'ayuda', 'dudas'] },
            { name: 'Mi Cuenta', path: '/mi-cuenta', icon: ArrowRight, keywords: ['cuenta', 'perfil', 'pedidos'] },
            { name: 'Programa de Fidelidad', path: '/fidelidad', icon: Tag, keywords: ['puntos', 'recompensas'] },
            { name: 'Gift Cards', path: '/gift-cards', icon: Tag, keywords: ['regalo', 'tarjeta', 'gift'] },
        ];

        pages.forEach(page => {
            items.push({
                id: `page-${page.path}`,
                type: 'page',
                name: page.name,
                description: 'Ir a página',
                path: page.path,
                icon: page.icon,
                keywords: [page.name.toLowerCase(), ...page.keywords]
            });
        });

        return items;
    }, []);

    // Filtrar resultados
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 0);
        
        const filtered = searchData.filter(item => {
            const searchText = [
                item.name,
                item.description,
                ...item.keywords
            ].join(' ').toLowerCase();

            return searchTerms.every(term => searchText.includes(term));
        });

        // Ordenar por relevancia (nombre coincide primero)
        filtered.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
            const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            return 0;
        });

        setResults(filtered.slice(0, 8));
        setSelectedIndex(0);
    }, [query, searchData]);

    // Focus en input al abrir
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        navigate(results[selectedIndex].path);
                        onClose();
                        setQuery('');
                    }
                    break;
                case 'Escape':
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    const handleSelect = (item) => {
        navigate(item.path);
        onClose();
        setQuery('');
    };

    const formatPrice = (price) => {
        if (!price) return '';
        return `₡${price.toLocaleString('es-CR')}`;
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'pack': return 'Pack';
            case 'individual': return 'Plato';
            case 'page': return 'Página';
            default: return '';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'pack': return 'bg-bikitchen-orange text-white';
            case 'individual': return 'bg-green-500 text-white';
            case 'page': return 'bg-gray-500 text-white';
            default: return 'bg-gray-200';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
                    />

                    {/* Search Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[201] px-4"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center gap-3 p-4 border-b">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Buscar packs, platos, páginas..."
                                    className="flex-1 text-lg outline-none placeholder:text-gray-400"
                                    autoComplete="off"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery('')}
                                        className="p-1 hover:bg-gray-100 rounded-full"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                                <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-gray-100 rounded text-gray-500">
                                    ESC
                                </kbd>
                            </div>

                            {/* Results */}
                            <div className="max-h-[60vh] overflow-y-auto">
                                {query && results.length === 0 && (
                                    <div className="p-8 text-center text-gray-500">
                                        <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>No se encontraron resultados para "{query}"</p>
                                    </div>
                                )}

                                {results.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelect(item)}
                                            className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                                                index === selectedIndex 
                                                    ? 'bg-bikitchen-orange/10' 
                                                    : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                index === selectedIndex ? 'bg-bikitchen-orange text-white' : 'bg-gray-100'
                                            }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate">{item.name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(item.type)}`}>
                                                        {getTypeLabel(item.type)}
                                                    </span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-sm text-gray-500 truncate">{item.description}</p>
                                                )}
                                            </div>
                                            {item.price && (
                                                <span className="text-bikitchen-orange font-semibold">
                                                    {formatPrice(item.price)}
                                                </span>
                                            )}
                                            <ArrowRight className={`w-4 h-4 transition-opacity ${
                                                index === selectedIndex ? 'opacity-100' : 'opacity-0'
                                            }`} />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer hint */}
                            {results.length > 0 && (
                                <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-center gap-4">
                                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border">↑↓</kbd> navegar</span>
                                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border">Enter</kbd> seleccionar</span>
                                </div>
                            )}

                            {/* Quick links when empty */}
                            {!query && (
                                <div className="p-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Accesos rápidos</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Packs', 'Promociones', 'FAQ'].map(term => (
                                            <button
                                                key={term}
                                                onClick={() => setQuery(term)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                                            >
                                                {term}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
