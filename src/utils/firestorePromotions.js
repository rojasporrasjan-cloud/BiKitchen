import { db } from '../firebase/config';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { cleanFirebaseUrl } from './firebaseUrl';
import { cachedFetch, invalidateCache } from './firestoreCache';

const COLLECTION_NAME = 'promociones';

/**
 * Obtener todas las promociones
 * OPTIMIZADO: Usa caché local para reducir lecturas de Firestore
 */
export const getAllPromotions = async () => {
    return cachedFetch('promotions_all', async () => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Limpiar token de Firebase Storage para evitar errores 412
                    imagenUrl: cleanFirebaseUrl(data.imagenUrl),
                    fechaInicio: data.fechaInicio?.toDate?.()?.toISOString() || data.fechaInicio,
                    fechaFin: data.fechaFin?.toDate?.()?.toISOString() || data.fechaFin,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
                };
            });
        } catch (error) {
            console.error('Error getting promotions:', error);
            return [];
        }
    }, 'promotions');
};

/**
 * Obtener solo promociones activas (para frontend)
 */
export const getActivePromotions = async () => {
    try {
        return await cachedFetch('promotions_active', async () => {
            const allPromos = await getAllPromotions();
            const now = new Date();
            console.log('[getActivePromotions] Total promociones:', allPromos.length);
            console.log('[getActivePromotions] Fecha actual:', now.toISOString());
            const activePromos = allPromos.filter(promo => {
                if (!promo.activa) {
                    console.log(`[getActivePromotions] Promoción "${promo.titulo}" NO activa`);
                    return false;
                }
                const inicio = promo.fechaInicio ? new Date(promo.fechaInicio) : null;
                const fin = promo.fechaFin ? new Date(promo.fechaFin) : null;
                console.log(`[getActivePromotions] Promoción "${promo.titulo}":`, {
                    activa: promo.activa,
                    inicio: inicio?.toISOString(),
                    fin: fin?.toISOString(),
                    inicioValido: !inicio || inicio <= now,
                    finValido: !fin || fin >= now
                });
                if (inicio && inicio > now) {
                    console.log(`[getActivePromotions] Promoción "${promo.titulo}" aún no inicia`);
                    return false;
                }
                if (fin && fin < now) {
                    console.log(`[getActivePromotions] Promoción "${promo.titulo}" ya expiró`);
                    return false;
                }
                return true;
            });
            console.log('[getActivePromotions] Promociones activas:', activePromos.length);
            activePromos.forEach(promo => {
                console.log(`[getActivePromotions] 📋 Promoción "${promo.titulo}" - Campos completos:`, {
                    id: promo.id,
                    titulo: promo.titulo,
                    descripcion: promo.descripcion,
                    composicionPlato: promo.composicionPlato,
                    packsRelacionados: promo.packsRelacionados,
                    descuentoEnvio: promo.descuentoEnvio,
                    tipoPlan: promo.tipoPlan,
                    beneficios: promo.beneficios,
                    detalles: promo.detalles
                });
            });
            return activePromos;
        }, 'promotions');
    } catch (error) {
        console.error('Error getting active promotions:', error);
        return [];
    }
};

/**
 * Obtener promociones para mostrar en Home
 */
export const getHomePromotions = async () => {
    try {
        const activePromos = await getActivePromotions();
        return activePromos.filter(promo => promo.mostrarEnHome);
    } catch (error) {
        console.error('Error getting home promotions:', error);
        return [];
    }
};

/**
 * Obtener promociones por pack
 */
export const getPromotionsByPack = async (packName) => {
    try {
        const activePromos = await getActivePromotions();
        return activePromos.filter(promo => 
            promo.packsRelacionados?.includes(packName)
        );
    } catch (error) {
        console.error('Error getting promotions by pack:', error);
        return [];
    }
};

/**
 * Obtener una promoción por ID
 */
export const getPromotionById = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                fechaInicio: data.fechaInicio?.toDate?.() || data.fechaInicio,
                fechaFin: data.fechaFin?.toDate?.() || data.fechaFin,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting promotion:', error);
        return null;
    }
};

/**
 * Crear nueva promoción
 */
