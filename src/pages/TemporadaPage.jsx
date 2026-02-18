import React, { useState, useEffect } from 'react';
import { usePromoBanner } from '../hooks/usePromoBanner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import { Snowflake, Gift, Calendar, Users, Check, X, ChevronRight, Heart, Sparkles, ShoppingCart, Plus, Camera } from 'lucide-react';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { useCart } from '../context/CartContext';
import { getActivePromotions } from '../utils/firestorePromotions';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { cleanFirebaseUrl } from '../utils/firebaseUrl';
// import { RatingDisplay } from '../components/ReviewSystem'; // Deshabilitado temporalmente

const fadeUpVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

// NOTA: Estos datos de temporada se gestionan desde el admin
// Se mantienen aquí como fallback inicial hasta que se carguen desde Firebase
const MENUS_TEMPORADA_DEFAULT = [
    {
        id: 'pack-1-navidad',
        nombre: 'Pack 1 - Pierna de Cerdo',
        descripcion: 'Pierna de cerdo en salsa de piña + 2 guarniciones',
        precio: 11000,
        precioPersona: 11000,
        minimoPersonas: 2,
        proteina: '250 gramos de proteína',
        imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop&q=80',
        detalles: 'Incluye 250g de proteína y 2 guarniciones a elegir',
        guarniciones: {
            debiles: ['Vegetales salteados en mantequilla', 'Vainicas salteadas con tocineta', 'Ensalada de repollo morada navideña'],
            fuertes: ['Arroz navideño', 'Puré de papa cremoso con tocineta y queso', 'Puré de camote', 'Minipapas salteadas', 'Ensalada de papa con manzana']
        }
    },
    {
        id: 'pack-2-navidad',
        nombre: 'Pack 2 - Filet de Pollo',
        descripcion: 'Filet de pollo en salsa de manzana + 2 guarniciones',
        precio: 11000,
        precioPersona: 11000,
        minimoPersonas: 2,
        proteina: '250 gramos de proteína',
        imagen: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&h=400&fit=crop&q=80',
        detalles: 'Incluye 250g de proteína y 2 guarniciones a elegir',
        guarniciones: {
            debiles: ['Vegetales salteados en mantequilla', 'Vainicas salteadas con tocineta', 'Ensalada de repollo morada navideña'],
            fuertes: ['Arroz navideño', 'Puré de papa cremoso con tocineta y queso', 'Puré de camote', 'Minipapas salteadas', 'Ensalada de papa con manzana']
        }
    },
    {
        id: 'pack-3-navidad',
        nombre: 'Pack 3 - Cordon Bleu',
        descripcion: 'Cordon bleu de pollo en salsa blanca + 2 guarniciones',
        precio: 11500,
        precioPersona: 11500,
        minimoPersonas: 2,
        proteina: '250 gramos de proteína',
        imagen: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&h=400&fit=crop&q=80',
        detalles: 'Incluye 250g de proteína y 2 guarniciones a elegir',
        guarniciones: {
            debiles: ['Vegetales salteados en mantequilla', 'Vainicas salteadas con tocineta', 'Ensalada de repollo morada navideña'],
            fuertes: ['Arroz navideño', 'Puré de papa cremoso con tocineta y queso', 'Puré de camote', 'Minipapas salteadas', 'Ensalada de papa con manzana']
        }
    },
    {
        id: 'pack-4-navidad',
        nombre: 'Pack 4 - Lomo Relleno',
        descripcion: 'Lomo relleno de cerdo en salsa gravy + 2 guarniciones',
        precio: 14000,
        precioPersona: 14000,
        minimoPersonas: 2,
        proteina: '250 gramos de proteína',
        imagen: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&h=400&fit=crop&q=80',
        detalles: 'Incluye 250g de proteína y 2 guarniciones a elegir',
        guarniciones: {
            debiles: ['Vegetales salteados en mantequilla', 'Vainicas salteadas con tocineta', 'Ensalada de repollo morada navideña'],
            fuertes: ['Arroz navideño', 'Puré de papa cremoso con tocineta y queso', 'Puré de camote', 'Minipapas salteadas', 'Ensalada de papa con manzana']
        }
    },
    {
        id: 'pack-5-navidad',
        nombre: 'Pack 5 - Filet Mignon',
        descripcion: 'Filet mignon en salsa de hongos + 2 guarniciones',
        precio: 14500,
        precioPersona: 14500,
        minimoPersonas: 2,
        proteina: '250 gramos de proteína',
        imagen: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&h=400&fit=crop&q=80',
        detalles: 'Incluye 250g de proteína y 2 guarniciones a elegir',
        guarniciones: {
            debiles: ['Vegetales salteados en mantequilla', 'Vainicas salteadas con tocineta', 'Ensalada de repollo morada navideña'],
            fuertes: ['Arroz navideño', 'Puré de papa cremoso con tocineta y queso', 'Puré de camote', 'Minipapas salteadas', 'Ensalada de papa con manzana']
        }
    }
];

