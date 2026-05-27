import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FolderOpen, Image, Check, X, Loader2,
    Trash2, Save, Search, ChevronDown
} from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { uploadOptimizedImage, convertHeicToJpg } from '../../services/cloudinaryService';
import toast from 'react-hot-toast';
import { individualesData } from '../../data/individualesData';

// Componente de selector con búsqueda
const SearchableSelect = ({ options, value, onChange, disabled, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);
    const listRef = useRef(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Prevenir scroll de la página cuando se hace scroll en el dropdown
    const handleWheel = (e) => {
        const list = listRef.current;
        if (!list) return;

        const { scrollTop, scrollHeight, clientHeight } = list;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

        // Si está en el tope y quiere subir, o en el fondo y quiere bajar, prevenir
        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            e.preventDefault();
        }

        e.stopPropagation();
    };

    const filteredOptions = options.filter(opt =>
        opt.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.id === value);

    if (disabled) {
        return (
            <div className="w-full text-xs px-2 py-1.5 border rounded-lg bg-green-50 border-green-300 text-green-700 truncate">
                ✓ {selectedOption?.nombre || 'Asignado'}
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Input/Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-xs px-2 py-1.5 border rounded-lg text-left flex items-center justify-between gap-1 ${value ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                    }`}
            >
                <span className="truncate">
                    {selectedOption?.nombre || placeholder || 'Seleccionar...'}
                </span>
                <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Buscador */}
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full text-xs pl-6 pr-2 py-1.5 border rounded bg-gray-50 focus:outline-none focus:border-bikitchen-orange"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Opciones */}
                    <div
                        ref={listRef}
                        className="max-h-60 overflow-y-auto overscroll-contain"
                        onWheel={handleWheel}
                        style={{ touchAction: 'pan-y' }}
                    >
                        {/* Opción para quitar selección */}
                        {value && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(null);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 border-b"
                            >
                                ✕ Quitar selección
                            </button>
                        )}

                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-gray-500 text-center">
                                No se encontraron resultados
                            </div>
                        ) : (
                            filteredOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${value === opt.id ? 'bg-blue-50 text-blue-700' : ''
                                        }`}
                                >
                                    {opt.nombre}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Contador */}
                    <div className="px-3 py-1.5 bg-gray-50 border-t text-xs text-gray-500">
                        {filteredOptions.length} de {options.length} opciones
                    </div>
                </div>
            )}
        </div>
    );
};

// Categorías de imágenes
const CATEGORIAS = [
    { id: 'platillos', label: '🍽️ Platillos Individuales' },
    { id: 'packs', label: '📦 Packs Semanales' },
    { id: 'temporada', label: '🍂 Menú de Temporada' },
    { id: 'promociones', label: '🎁 Promociones' },
    { id: 'otros', label: '📷 Otros' }
];