export const createPromotion = async (promotionData) => {
    try {
        console.log('🔍 DEBUG - Datos recibidos para crear promoción:', promotionData);
        console.log('🔍 DEBUG - composicionPlato:', promotionData.composicionPlato);
        console.log('🔍 DEBUG - packsRelacionados:', promotionData.packsRelacionados);
        console.log('🔍 DEBUG - descuentoEnvio:', promotionData.descuentoEnvio);
        console.log('🔍 DEBUG - tipoPlan:', promotionData.tipoPlan);
        
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...promotionData,
            fechaInicio: promotionData.fechaInicio ? Timestamp.fromDate(new Date(promotionData.fechaInicio)) : null,
            fechaFin: promotionData.fechaFin ? Timestamp.fromDate(new Date(promotionData.fechaFin)) : null,
            activa: promotionData.activa ?? true,
            mostrarEnHome: promotionData.mostrarEnHome ?? false,
            packsRelacionados: promotionData.packsRelacionados || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log('✅ Promoción creada exitosamente con ID:', docRef.id);
        // Invalidar caché
        invalidateCache('promotions_all');
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating promotion:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Actualizar promoción
 */
export const updatePromotion = async (id, promotionData) => {
    try {
        console.log('🔍 DEBUG - Datos recibidos para actualizar promoción ID:', id);
        console.log('🔍 DEBUG - Datos completos:', promotionData);
        console.log('🔍 DEBUG - composicionPlato:', promotionData.composicionPlato);
        console.log('🔍 DEBUG - packsRelacionados:', promotionData.packsRelacionados);
        console.log('🔍 DEBUG - descuentoEnvio:', promotionData.descuentoEnvio);
        console.log('🔍 DEBUG - tipoPlan:', promotionData.tipoPlan);
        
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...promotionData,
            fechaInicio: promotionData.fechaInicio ? Timestamp.fromDate(new Date(promotionData.fechaInicio)) : null,
            fechaFin: promotionData.fechaFin ? Timestamp.fromDate(new Date(promotionData.fechaFin)) : null,
            updatedAt: serverTimestamp()
        });
        console.log('✅ Promoción actualizada exitosamente');
        // Invalidar caché
        invalidateCache('promotions_all');
        return { success: true };
    } catch (error) {
        console.error('Error updating promotion:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Eliminar promoción
 */
export const deletePromotion = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        // Invalidar caché
        invalidateCache('promotions_all');
        return { success: true };
    } catch (error) {
        console.error('Error deleting promotion:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Toggle estado activo de promoción
 */
export const togglePromotionStatus = async (id, currentStatus) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            activa: !currentStatus,
            updatedAt: serverTimestamp()
        });
        // Invalidar caché
        invalidateCache('promotions_all');
        return { success: true };
    } catch (error) {
        console.error('Error toggling promotion status:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Verificar y desactivar promociones expiradas
 */
export const checkExpiredPromotions = async () => {
    try {
        const allPromos = await getAllPromotions();
        const now = new Date();
        
        for (const promo of allPromos) {
            if (promo.activa && promo.fechaFin) {
                const fechaFin = new Date(promo.fechaFin);
                if (fechaFin < now) {
                    await updatePromotion(promo.id, { activa: false });
                    console.log(`Promoción "${promo.titulo}" desactivada por expiración`);
                }
            }
        }
    } catch (error) {
        console.error('Error checking expired promotions:', error);
    }
};

/**
 * Inicializar promociones por defecto si no existen
 */
export const initializeDefaultPromotions = async () => {
    try {
        const existing = await getAllPromotions();
        if (existing.length > 0) {
            console.log('Ya existen promociones en Firestore');
            return { success: true, message: 'Promociones ya existen' };
        }

        const defaultPromotions = [
            {
                titulo: '🎄 Menú Navideño Tradicional',
                descripcion: 'Disfrutá la temporada con nuestros menús navideños llenos de sabor casero BiKitchen ❤️ Disponible durante diciembre.',
                descripcionCorta: 'Pierna de cerdo en salsa de ciruelas',
                imagenURL: 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                fechaInicio: new Date().toISOString(),
                fechaFin: '2024-12-31',
                packsRelacionados: [],
                beneficios: ['Disponible solo en diciembre', 'Incluye postre navideño', 'Presentación especial'],
                mostrarEnHome: true,
                activa: true,
                tipoPromocion: 'menú',
                etiquetaColor: '#FFA94D',
                prioridadDestacado: 1
            },
            {
                titulo: '🎄 Menú Navideño Especial',
                descripcion: 'Disfrutá la temporada con nuestros menús navideños llenos de sabor casero BiKitchen ❤️ Disponible durante diciembre.',
                descripcionCorta: 'Pollo relleno con salsa de hongos',
                imagenURL: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                fechaInicio: new Date().toISOString(),
                fechaFin: '2024-12-31',
                packsRelacionados: [],
                beneficios: ['Disponible solo en diciembre', 'Incluye postre navideño', 'Presentación especial'],
                mostrarEnHome: true,
                activa: true,
                tipoPromocion: 'menú',
                etiquetaColor: '#FFA94D',
                prioridadDestacado: 2
            },
            {
                titulo: '🎉 Promoción Mensual con Desayunos Gratis',
                descripcion: 'Despreocupate de tus almuerzos de todo el mes — ¡te regalamos los desayunos! 🌞',
                descripcionCorta: '¡Te regalamos los desayunos del mes!',
                imagenURL: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                fechaInicio: new Date().toISOString(),
                fechaFin: '2024-12-31',
                packsRelacionados: ['Pack Sin Carbos', 'Pack Bajo Calorías', 'Pack Regular', 'Pack Casaditos', 'Pack Vegetariano', 'Full Pack'],
                beneficios: ['Desayunos GRATIS incluidos', 'Envío con descuento del 10%', 'Ahorro equivalente a ₡52.000'],
                mostrarEnHome: true,
                activa: true,
                tipoPromocion: 'descuento',
                etiquetaColor: '#FFA94D',
                prioridadDestacado: 3
            },
            {
                titulo: '❤️ Two Pack (para parejas o amigos)',
                descripcion: 'Nuestro Two Pack incluye 5 almuerzos por persona, ideal para compartir entre pareja, amigos o familiares.',
                descripcionCorta: 'Pack especial para compartir',
                imagenURL: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                fechaInicio: new Date().toISOString(),
                fechaFin: null,
                packsRelacionados: ['Two Pack'],
                beneficios: ['Ideal para compartir', 'Precios iguales al Pack Semanal', 'Hasta 2 cambios sin costo'],
                mostrarEnHome: false,
                activa: true,
                tipoPromocion: 'pack',
                prioridadDestacado: 10
            },
            {
                titulo: '🕐 Pack Quincenal (2 semanas)',
                descripcion: 'Pack de 10 comidas (5 por semana) para una persona. Entregas semanales, menús distintos cada semana.',
                descripcionCorta: '10 comidas en 2 semanas',
                imagenURL: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                fechaInicio: new Date().toISOString(),
                fechaFin: null,
                packsRelacionados: ['Pack Sin Carbos', 'Pack Bajo Calorías', 'Pack Regular', 'Pack Casaditos', 'Full Pack'],
                beneficios: ['Envío gratuito en área de cobertura', 'Menús distintos cada semana', 'Ideal para 2 semanas sin cocinar'],
                mostrarEnHome: false,
                activa: true,
                tipoPromocion: 'pack',
                prioridadDestacado: 10
            },
            {
                titulo: '👨‍👩‍👧‍👦 Pack Familiar',
                descripcion: 'Perfecto para familias de 3 a 4 personas. Incluye platos fuertes, proteínas y guarniciones.',
                descripcionCorta: 'Para familias de 3-4 personas',
                imagenURL: 'https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                fechaInicio: new Date().toISOString(),
                fechaFin: null,
                packsRelacionados: ['Pack Familiar', 'Pack Familiar Premium'],
                beneficios: ['Para familias de 3 a 4 personas', 'Comida casera lista para calentar', 'Opciones variadas y balanceadas'],
                mostrarEnHome: false,
                activa: true,
                tipoPromocion: 'pack',
                prioridadDestacado: 10
            },
            {
                titulo: '🍽️ Pack Semanal Almuerzo + Cena',
                descripcion: '5 almuerzos + 5 cenas para 1 persona (10 comidas semanales).',
                descripcionCorta: '10 comidas: almuerzo y cena',
                imagenURL: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                fechaInicio: new Date().toISOString(),
                fechaFin: null,
                packsRelacionados: ['Pack Sin Carbos', 'Pack Bajo Calorías', 'Pack Regular', 'Pack Casaditos', 'Full Pack'],
                beneficios: ['Hasta 2 cambios en el menú sin costo', 'Almuerzo y cena cubiertos', 'Envío adicional disponible'],
                mostrarEnHome: false,
                activa: true,
                tipoPromocion: 'pack',
                prioridadDestacado: 10
            }
        ];

        for (const promo of defaultPromotions) {
            await createPromotion(promo);
        }

        console.log('Promociones por defecto creadas exitosamente');
        return { success: true, message: 'Promociones creadas' };
    } catch (error) {
        console.error('Error initializing promotions:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Obtener estadísticas de promociones
 */
export const getPromotionStats = async () => {
    try {
        const allPromos = await getAllPromotions();
        const activePromos = await getActivePromotions();
        const now = new Date();
        
        // Encontrar próxima a expirar
        const proximaExpirar = activePromos
            .filter(p => p.fechaFin)
            .sort((a, b) => new Date(a.fechaFin) - new Date(b.fechaFin))[0];
        
        // Calcular días restantes
        let diasRestantes = null;
        if (proximaExpirar?.fechaFin) {
            const diff = new Date(proximaExpirar.fechaFin) - now;
            diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }
        
        return {
            total: allPromos.length,
            activas: activePromos.length,
            inactivas: allPromos.length - activePromos.length,
            enHome: activePromos.filter(p => p.mostrarEnHome).length,
            proximaExpirar: proximaExpirar ? {
                titulo: proximaExpirar.titulo,
                diasRestantes
            } : null
        };
    } catch (error) {
        console.error('Error getting promotion stats:', error);
        return { total: 0, activas: 0, inactivas: 0, enHome: 0, proximaExpirar: null };
    }
};