const PROTEINAS_DATA = [
    { id: 'prot-pierna', nombre: 'Pierna de cerdo', descripcion: 'Con salsa ciruela, piña o al vino', precio: 14000, imagen: 'https://images.unsplash.com/photo-1608835291093-394b0c943a75?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
    { id: 'prot-filet-pollo', nombre: 'Filet de pollo', descripcion: 'En salsa de manzana', precio: 14000, imagen: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
    { id: 'prot-cordon', nombre: 'Cordon bleu de pollo', descripcion: 'En salsa blanca', precio: 16000, imagen: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
    { id: 'prot-mignon', nombre: 'Filet mignon', descripcion: 'En salsa de hongos', precio: 22000, imagen: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
    { id: 'prot-lomo-cerdo', nombre: 'Lomo relleno de cerdo', descripcion: 'En salsa gravy', precio: 25000, imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' }
];

const POSTRES_DATA = [
    { id: 'postre-brownie', nombre: 'Brownie', descripcion: '4 porciones', precio: 5000, imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
    { id: 'postre-crocante', nombre: 'Crocante Alemán medio', descripcion: '4 porciones', precio: 7500, imagen: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
    { id: 'postre-cheesecake', nombre: 'Cheesecake Arándano', descripcion: '4 porciones', precio: 8000, imagen: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' },
    { id: 'postre-tresleches', nombre: 'Tres Leches de Rompope', descripcion: '4 porciones', precio: 8000, imagen: 'https://images.unsplash.com/photo-1563729768-8f896e9481a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' }
];

const GUARNICIONES_DATA = {
    debiles: [
        { id: 'guarn-vegetales', nombre: 'Vegetales salteados en mantequilla', precio: 7500, imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop&q=80' },
        { id: 'guarn-vainicas', nombre: 'Vainicas salteadas con tocineta', precio: 7500, imagen: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&h=400&fit=crop&q=80' },
        { id: 'guarn-repollo', nombre: 'Ensalada de repollo morada navideña', precio: 10500, imagen: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80' }
    ],
    fuertes: [
        { id: 'guarn-arroz', nombre: 'Arroz navideño', precio: 7500, imagen: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&h=400&fit=crop&q=80' },
        { id: 'guarn-pure-papa', nombre: 'Puré de papa cremoso con tocineta y queso', precio: 10500, imagen: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&h=400&fit=crop&q=80' },
        { id: 'guarn-pure-camote', nombre: 'Puré de camote', precio: 9500, imagen: 'https://images.unsplash.com/photo-1604085572504-a392ddf0d86a?w=600&h=400&fit=crop&q=80' },
        { id: 'guarn-minipapas', nombre: 'Minipapas salteadas', precio: 7500, imagen: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=600&h=400&fit=crop&q=80' },
        { id: 'guarn-ensalada-papa', nombre: 'Ensalada de papa con manzana', precio: 10500, imagen: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&h=400&fit=crop&q=80' }
    ]
};

const formatPrice = (price) => {
    if (!price && price !== 0) return '₡0';
    return `₡${price.toLocaleString('es-CR')}`;
};

const SimpleProductCard = ({ item, type, onAddToCart, onOpenDetails, canEditImage = false, onUploadImage }) => {
    const handleCardClick = () => {
        if (onOpenDetails) {
            onOpenDetails(item);
        }
    };

    const handleAddClick = (e) => {
        e.stopPropagation();
        onAddToCart(item);
    };

    return (
        <motion.div
            variants={fadeUpVariants}
            className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border-2 border-gray-100 hover:border-red-200 flex flex-col h-full cursor-pointer"
            onClick={handleCardClick}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {item.imagen && (
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
                    <motion.img
                        src={item.imagen}
                        alt={item.nombre}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />

                    {/* Badge de porciones para postres */}
                    {type === 'postres' && (
                        <motion.div
                            className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-rose-500 text-white px-3 py-2 rounded-full text-sm font-black shadow-xl"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                        >
                            4 Porciones
                        </motion.div>
                    )}

                    {/* Overlay con gradiente */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
                        initial={{ opacity: 0.6 }}
                        whileHover={{ opacity: 0.8 }}
                        transition={{ duration: 0.3 }}
                    />

                    {/* Botón de cambiar imagen - solo admin */}
                    {canEditImage && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (typeof onUploadImage === 'function') onUploadImage();
                            }}
                            className="absolute top-2 right-2 bg-white/85 border border-gray-200 rounded-full p-1.5 shadow-sm hover:shadow-md hover:bg-white transition-all flex items-center gap-1 text-[10px] text-gray-700"
                        >
                            <Camera size={12} />
                            <span className="hidden sm:inline">Foto</span>
                        </button>
                    )}
                </div>
            )}
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="font-black text-xl text-gray-900 mb-2 leading-tight">{item.nombre}</h3>
                {item.descripcion && <p className="text-sm text-gray-600 mb-4 line-clamp-2 font-medium">{item.descripcion}</p>}
                <div className="mt-auto flex items-center justify-between pt-4 border-t-2 border-red-100">
                    <span className="font-black text-2xl text-red-600">{formatPrice(item.precio)}</span>
                    <button
                        onClick={handleAddClick}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white hover:scale-110 active:scale-95 flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
                        title="Agregar al carrito"
                    >
                        <ShoppingCart size={18} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const MenuCard = ({ menu, onClick, canEditImage = false, onUploadImage }) => {
    return (
        <motion.div
            variants={fadeUpVariants}
            className={`bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer border-2 hover:border-red-300 ${menu.destacado
                ? 'border-red-300 ring-2 ring-red-500 ring-offset-4'
                : 'border-gray-100'
                }`}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={() => onClick(menu)}
        >
            {/* Imagen */}
            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
                <motion.img
                    src={menu.imagen}
                    alt={menu.titulo}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.15 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                />

                {/* Badge */}
                {menu.badge && (
                    <motion.div
                        className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-2 rounded-full text-sm font-black flex items-center gap-2 shadow-xl"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                    >
                        <Sparkles size={14} />
                        {menu.badge}
                    </motion.div>
                )}

                {/* Temporada badge */}
                <div className="absolute top-4 right-6 bg-green-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center justify-center gap-2">
                    <Snowflake size={14} className="flex-shrink-0" />
                    <span>Navidad 2025</span>
                </div>

                {/* Botón de cambiar imagen - solo admin */}
                {canEditImage && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (typeof onUploadImage === 'function') onUploadImage();
                        }}
                        className="absolute bottom-4 right-4 bg-white/85 border border-gray-200 rounded-full px-2 py-1 shadow-sm hover:shadow-md hover:bg-white transition-all flex items-center gap-1 text-[11px] text-gray-700"
                    >
                        <Camera size={13} />
                        <span className="hidden sm:inline">Foto</span>
                    </button>
                )}

                {/* Gradient overlay (no bloquea clicks) */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none"
                    initial={{ opacity: 0.7 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                />

                {/* Personas */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full">
                    <Users size={18} />
                    <span className="text-sm font-bold">{menu.personas}</span>
                </div>
            </div>

            {/* Contenido */}
            <div className="p-7">
                <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-red-600 transition-colors leading-tight">
                    {menu.titulo}
                </h3>
                <p className="text-gray-600 text-base mb-5 line-clamp-2 leading-relaxed">
                    {menu.descripcion}
                </p>

                {/* Precio */}
                <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-2xl border border-red-100">
                    <div>
                        <div className="text-3xl font-black text-red-600">
                            {formatPrice(menu.precio)}
                        </div>
                        <div className="text-sm text-gray-600 font-medium mt-1">
                            {formatPrice(menu.precioPersona || menu.precio)} por persona
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <button
                    className="w-full bg-gradient-to-r from-red-500 to-rose-500 text-white font-black py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                >
                    Ver detalles
                    <ChevronRight size={20} />
                </button>
            </div>
        </motion.div>
    );
};
const MenuModal = ({ menu, onClose }) => {
    // Mínimo de personas según el pack
    const [personas, setPersonas] = useState(menu?.minimoPersonas || 2);
    const [guarnicionDebil, setGuarnicionDebil] = useState('');
    const [guarnicionFuerte, setGuarnicionFuerte] = useState('');
    const { addToCart } = useCart() || {};
    const [added, setAdded] = useState(false);

    if (!menu) return null;

    // Calcular precio total basado en personas * precioPersona
    const precioTotal = personas * (menu.precioPersona || menu.precio || 0);

    const { getWhatsAppUrl } = useWhatsApp();

    // Mensaje optimizado para activar flujo de Pack Navideño en el bot
    // Keyword "Pack Navideño" activa el flujo navideño del bot
    const whatsappUrl = getWhatsAppUrl('Pack Navideño 🎄');

    const handleAddToCart = () => {
        // Validar que se hayan seleccionado ambas guarniciones si el pack las requiere
        if (menu.guarniciones && (!guarnicionDebil || !guarnicionFuerte)) {
            alert('Por favor selecciona una guarnición débil y una guarnición fuerte');
            return;
        }

        if (addToCart) {
            const itemName = menu.guarniciones
                ? `${menu.nombre} (${personas} personas) - ${guarnicionDebil} + ${guarnicionFuerte}`
                : `${menu.nombre} (${personas} personas)`;

            addToCart({
                id: `temporada-${menu.id}-${personas}p-${Date.now()}`,
                name: itemName,
                price: precioTotal,
                quantity: 1,
                isTemporada: true,
                personas: `${personas} personas`,
                guarniciones: menu.guarniciones ? { debil: guarnicionDebil, fuerte: guarnicionFuerte } : null,
                image: menu.imagen
            });
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-2xl p-0 max-h-[90vh]">
                <div className="flex flex-col h-full overflow-y-auto">
                    {/* Header con imagen */}
                    <div className="relative h-64 md:h-72 overflow-hidden flex-shrink-0 bg-gradient-to-br from-red-500 to-rose-600">
                        <img
                            src={menu.imagen}
                            alt={menu.titulo}
                            className="w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>

                        {/* Info sobre imagen */}
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-2 rounded-full text-sm font-black flex items-center gap-2 shadow-xl">
                                    <Snowflake size={14} />
                                    Menú de Temporada
                                </span>
                                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border border-white/30">
                                    <Users size={14} />
                                    Mínimo {menu.minimoPersonas} personas
                                </span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-2xl">{menu.nombre}</h2>
                        </div>

                        {/* Botón cerrar */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 border border-white/30"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Contenido */}
                    <div className="p-8 bg-white">
                        <p className="text-gray-700 text-lg mb-8 leading-relaxed">
                            {menu.descripcion}
                        </p>

                        {/* Qué incluye */}
                        <div className="mb-8">
                            {menu.incluye && menu.incluye.length > 0 && (
                                <>
                                    <h3 className="font-black text-gray-900 mb-5 flex items-center gap-3 text-xl">
                                        <span className="text-3xl">🍽️</span> ¿Qué incluye?
                                    </h3>
                                    <ul className="space-y-3 mb-6">
                                        {menu.incluye.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-4 text-gray-700 text-base">
                                                <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
                                                    <Check size={14} className="text-white" />
                                                </div>
                                                <span className="font-medium">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {menu.guarniciones && (
                                <div className="mt-6 bg-gradient-to-r from-red-50 to-rose-50 p-6 rounded-2xl border-2 border-red-100">
                                    <h4 className="font-black text-gray-900 mb-5 text-base uppercase tracking-wide">Selecciona tus guarniciones</h4>

                                    <div className="mb-6">
                                        <p className="text-base font-black text-red-600 mb-3 flex items-center gap-2">
                                            <span>🥬</span> Guarnición Débil (Elegir 1):
                                        </p>
                                        <div className="space-y-2">
                                            {menu.guarniciones.debiles.map((g, idx) => (
                                                <label
                                                    key={idx}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${guarnicionDebil === g
                                                        ? 'bg-red-100 border-red-500'
                                                        : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="guarnicion-debil"
                                                        value={g}
                                                        checked={guarnicionDebil === g}
                                                        onChange={(e) => setGuarnicionDebil(e.target.value)}
                                                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                                                    />
                                                    <span className="text-sm text-gray-700 font-medium">{g}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-base font-black text-rose-600 mb-3 flex items-center gap-2">
                                            <span>🍚</span> Guarnición Fuerte (Elegir 1):
                                        </p>
                                        <div className="space-y-2">
                                            {menu.guarniciones.fuertes.map((g, idx) => (
                                                <label
                                                    key={idx}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${guarnicionFuerte === g
                                                        ? 'bg-rose-100 border-rose-500'
                                                        : 'bg-white border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="guarnicion-fuerte"
                                                        value={g}
                                                        checked={guarnicionFuerte === g}
                                                        onChange={(e) => setGuarnicionFuerte(e.target.value)}
                                                        className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                                                    />
                                                    <span className="text-sm text-gray-700 font-medium">{g}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Precio y selector de personas */}
                        <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-3xl p-6 mb-8 border-2 border-red-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div>
                                    <span className="text-sm text-gray-600 font-bold uppercase tracking-wide">Precio total</span>
                                    <div className="text-4xl font-black text-red-600 my-2">
                                        {formatPrice(precioTotal)}
                                    </div>
                                    <span className="text-base text-gray-700 font-bold">
                                        {formatPrice(menu.precioPersona || menu.precio)} por persona
                                    </span>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-base font-black text-gray-900 flex items-center gap-2">
                                        <Users size={16} />
                                        ¿Para cuántas personas?
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setPersonas(Math.max(menu.minimoPersonas || 2, personas - 1))}
                                            disabled={personas <= (menu.minimoPersonas || 2)}
                                            className={`w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-xl font-black transition-all border-2 ${personas <= (menu.minimoPersonas || 2)
                                                ? 'text-gray-300 cursor-not-allowed border-gray-200'
                                                : 'text-red-600 hover:bg-red-50 border-red-200 hover:scale-110'
                                                }`}
                                        >
                                            -
                                        </button>
                                        <div className="flex flex-col items-center min-w-[70px]">
                                            <span className="font-black text-3xl text-red-600">{personas}</span>
                                            <span className="text-sm text-gray-600 font-bold">personas</span>
                                        </div>
                                        <button
                                            onClick={() => setPersonas(personas + 1)}
                                            className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-xl font-black text-red-600 hover:bg-red-50 transition-all border-2 border-red-200 hover:scale-110"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium">Mínimo {menu.minimoPersonas || 2} personas</span>
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleAddToCart}
                                className={`w-full flex items-center justify-center gap-3 font-black py-5 px-8 rounded-2xl transition-all duration-300 shadow-xl text-lg ${added
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-green-500/50'
                                    : 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:shadow-2xl hover:shadow-red-500/50 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                {added ? (
                                    <>
                                        <Check size={24} />
                                        ¡Agregado al carrito!
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={24} />
                                        Agregar al carrito
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 text-center mt-6 font-medium">
                            * Pedidos con al menos 48 horas de anticipación
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const SimpleProductModal = ({ product, type, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);

    if (!product) return null;

    const handleAdd = () => {
        if (onAddToCart) {
            onAddToCart(product, quantity);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-md p-0">
                <div className="overflow-hidden rounded-2xl bg-white">
                    {product.imagen && (
                        <div className="relative h-48 overflow-hidden">
                            <img
                                src={product.imagen}
                                alt={product.nombre}
                                className={
                                    type === 'postres'
                                        ? 'w-full h-full object-contain bg-black/5'
                                        : 'w-full h-full object-cover'
                                }
                            />
                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{product.nombre}</h2>
                        {product.descripcion && (
                            <p className="text-sm text-gray-600 mb-4">
                                {product.descripcion}
                            </p>
                        )}

                        <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs text-gray-500 block mb-1">Precio unitario</span>
                                <span className="text-2xl font-bold text-bikitchen-orange">{formatPrice(product.precio)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500 block mb-1">Total</span>
                                <span className="text-xl font-bold text-gray-900">{formatPrice(product.precio * quantity)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-6">
                            <span className="text-sm font-medium text-gray-700">Cantidad:</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-lg text-gray-700 hover:bg-gray-50"
                                >
                                    -
                                </button>
                                <span className="w-8 text-center font-bold text-lg text-gray-900">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-lg text-gray-700 hover:bg-gray-50"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleAdd}
                                className="flex-1 flex items-center justify-center gap-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold py-3 px-4 rounded-xl transition-colors"
                            >
                                <ShoppingCart size={18} />
                                Agregar al carrito
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function TemporadaPage() {
    const showPromoBanner = usePromoBanner();
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [menus, setMenus] = useState(MENUS_TEMPORADA_DEFAULT);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('packs'); // packs, proteinas, postres, guarniciones
    const { addToCart } = useCart() || {};
    const [notification, setNotification] = useState(null);
    const [selectedSimpleProduct, setSelectedSimpleProduct] = useState(null);
    const [selectedSimpleType, setSelectedSimpleType] = useState(null);
    const { isAdmin } = useAuth();

    // Mapas de imágenes personalizadas por tipo
    const [packImages, setPackImages] = useState({});      // { [id]: url }
    const [proteinaImages, setProteinaImages] = useState({});
    const [postreImages, setPostreImages] = useState({});
    const [guarnicionImages, setGuarnicionImages] = useState({});
    const [imagesLoaded, setImagesLoaded] = useState(false);

    // Cargar overrides de imágenes de temporada desde Firestore al montar
    useEffect(() => {
        const loadCustomImages = async () => {
            try {
                const colRef = collection(db, 'temporada_imagenes');
                const snap = await getDocs(colRef);
                const packs = {};
                const prots = {};
                const posts = {};

                const guarns = {};

                snap.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (!data || !data.imagenUrl || !data.tipo) return;
                    const id = docSnap.id;
                    // Limpiar token de Firebase Storage para evitar errores 412
                    const cleanUrl = cleanFirebaseUrl(data.imagenUrl);

                    // Temporarily disable custom image fetching due to Firebase 412 error
                    // if (data.tipo === 'pack') packs[id] = cleanUrl;
                    // if (data.tipo === 'proteina') prots[id] = cleanUrl;
                    // if (data.tipo === 'postre') posts[id] = cleanUrl;
                    // if (data.tipo === 'guarnicion') guarns[id] = cleanUrl;
                });

                setPackImages(packs);
                setProteinaImages(prots);
                setPostreImages(posts);
                setGuarnicionImages(guarns);
            } catch (error) {
                console.error('Error cargando imágenes de temporada:', error);
            } finally {
                setImagesLoaded(true);
            }
        };

        loadCustomImages();
    }, []);

    const handleSimpleAddToCart = (item, quantity = 1) => {
        if (addToCart) {
            addToCart({
                id: item.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
                name: item.nombre,
                price: item.precio,
                quantity: quantity,
                isTemporada: true,
                image: item.imagen || null
            });
            setNotification(`${item.nombre} agregado al carrito`);
            setTimeout(() => setNotification(null), 2000);
        }
    };

    // Esperar a que las imágenes estén cargadas antes de mostrar contenido
    useEffect(() => {
        if (imagesLoaded) {
            setLoading(false);
        }
    }, [imagesLoaded]);

    const optimizeToWebp = (file, maxSize = 1280) => new Promise((resolve, reject) => {
        try {
            const imgEl = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                imgEl.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const w = imgEl.naturalWidth || imgEl.width;
                    const h = imgEl.naturalHeight || imgEl.height;
                    const scale = Math.min(1, maxSize / Math.max(w, h));
                    const nw = Math.max(1, Math.round(w * scale));
                    const nh = Math.max(1, Math.round(h * scale));
                    canvas.width = nw; canvas.height = nh;
                    ctx.drawImage(imgEl, 0, 0, nw, nh);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob); else reject(new Error('No blob'));
                    }, 'image/webp', 0.8);
                };
                imgEl.onerror = reject;
                imgEl.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        } catch (err) { reject(err); }
    });

    // Handlers genéricos de subida de imagen por tipo
    const uploadImageForItem = async (item, tipo) => {
        if (!isAdmin || !isAdmin()) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            const toastId = `upload-${tipo}`;
            try {
                toast.loading('Subiendo imagen...', { id: toastId });
                const ts = Date.now();
                const fileName = `temporada/${tipo}/${item.id}_${ts}.webp`;
                const storageRef = ref(storage, fileName);
                const blob = await optimizeToWebp(file, 1280);
                await uploadBytes(storageRef, blob, { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' });
                const url = await getDownloadURL(storageRef);

                const legacyRef = doc(db, 'temporada_imagenes', item.id);
                const prevSnap = await getDoc(legacyRef);
                const prevPath = prevSnap.exists() ? (prevSnap.data()?.fileName || null) : null;

                await setDoc(legacyRef, {
                    imagenUrl: url,
                    fileName,
                    tipo,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                const confRef = doc(db, 'config', 'season_images');
                await setDoc(confRef, { updatedAt: new Date().toISOString() }, { merge: true });
                await updateDoc(confRef, { [`images.${item.id}`]: url, [`paths.${item.id}`]: fileName, [`types.${item.id}`]: tipo });

                // Actualizar estado local
                if (tipo === 'pack') {
                    setPackImages((prev) => ({ ...prev, [item.id]: url }));
                } else if (tipo === 'proteina') {
                    setProteinaImages((prev) => ({ ...prev, [item.id]: url }));
                } else if (tipo === 'postre') {
                    setPostreImages((prev) => ({ ...prev, [item.id]: url }));
                }

                if (prevPath && prevPath !== fileName) {
                    try { await deleteObject(ref(storage, prevPath)); } catch (_) { }
                }

                toast.success('Imagen actualizada correctamente', { id: toastId });
            } catch (error) {
                console.error('Error subiendo imagen de temporada:', error);
                toast.error('No se pudo subir la imagen. Intenta de nuevo.', { id: toastId });
            }
        };

        input.click();
    };

    const tabs = [
        { id: 'packs', label: 'Packs Completos', icon: '🎄' },
        { id: 'proteinas', label: 'Proteínas KG', icon: '🥩' },
        { id: 'guarniciones', label: 'Guarniciones', icon: '🥗' }
    ];

    // Mostrar loading mientras se cargan las imágenes
    if (loading) {
        return (
            <PageTransition>
                <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white relative">
                    <Navbar />
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Cargando menú de temporada...</p>
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white relative">
                <Navbar />

                {/* Notificación Flotante */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: 50, x: '-50%' }}
                            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-2"
                        >
                            <Check size={18} className="text-green-400" />
                            <span className="font-medium">{notification}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hero Section - Navideño */}
                <header
                    className="relative pt-28 pb-20 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-br from-red-500 via-rose-500 to-green-600"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + 112px)`
                            : undefined
                    }}
                >
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-green-400/30 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-yellow-400/10 via-white/10 to-transparent rounded-full blur-3xl"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                    {/* Decoraciones navideñas */}
                    <div className="absolute top-44 left-10 text-6xl opacity-30 animate-bounce hidden md:block">🎄</div>
                    <div className="absolute top-52 right-20 text-5xl opacity-30 animate-pulse hidden md:block">⭐</div>
                    <div className="absolute bottom-20 left-[15%] text-4xl opacity-30 hidden md:block">❄️</div>

                    <div className="container relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                            <motion.span
                                className="inline-block mb-6 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-base font-bold text-white border border-white/30 shadow-xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                🎄 Temporada Navideña 2025 ❄️
                            </motion.span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl">
                                Menús de <span className="text-yellow-300">Temporada</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
                                Celebrá las fiestas con el sabor casero de BiKitchen.
                                Menús especiales listos para compartir en familia
                            </p>

                            {/* Tabs Navigation */}
                            <motion.div
                                className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto bg-white/20 p-3 rounded-full backdrop-blur-md border-2 border-white/30 shadow-2xl"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                {tabs.map(tab => (
                                    <motion.button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 border-2 ${activeTab === tab.id
                                            ? 'bg-white text-red-600 shadow-xl border-white scale-105'
                                            : 'text-white hover:bg-white/20 border-white/30 hover:border-white/50'
                                            }`}
                                        whileHover={{ scale: activeTab === tab.id ? 1.05 : 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <span className="text-lg">{tab.icon}</span>
                                        {tab.label}
                                    </motion.button>
                                ))}
                            </motion.div>
                        </motion.div>
                    </div>
                </header>

                <main className="container py-12 pb-32">
                    {/* Skeleton loader mientras cargan imágenes */}
                    {loading && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-lg">
                                    <div className="aspect-[4/3] bg-gray-200 animate-pulse"></div>
                                    <div className="p-6 space-y-3">
                                        <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                                        <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-full mt-4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && (
                        <AnimatePresence mode="wait">
                            {/* PACKS View */}
                            {activeTab === 'packs' && (
                                <motion.div
                                    key="packs"
                                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {menus.map((menu) => (
                                        <MenuCard
                                            key={menu.id}
                                            menu={{
                                                ...menu,
                                                imagen: packImages[menu.id] || menu.imagen
                                            }}
                                            onClick={setSelectedMenu}
                                            canEditImage={isAdmin && isAdmin()}
                                            onUploadImage={() => uploadImageForItem(menu, 'pack')}
                                        />
                                    ))}
                                </motion.div>
                            )}

                            {/* PROTEINAS View */}
                            {activeTab === 'proteinas' && (
                                <motion.div
                                    key="proteinas"
                                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    variants={staggerContainer}
                                >
                                    {PROTEINAS_DATA.map((item) => (
                                        <SimpleProductCard
                                            key={item.id}
                                            item={{
                                                ...item,
                                                imagen: proteinaImages[item.id] || item.imagen
                                            }}
                                            type="proteinas"
                                            onAddToCart={handleSimpleAddToCart}
                                            onOpenDetails={(prod) => {
                                                setSelectedSimpleProduct(prod);
                                                setSelectedSimpleType('proteinas');
                                            }}
                                            canEditImage={isAdmin && isAdmin()}
                                            onUploadImage={() => uploadImageForItem(item, 'proteina')}
                                        />
                                    ))}
                                </motion.div>
                            )}

                            {/* GUARNICIONES View */}
                            {activeTab === 'guarniciones' && (
                                <motion.div
                                    key="guarniciones"
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    variants={staggerContainer}
                                >
                                    {/* Guarniciones Débiles */}
                                    <div className="mb-12">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl">🥬</div>
                                            <h3 className="text-2xl font-bold text-gray-900">Guarniciones Débiles</h3>
                                        </div>
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {GUARNICIONES_DATA.debiles.map((item) => (
                                                <SimpleProductCard
                                                    key={item.id}
                                                    item={{
                                                        ...item,
                                                        imagen: guarnicionImages[item.id] || item.imagen
                                                    }}
                                                    type="guarniciones"
                                                    onAddToCart={handleSimpleAddToCart}
                                                    onOpenDetails={(prod) => {
                                                        setSelectedSimpleProduct(prod);
                                                        setSelectedSimpleType('guarniciones');
                                                    }}
                                                    canEditImage={isAdmin && isAdmin()}
                                                    onUploadImage={() => uploadImageForItem(item, 'guarnicion')}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Guarniciones Fuertes */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl">🥔</div>
                                            <h3 className="text-2xl font-bold text-gray-900">Guarniciones Fuertes</h3>
                                        </div>
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {GUARNICIONES_DATA.fuertes.map((item) => (
                                                <SimpleProductCard
                                                    key={item.id}
                                                    item={{
                                                        ...item,
                                                        imagen: guarnicionImages[item.id] || item.imagen
                                                    }}
                                                    type="guarniciones"
                                                    onAddToCart={handleSimpleAddToCart}
                                                    onOpenDetails={(prod) => {
                                                        setSelectedSimpleProduct(prod);
                                                        setSelectedSimpleType('guarniciones');
                                                    }}
                                                    canEditImage={isAdmin && isAdmin()}
                                                    onUploadImage={() => uploadImageForItem(item, 'guarnicion')}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </main>

                <Footer />

                {/* Modal de Packs */}
                <AnimatePresence>
                    {selectedMenu && (
                        <MenuModal
                            menu={selectedMenu}
                            onClose={() => setSelectedMenu(null)}
                        />
                    )}
                </AnimatePresence>

                {/* Modal de Productos Simples (Proteínas, Postres, Guarniciones) */}
                <AnimatePresence>
                    {selectedSimpleProduct && (
                        <SimpleProductModal
                            product={selectedSimpleProduct}
                            type={selectedSimpleType}
                            onClose={() => {
                                setSelectedSimpleProduct(null);
                                setSelectedSimpleType(null);
                            }}
                            onAddToCart={(item, qty) => {
                                handleSimpleAddToCart(item, qty);
                                setSelectedSimpleProduct(null);
                                setSelectedSimpleType(null);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