export default function ImageUploadPage() {
    const navigate = useNavigate();

    // Estado de imágenes
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [converting, setConverting] = useState(false);

    // Estado para archivos HEIC que fallaron
    const [failedHeicFiles, setFailedHeicFiles] = useState([]);

    // Estado de platillos/packs disponibles
    const [platillos, setPlatillos] = useState([]);
    const [loadingPlatillos, setLoadingPlatillos] = useState(true);

    // Filtros
    const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Generar lista de platillos desde individualesData + packs + otros
    const generarPlatillos = () => {
        // Mapear todos los platillos individuales (de individualesData)
        const platillosIndividuales = individualesData.map(item => ({
            id: item.id,
            nombre: `${item.nombre} (${item.categoria})`,
            categoria: 'platillos'
        }));

        // Packs semanales
        const packs = [
            { id: 'pack-sin-carbos', nombre: 'Pack Sin Carbos', categoria: 'packs' },
            { id: 'pack-bajo-calorias', nombre: 'Pack Bajo Calorías', categoria: 'packs' },
            { id: 'pack-regular', nombre: 'Pack Regular', categoria: 'packs' },
            { id: 'pack-casaditos', nombre: 'Pack Casaditos', categoria: 'packs' },
            { id: 'pack-full', nombre: 'Full Pack', categoria: 'packs' },
            { id: 'pack-vegetariano', nombre: 'Pack Vegetariano', categoria: 'packs' },
            { id: 'pack-familiar-premium', nombre: 'Pack Familiar Premium', categoria: 'packs' },
            { id: 'pack-familiar-deluxe', nombre: 'Pack Familiar Deluxe', categoria: 'packs' },
            { id: 'two-pack', nombre: 'Two Pack (Parejas)', categoria: 'packs' },
            { id: 'pack-5-comidas', nombre: 'Pack 5 Comidas', categoria: 'packs' },
            { id: 'pack-10-comidas', nombre: 'Pack 10 Comidas', categoria: 'packs' },
            { id: 'pack-15-comidas', nombre: 'Pack 15 Comidas', categoria: 'packs' },
            { id: 'pack-20-comidas', nombre: 'Pack 20 Comidas (Mensual)', categoria: 'packs' },
        ];

        // Menú de temporada
        const temporada = [
            { id: 'temporada-1', nombre: 'Plato de Temporada 1', categoria: 'temporada' },
            { id: 'temporada-2', nombre: 'Plato de Temporada 2', categoria: 'temporada' },
            { id: 'temporada-3', nombre: 'Plato de Temporada 3', categoria: 'temporada' },
            { id: 'temporada-4', nombre: 'Plato de Temporada 4', categoria: 'temporada' },
            { id: 'temporada-5', nombre: 'Plato de Temporada 5', categoria: 'temporada' },
            { id: 'especial-semana', nombre: 'Especial de la Semana', categoria: 'temporada' },
            { id: 'menu-navidad', nombre: 'Menú Navideño', categoria: 'temporada' },
            { id: 'menu-ano-nuevo', nombre: 'Menú Año Nuevo', categoria: 'temporada' },
            { id: 'menu-semana-santa', nombre: 'Menú Semana Santa', categoria: 'temporada' },
            { id: 'menu-dia-madre', nombre: 'Menú Día de la Madre', categoria: 'temporada' },
        ];

        // Promociones
        const promociones = [
            { id: 'promo-mensual', nombre: 'Promoción Mensual', categoria: 'promociones' },
            { id: 'promo-quincenal', nombre: 'Pack Quincenal', categoria: 'promociones' },
            { id: 'promo-navidad', nombre: 'Promo Navidad', categoria: 'promociones' },
            { id: 'promo-2x1', nombre: 'Promoción 2x1', categoria: 'promociones' },
            { id: 'promo-descuento', nombre: 'Promoción Descuento', categoria: 'promociones' },
            { id: 'promo-nuevo-cliente', nombre: 'Promo Nuevo Cliente', categoria: 'promociones' },
            { id: 'promo-referidos', nombre: 'Promo Referidos', categoria: 'promociones' },
            { id: 'combo-familiar', nombre: 'Combo Familiar', categoria: 'promociones' },
        ];

        // Otros
        const otros = [
            { id: 'logo-bikitchen', nombre: 'Logo BiKitchen', categoria: 'otros' },
            { id: 'banner-principal', nombre: 'Banner Principal', categoria: 'otros' },
            { id: 'banner-promo', nombre: 'Banner Promocional', categoria: 'otros' },
            { id: 'foto-equipo', nombre: 'Foto del Equipo', categoria: 'otros' },
            { id: 'foto-cocina', nombre: 'Foto de Cocina', categoria: 'otros' },
            { id: 'empaque', nombre: 'Empaque/Envase', categoria: 'otros' },
            { id: 'delivery', nombre: 'Delivery/Entrega', categoria: 'otros' },
        ];

        return [...platillosIndividuales, ...packs, ...temporada, ...promociones, ...otros];
    };

    // Cargar platillos al montar
    useEffect(() => {
        const allPlatillos = generarPlatillos();
        console.log('[ImageUpload] Total platillos cargados:', allPlatillos.length);
        setPlatillos(allPlatillos);
        setLoadingPlatillos(false);
    }, []);

    // Cargar imágenes ya subidas desde Firestore
    useEffect(() => {
        const loadUploadedImages = async () => {
            try {
                console.log('[ImageUpload] Intentando cargar imágenes desde Firestore...');
                const imagenesRef = collection(db, 'imagenes');
                console.log('[ImageUpload] Referencia a colección:', imagenesRef.path);

                const snapshot = await getDocs(imagenesRef);
                console.log('[ImageUpload] Snapshot obtenido, docs:', snapshot.size);

                if (snapshot.empty) {
                    console.log('[ImageUpload] La colección imagenes está vacía');
                    return;
                }

                const uploadedImages = snapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    console.log('[ImageUpload] Doc encontrado:', docSnap.id, data);
                    return {
                        id: `uploaded-${docSnap.id}`,
                        file: null,
                        preview: data.url,
                        originalName: data.originalName || docSnap.id,
                        assignedTo: data.platilloId,
                        categoria: data.categoria || 'platillos',
                        uploaded: true,
                        firestoreId: docSnap.id
                    };
                });

                console.log('[ImageUpload] ✓ Cargadas', uploadedImages.length, 'imágenes desde Firestore');
                setImages(prev => {
                    // Solo agregar las que no están ya en el estado
                    const existingIds = prev.map(img => img.firestoreId).filter(Boolean);
                    const newImages = uploadedImages.filter(img => !existingIds.includes(img.firestoreId));
                    return [...prev, ...newImages];
                });
            } catch (error) {
                console.error('[ImageUpload] ✗ Error cargando imágenes:', error);
                console.error('[ImageUpload] Error code:', error.code);
                console.error('[ImageUpload] Error message:', error.message);

                if (error.code === 'permission-denied') {
                    toast.error('Sin permisos para leer imágenes. Verifica las reglas de Firestore.');
                }
            }
        };

        loadUploadedImages();
    }, []);

    // Advertencia al salir si hay imágenes sin subir
    useEffect(() => {
        const pendingImages = images.filter(img => !img.uploaded && img.file);

        const handleBeforeUnload = (e) => {
            if (pendingImages.length > 0) {
                e.preventDefault();
                e.returnValue = `Tienes ${pendingImages.length} imágenes sin subir. ¿Seguro que quieres salir?`;
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [images]);

    // Convertir HEIC a JPG viene del servicio de Cloudinary
    // (convertHeicToJpg está importado desde cloudinaryService)

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
        } catch (err) {
            reject(err);
        }
    });

    // Procesar archivos seleccionados
    const processFiles = useCallback(async (files) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', ''];
        const heicTypes = ['image/heic', 'image/heif'];

        setConverting(true);
        const processedImages = [];
        const failedFiles = [];

        for (const file of files) {
            // Verificar si es HEIC por extensión (a veces el type no se detecta bien)
            const isHeic = file.name.toLowerCase().endsWith('.heic') ||
                file.name.toLowerCase().endsWith('.heif') ||
                heicTypes.includes(file.type.toLowerCase());

            // Verificar si es imagen válida
            const isImage = file.type.startsWith('image/') ||
                isHeic ||
                /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name);

            if (!isImage) {
                continue; // Saltar archivos que no son imágenes silenciosamente
            }

            try {
                let processedFile = file;

                // Convertir HEIC a JPG
                if (isHeic) {
                    toast.loading(`Convirtiendo ${file.name}...`, { id: `convert-${file.name}` });
                    try {
                        processedFile = await convertHeicToJpg(file);
                        toast.success(`${file.name} convertido ✓`, { id: `convert-${file.name}` });
                    } catch (heicError) {
                        toast.error(`⚠️ ${file.name}: Convierte a JPG manualmente`, {
                            id: `convert-${file.name}`,
                            duration: 5000
                        });
                        failedFiles.push(file.name);
                        continue; // Saltar este archivo pero continuar con los demás
                    }
                }

                // Crear preview
                const preview = URL.createObjectURL(processedFile);

                processedImages.push({
                    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    file: processedFile,
                    preview,
                    originalName: file.name,
                    assignedTo: null,
                    categoria: 'platillos',
                    uploaded: false
                });
            } catch (error) {
                console.error(`Error procesando ${file.name}:`, error);
                failedFiles.push(file.name);
            }
        }

        setConverting(false);
        setImages(prev => [...prev, ...processedImages]);

        if (processedImages.length > 0) {
            toast.success(`✅ ${processedImages.length} imágenes listas`);
        }

        if (failedFiles.length > 0) {
            // Guardar los archivos fallidos en el estado
            setFailedHeicFiles(prev => [...prev, ...failedFiles]);
            toast.error(`❌ ${failedFiles.length} archivos HEIC no se pudieron convertir`, {
                duration: 5000
            });
        }
    }, []);

    // Manejar drag & drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const items = e.dataTransfer.items;
        const files = [];

        // Función recursiva para leer directorios
        const readDirectory = async (entry) => {
            if (entry.isFile) {
                return new Promise((resolve) => {
                    entry.file((file) => {
                        files.push(file);
                        resolve();
                    });
                });
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                return new Promise((resolve) => {
                    reader.readEntries(async (entries) => {
                        for (const ent of entries) {
                            await readDirectory(ent);
                        }
                        resolve();
                    });
                });
            }
        };

        const processItems = async () => {
            for (const item of items) {
                const entry = item.webkitGetAsEntry();
                if (entry) {
                    await readDirectory(entry);
                }
            }
            processFiles(files);
        };

        processItems();
    }, [processFiles]);

    // Manejar selección de archivos
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        processFiles(files);
    };

    // Asignar imagen a platillo
    const assignImage = (imageId, platilloId) => {
        setImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, assignedTo: platilloId } : img
        ));
    };

    // Cambiar categoría de imagen
    const changeCategoria = (imageId, categoria) => {
        setImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, categoria, assignedTo: null } : img
        ));
    };

    // Eliminar imagen
    const removeImage = (imageId) => {
        setImages(prev => {
            const img = prev.find(i => i.id === imageId);
            if (img?.preview) {
                URL.revokeObjectURL(img.preview);
            }
            return prev.filter(i => i.id !== imageId);
        });
    };

    // Subir todas las imágenes asignadas (usando Cloudinary)
    const uploadAllImages = async () => {
        const imagesToUpload = images.filter(img => img.assignedTo && !img.uploaded);

        if (imagesToUpload.length === 0) {
            toast.error('No hay imágenes asignadas para subir');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        let uploaded = 0;
        const errors = [];

        for (const img of imagesToUpload) {
            try {
                // Subir a Cloudinary con la carpeta correcta según categoría
                const folder = `bikitchen/${img.categoria || 'platillos'}`;
                const result = await uploadOptimizedImage(img.file, folder, {
                    maxSize: 1280,
                    onProgress: (p) => console.log(`[${img.originalName}] ${p}%`)
                });

                // Guardar URL de Cloudinary en Firestore
                const docRefImg = doc(db, 'imagenes', img.assignedTo);
                await setDoc(docRefImg, {
                    url: result.url,
                    cloudinaryPublicId: result.publicId,
                    categoria: img.categoria,
                    platilloId: img.assignedTo,
                    originalName: img.originalName,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                // Marcar como subida
                setImages(prev => prev.map(i =>
                    i.id === img.id ? { ...i, uploaded: true } : i
                ));

                uploaded++;
                setUploadProgress(Math.round((uploaded / imagesToUpload.length) * 100));

            } catch (error) {
                console.error(`[ImageUpload] Error subiendo ${img.originalName}:`, error);
                errors.push(`${img.originalName}: ${error.message}`);
            }
        }

        setUploading(false);

        if (errors.length > 0) {
            toast.error(`Error en ${errors.length} imágenes. Ver consola.`);
        }
        if (uploaded > 0) {
            toast.success(`✅ ${uploaded} imágenes subidas correctamente a Cloudinary`);
        }
    };

    // Filtrar platillos según categoría y búsqueda
    const platillosFiltrados = platillos.filter(p => {
        const matchCategoria = categoriaFiltro === 'todos' || p.categoria === categoriaFiltro;
        const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCategoria && matchSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="py-8 px-4">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            📷 Gestor de Imágenes
                        </h1>
                        <p className="text-gray-600">
                            Sube imágenes en lote y asígnalas a platillos o packs
                        </p>
                    </div>

                    {/* Zona de Drop */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={(e) => e.preventDefault()}
                        className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-bikitchen-orange transition-colors p-8 mb-8"
                    >
                        <div className="text-center">
                            {converting ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 size={48} className="text-bikitchen-orange animate-spin" />
                                    <p className="text-gray-600">Convirtiendo imágenes HEIC...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-bikitchen-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FolderOpen size={40} className="text-bikitchen-orange" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Arrastra una carpeta o imágenes aquí
                                    </h3>
                                    <p className="text-gray-500 mb-4">
                                        Soporta JPG, PNG, WEBP y <strong>HEIC</strong> (se convierte automáticamente)
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <label className="cursor-pointer bg-bikitchen-orange text-white font-semibold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors inline-flex items-center gap-2">
                                            <FolderOpen size={20} />
                                            Seleccionar Carpeta
                                            <input
                                                type="file"
                                                multiple
                                                webkitdirectory=""
                                                directory=""
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                accept="image/*,.heic,.heif"
                                            />
                                        </label>

                                        <label className="cursor-pointer bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
                                            <Image size={20} />
                                            Seleccionar Imágenes
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileSelect}
                                                className="hidden"
                                                accept="image/*,.heic,.heif"
                                            />
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sección de HEIC fallidos */}
                    {failedHeicFiles.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                                        ⚠️ Archivos HEIC que necesitan conversión manual ({failedHeicFiles.length})
                                    </h3>
                                    <p className="text-red-600 text-sm mb-3">
                                        Estos archivos no se pudieron convertir automáticamente.
                                        Usa <a href="https://heictojpg.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-800">heictojpg.com</a> para convertirlos y vuelve a subirlos.
                                    </p>
                                    <div className="bg-white rounded-lg p-3 max-h-32 overflow-y-auto">
                                        <ul className="text-sm text-gray-700 space-y-1">
                                            {failedHeicFiles.map((fileName, idx) => (
                                                <li key={idx} className="flex items-center gap-2">
                                                    <span className="text-red-500">✗</span>
                                                    <span className="font-mono text-xs">{fileName}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFailedHeicFiles([])}
                                    className="text-red-400 hover:text-red-600 p-1"
                                    title="Limpiar lista"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Advertencia de imágenes pendientes */}
                    {images.filter(img => !img.uploaded && img.file).length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <p className="font-semibold text-yellow-800">
                                        {images.filter(img => !img.uploaded && img.file).length} imágenes pendientes de subir
                                    </p>
                                    <p className="text-yellow-700 text-sm">
                                        Estas imágenes se perderán si refrescas o sales de la página. Asígnalas y haz clic en "Subir asignadas".
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats y acciones */}
                    {images.length > 0 && (
                        <div className="bg-white rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-gray-600">
                                    <strong className="text-gray-900">{images.length}</strong> total
                                </span>
                                <span className="text-yellow-600">
                                    <strong>{images.filter(i => !i.uploaded && i.file).length}</strong> pendientes
                                </span>
                                <span className="text-green-600">
                                    <strong>{images.filter(i => i.assignedTo && !i.uploaded).length}</strong> listas para subir
                                </span>
                                <span className="text-blue-600">
                                    <strong>{images.filter(i => i.uploaded).length}</strong> subidas ✓
                                </span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setImages([])}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Limpiar todo
                                </button>

                                <button
                                    onClick={uploadAllImages}
                                    disabled={uploading || images.filter(i => i.assignedTo && !i.uploaded).length === 0}
                                    className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            {uploadProgress}%
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Subir asignadas ({images.filter(i => i.assignedTo && !i.uploaded).length})
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grilla de imágenes */}
                    {images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            <AnimatePresence>
                                {images.map((img) => (
                                    <motion.div
                                        key={img.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className={`bg-white rounded-xl overflow-hidden shadow-sm border-2 transition-colors ${img.uploaded
                                            ? 'border-green-500'
                                            : img.assignedTo
                                                ? 'border-blue-500'
                                                : 'border-gray-200'
                                            }`}
                                    >
                                        {/* Preview */}
                                        <div className="relative aspect-square">
                                            <img
                                                src={img.preview}
                                                alt={img.originalName}
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Status badge */}
                                            {img.uploaded && (
                                                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                                    <Check size={16} />
                                                </div>
                                            )}

                                            {/* Delete button */}
                                            <button
                                                onClick={() => removeImage(img.id)}
                                                className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Controles */}
                                        <div className="p-3 space-y-2">
                                            {/* Selector de categoría */}
                                            <select
                                                value={img.categoria}
                                                onChange={(e) => changeCategoria(img.id, e.target.value)}
                                                className="w-full text-xs px-2 py-1 border rounded-lg bg-gray-50"
                                                disabled={img.uploaded}
                                            >
                                                {CATEGORIAS.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.label}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Selector de platillo con búsqueda */}
                                            <SearchableSelect
                                                options={platillos.filter(p => p.categoria === img.categoria)}
                                                value={img.assignedTo}
                                                onChange={(value) => assignImage(img.id, value)}
                                                disabled={img.uploaded}
                                                placeholder="Buscar platillo..."
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Empty state */}
                    {images.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Image size={64} className="mx-auto mb-4 opacity-30" />
                            <p>No hay imágenes cargadas</p>
                            <p className="text-sm">Arrastra una carpeta o selecciona imágenes para comenzar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
