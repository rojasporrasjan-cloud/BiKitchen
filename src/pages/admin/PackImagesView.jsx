import React, { useState, useEffect, useRef } from 'react';
import { Image, Upload, Save, Loader2, Check, X, Camera, Trash2, Images } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PACKS_DATA } from '../../data/packsData';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { uploadOptimizedImage } from '../../services/cloudinaryService';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { invalidateCache } from '../../utils/firestoreCache';

// Imagen por defecto
const DEFAULT_PACK_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop&q=80';

export default function PackImagesView() {
    const [loading, setLoading] = useState(true);
    const [packImages, setPackImages] = useState({}); // { packName: imageUrl }
    const [uploading, setUploading] = useState(null); // packName que se está subiendo
    const fileInputRef = useRef(null);
    const [selectedPack, setSelectedPack] = useState(null);

    // Obtener packs únicos (sin duplicados por nombre)
    const getAllPacks = () => {
        const seenNames = new Set();
        const uniquePacks = [];

        Object.entries(PACKS_DATA).forEach(([categoryKey, categoryData]) => {
            categoryData.packs.forEach(pack => {
                // Solo agregar si no hemos visto este nombre antes
                if (!seenNames.has(pack.name)) {
                    seenNames.add(pack.name);
                    uniquePacks.push({
                        ...pack,
                        category: categoryKey,
                        categoryTitle: categoryData.title
                    });
                }
            });
        });
        return uniquePacks;
    };

    const allPacks = getAllPacks();

    // Cargar imágenes desde Firebase (doc único con fallback a colección legacy)
    const loadImages = async () => {
        setLoading(true);
        try {
            // 1) Intentar leer doc unificado
            const confRef = doc(db, 'config', 'pack_images');
            const confSnap = await getDoc(confRef);
            if (confSnap.exists()) {
                const data = confSnap.data() || {};
                const images = data.images || data;
                setPackImages(images || {});
                return;
            }
            // 2) Fallback legacy: colección packs_imagenes
            const colRef = collection(db, 'packs_imagenes');
            const snap = await getDocs(colRef);
            const images = {};
            snap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data?.imagenUrl && data?.packName) {
                    images[data.packName] = data.imagenUrl;
                }
            });
            setPackImages(images);
        } catch (error) {
            console.error('Error loading pack images:', error);
            toast.error('Error al cargar imágenes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImages();
    }, []);

    // Manejar clic en botón de subir
    const handleUploadClick = (packName) => {
        setSelectedPack(packName);
        fileInputRef.current?.click();
    };

    // Helper: optimizar a WebP con resize
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

    // Subir imagen usando Cloudinary
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedPack) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB');
            return;
        }

        setUploading(selectedPack);
        try {
            const result = await uploadOptimizedImage(file, 'bikitchen/packs', {
                maxSize: 1280,
                onProgress: (p) => console.log(`Subiendo pack: ${p}%`)
            });
            const downloadUrl = result.url;

            // Guardar en doc unificado (preferido) con estructura anidada para merge correcto
            const confRef = doc(db, 'config', 'pack_images');
            await setDoc(confRef, { 
                updatedAt: new Date().toISOString(),
                images: {
                    [selectedPack]: downloadUrl
                },
                publicIds: {
                    [selectedPack]: result.publicId
                }
            }, { merge: true });

            // Invalidar caché local para que se vea el cambio al recargar PacksPage
            invalidateCache('packs_images_map');

            // Actualizar estado local
            setPackImages(prev => ({ ...prev, [selectedPack]: downloadUrl }));
            toast.success(`Imagen de "${selectedPack}" actualizada ✅`);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setUploading(null);
            setSelectedPack(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Eliminar imagen personalizada
    const handleDeleteImage = async (packName) => {
        if (!confirm(`¿Eliminar la imagen personalizada de "${packName}"?`)) return;

        setUploading(packName);
        try {
            // Remover del doc unificado
            const confRef = doc(db, 'config', 'pack_images');
            await updateDoc(confRef, { 
                [`images.${packName}`]: deleteField(), 
                updatedAt: new Date().toISOString() 
            });

            // Invalidar caché local
            invalidateCache('packs_images_map');

            // Legacy: eliminar documento individual si existe
            try {
                const docRef = doc(db, 'packs_imagenes', packName.replace(/\s+/g, '_'));
                await deleteDoc(docRef);
            } catch (_) { }

            setPackImages(prev => {
                const newImages = { ...prev };
                delete newImages[packName];
                return newImages;
            });

            toast.success('Imagen eliminada, se usará la imagen por defecto');
        } catch (error) {
            console.error('Error deleting image:', error);
            toast.error('Error al eliminar la imagen');
        } finally {
            setUploading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-bikitchen-orange mx-auto mb-4" />
                    <p className="text-gray-500">Cargando imágenes...</p>
                </div>
            </div>
        );
    }

    const totalPacks = allPacks.length;
    const withCustomImage = Object.keys(packImages).length;
    const withDefaultImage = totalPacks - withCustomImage;

    return (
        <div className="space-y-6">
            {/* Header */}
            <AdminPageHeader
                icon={Images}
                title="Imágenes de Packs"
                subtitle="Gestiona las imágenes personalizadas para cada pack de comida"
                gradient="from-pink-500 via-rose-400 to-orange-400"
                stats={[
                    { value: totalPacks, label: 'Total Packs' },
                    { value: withCustomImage, label: 'Personalizadas' },
                    { value: withDefaultImage, label: 'Por Defecto' }
                ]}
            />

            {/* Input oculto para subir archivos */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {/* Grid de packs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allPacks.map((pack) => {
                    const hasCustomImage = !!packImages[pack.name];
                    const imageUrl = packImages[pack.name] || DEFAULT_PACK_IMAGE;
                    const isUploading = uploading === pack.name;

                    return (
                        <motion.div
                            key={pack.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group"
                        >
                            {/* Imagen */}
                            <div className="relative h-36 overflow-hidden">
                                <img
                                    src={imageUrl}
                                    alt={pack.name}
                                    className="w-full h-full object-cover"
                                />

                                {/* Overlay con botones */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleUploadClick(pack.name)}
                                        disabled={isUploading}
                                        className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                                        title="Cambiar imagen"
                                    >
                                        {isUploading ? (
                                            <Loader2 size={20} className="animate-spin text-bikitchen-orange" />
                                        ) : (
                                            <Camera size={20} className="text-gray-700" />
                                        )}
                                    </button>

                                    {hasCustomImage && (
                                        <button
                                            onClick={() => handleDeleteImage(pack.name)}
                                            disabled={isUploading}
                                            className="p-3 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                            title="Eliminar imagen personalizada"
                                        >
                                            <Trash2 size={20} className="text-white" />
                                        </button>
                                    )}
                                </div>

                                {/* Badge de imagen personalizada */}
                                {hasCustomImage && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Check size={10} />
                                        Personalizada
                                    </div>
                                )}

                                {/* Emoji del pack */}
                                <div className="absolute bottom-2 left-2 text-2xl drop-shadow-lg">
                                    {pack.icon}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <h4 className="font-bold text-gray-900 text-sm truncate">{pack.name}</h4>
                                <p className="text-xs text-gray-500 truncate">{pack.categoryTitle}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Nota informativa */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Image size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-blue-900">Recomendaciones</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• Usa imágenes de al menos 400x250 píxeles</li>
                        <li>• Formatos recomendados: JPG, PNG, WebP</li>
                        <li>• Tamaño máximo: 5MB por imagen</li>
                        <li>• Las imágenes se mostrarán en las tarjetas de planes semanales</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
