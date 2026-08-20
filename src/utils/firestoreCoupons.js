import { db } from '../firebase/config';
import { cachedFetch, invalidateCacheByType } from './firestoreCache';
import { descuentoConRestricciones, motivoNoAplica, etiquetasDe } from './cuponRestricciones';
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
    Timestamp,
    increment,
    arrayUnion,
    runTransaction
} from 'firebase/firestore';

const COUPONS_COLLECTION = 'coupons';

/**
 * Tipos de cupón:
 * - 'percentage': Descuento en porcentaje (ej: 10%)
 * - 'fixed': Monto fijo de descuento (ej: ₡2000)
 * - 'free_shipping': Envío gratis
 */

// Obtener todos los cupones
export const getAllCoupons = async () => {
    return cachedFetch('coupons_all', async () => {
        try {
            const querySnapshot = await getDocs(collection(db, COUPONS_COLLECTION));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching coupons:', error);
            return [];
        }
    }, 'coupons');
};

// Obtener cupón por código
export const getCouponByCode = async (code) => {
    const key = `coupon_code_${(code || '').toUpperCase().trim()}`;
    return cachedFetch(key, async () => {
        try {
            const q = query(
                collection(db, COUPONS_COLLECTION),
                where('code', '==', (code || '').toUpperCase().trim())
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            const docSnap = querySnapshot.docs[0];
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } catch (error) {
            console.error('Error fetching coupon by code:', error);
            return null;
        }
    }, 'coupons');
};

// Validar cupón
// userId es opcional - si se proporciona, se verifica si el usuario ya usó el cupón
/**
 * ¿Este cliente nunca ha comprado?
 *
 * Se busca por correo y no por uid: el mismo cliente puede tener pedidos hechos
 * como invitado antes de abrir la cuenta, y esos cuentan como compra previa. Un
 * pedido cancelado no cuenta — nunca llegó a ser una compra.
 */
export const esPrimeraCompra = async (correo) => {
    const limpio = String(correo || '').toLowerCase().trim();
    if (!limpio) return false; // sin correo no se puede afirmar que es nuevo

    try {
        const snap = await getDocs(query(
            collection(db, 'pedidos'),
            where('correo', '==', limpio)
        ));
        const reales = snap.docs.filter((d) => {
            const st = String(d.data().status || '').toLowerCase();
            return st !== 'cancelled' && st !== 'cancelado' && st !== 'pending_payment';
        });
        return reales.length === 0;
    } catch (error) {
        console.error('[Cupones] Error revisando si es primera compra:', error);
        // Ante la duda NO se regala el descuento
        return false;
    }
};

/**
 * @param {string} code
 * @param {number} cartTotal
 * @param {string} [userId]
 * @param {object} [opciones] - { items, correo } para restricciones por pack y
 *        para el cupón de primera compra. Sin ellas se comporta como antes.
 */
export const validateCoupon = async (code, cartTotal, userId = null, opciones = {}) => {
    try {
        const coupon = await getCouponByCode(code);

        if (!coupon) {
            return { valid: false, error: 'Cupón no encontrado' };
        }

        // Verificar si está activo
        if (!coupon.active) {
            return { valid: false, error: 'Este cupón ya no está activo' };
        }

        // Verificar fecha de inicio
        if (coupon.startDate) {
            const startDate = coupon.startDate.toDate ? coupon.startDate.toDate() : new Date(coupon.startDate);
            if (new Date() < startDate) {
                return { valid: false, error: 'Este cupón aún no está disponible' };
            }
        }

        // Verificar fecha de expiración
        if (coupon.expirationDate) {
            const expDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
            if (new Date() > expDate) {
                return { valid: false, error: 'Este cupón ha expirado' };
            }
        }

        // Verificar límite de usos
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return { valid: false, error: 'Este cupón ha alcanzado su límite de usos' };
        }

        // Verificar si es de uso único por usuario
        // Normaliza identificadores: compara tanto UID como email para cubrir pedidos de invitados
        if (coupon.singleUsePerUser) {
            if (!userId) {
                return { valid: false, error: 'Debes iniciar sesión para usar este cupón' };
            }

            const usedBy = coupon.usedBy || [];
            const normalizedUserId = userId.toLowerCase().trim();
            const alreadyUsed = usedBy.some(id => {
                const normalizedId = (id || '').toLowerCase().trim();
                return normalizedId === normalizedUserId;
            });
            if (alreadyUsed) {
                return { valid: false, error: 'Ya has utilizado este cupón anteriormente' };
            }
        }

        // Solo para la primera compra de la cuenta
        if (coupon.soloPrimeraCompra) {
            const correo = String(opciones.correo || '').toLowerCase().trim();
            if (!correo) {
                return { valid: false, error: 'Iniciá sesión para usar este cupón de bienvenida' };
            }
            if (!(await esPrimeraCompra(correo))) {
                return { valid: false, error: 'Este cupón es solo para tu primera compra' };
            }
        }

        // Solo aplica a ciertos packs
        const noAplica = motivoNoAplica(coupon, opciones.items || []);
        if (noAplica && (opciones.items || []).length > 0) {
            return { valid: false, error: noAplica };
        }

        // Verificar mínimo de compra
        if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
            return {
                valid: false,
                error: `Mínimo de compra: ₡${coupon.minPurchase.toLocaleString('es-CR')}`
            };
        }

        // Calcular descuento
        let discount = 0;
        let discountText = '';

        // Con restricciones por pack, el descuento sale SOLO de lo que califica.
        // Si el carrito lleva un pack semanal y un postre, el 20% es del pack.
        const conRestricciones = (coupon.aplicaA || []).length > 0
            && (opciones.items || []).length > 0;

        switch (coupon.type) {
            case 'percentage':
                if (conRestricciones) {
                    discount = descuentoConRestricciones(coupon, opciones.items).descuento;
                } else {
                    discount = Math.round(cartTotal * (coupon.value / 100));
                    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                        discount = coupon.maxDiscount;
                    }
                }
                discountText = `${coupon.value}% de descuento`
                    + (conRestricciones ? ` en ${etiquetasDe(coupon.aplicaA).join(', ')}` : '');
                break;
            case 'fixed':
                discount = conRestricciones
                    ? descuentoConRestricciones(coupon, opciones.items).descuento
                    : coupon.value;
                discountText = `₡${discount.toLocaleString('es-CR')} de descuento`;
                break;
            case 'free_shipping':
                discount = 0; // El envío se maneja aparte
                discountText = 'Envío gratis';
                break;
            default:
                return { valid: false, error: 'Tipo de cupón no válido' };
        }

        return {
            valid: true,
            coupon,
            discount,
            discountText,
            type: coupon.type
        };
    } catch (error) {
        console.error('Error validating coupon:', error);
        return { valid: false, error: 'Error al validar el cupón' };
    }
};

// Incrementar contador de uso del cupón y registrar userId si se proporciona
// IMPORTANTE: Usa transacción de Firestore para evitar race condition en límite de usos
export const useCoupon = async (couponId, userId = null) => {
    try {
        const couponRef = doc(db, COUPONS_COLLECTION, couponId);
        let used = false;

        await runTransaction(db, async (transaction) => {
            // Leer documento dentro de la transacción (garantiza atomicidad)
            const snap = await transaction.get(couponRef);
            if (!snap.exists()) {
                throw new Error('COUPON_NOT_FOUND');
            }

            const data = snap.data();
            const currentCount = data.usedCount || 0;

            // Verificar límite DENTRO de la transacción (operación atómica)
            // Esto previene que dos usuarios simultáneos superen el límite
            if (data.maxUses && currentCount >= data.maxUses) {
                throw new Error('LIMIT_REACHED');
            }

            const updates = {
                usedCount: increment(1),
                lastUsed: Timestamp.now()
            };

            // Si el próximo uso alcanza el límite, marcar como inactivo
            if (data.maxUses && currentCount + 1 >= data.maxUses) {
                updates.active = false;
            }

            // Si se proporciona userId, agregarlo al array de usuarios que han usado el cupón
            if (userId) {
                updates.usedBy = arrayUnion(userId);
            }

            transaction.update(couponRef, updates);
            used = true;
        });

        return used;
    } catch (error) {
        // No logguear LIMIT_REACHED como error - es un caso normal
        if (error.message === 'LIMIT_REACHED') {
            console.warn('[Coupon] Límite de usos alcanzado para cupón:', couponId);
            return false;
        }
        if (error.message === 'COUPON_NOT_FOUND') {
            console.warn('[Coupon] Cupón no encontrado:', couponId);
            return false;
        }
        console.error('Error using coupon:', error);
        return false;
    }
};

// Crear nuevo cupón (admin)
export const createCoupon = async (couponData) => {
    try {
        const newCoupon = {
            code: couponData.code.toUpperCase().trim(),
            type: couponData.type, // 'percentage', 'fixed', 'free_shipping'
            value: Number(couponData.value) || 0,
            description: couponData.description || '',
            active: couponData.active !== false,
            minPurchase: Number(couponData.minPurchase) || 0,
            maxDiscount: Number(couponData.maxDiscount) || null,
            maxUses: Number(couponData.maxUses) || null,
            // Solo la primera compra de la cuenta (ver esPrimeraCompra)
            soloPrimeraCompra: couponData.soloPrimeraCompra === true,
            // Ids de CATEGORIAS_CUPON. Vacío = aplica a todo el carrito.
            aplicaA: Array.isArray(couponData.aplicaA) ? couponData.aplicaA : [],
            usedCount: 0,
            usedBy: [], // Array de userIds que han usado este cupón
            startDate: couponData.startDate ? Timestamp.fromDate(new Date(couponData.startDate)) : null,
            expirationDate: couponData.expirationDate ? Timestamp.fromDate(new Date(couponData.expirationDate)) : null,
            isWelcomeCoupon: couponData.isWelcomeCoupon || false,
            singleUsePerUser: couponData.singleUsePerUser || false,
            // Configuración del banner
            showInBanner: couponData.showInBanner || false,
            bannerBgColor: couponData.bannerBgColor || '#f97316',
            bannerTextColor: couponData.bannerTextColor || '#ffffff',
            bannerMessage: couponData.bannerMessage || '',
            bannerEmoji: couponData.bannerEmoji || '🎉',
            generatedBy: couponData.generatedBy || null, // ID del usuario que canjeó este cupón
            // Campos de Tarjeta de Regalo
            isGiftCard: couponData.isGiftCard || false,
            paymentStatus: couponData.paymentStatus || null,
            recipientName: couponData.recipientName || null,
            recipientEmail: couponData.recipientEmail || null,
            senderName: couponData.senderName || null,
            occasion: couponData.occasion || null,
            personalMessage: couponData.personalMessage || null,
            deliveryDate: couponData.deliveryDate || null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // Verificar que el código no exista
        const existing = await getCouponByCode(newCoupon.code);
        if (existing) {
            throw new Error('Ya existe un cupón con este código');
        }

        const docRef = await addDoc(collection(db, COUPONS_COLLECTION), newCoupon);
        
        // Invalidar caché de cupones para que el admin vea los cambios
        invalidateCacheByType('coupons');
        
        return { id: docRef.id, ...newCoupon };
    } catch (error) {
        console.error('Error creating coupon:', error);
        throw error;
    }
};

// Actualizar cupón (admin)
export const updateCoupon = async (couponId, couponData) => {
    try {
        const couponRef = doc(db, COUPONS_COLLECTION, couponId);

        const updates = {
            updatedAt: Timestamp.now()
        };

        if (couponData.code !== undefined) updates.code = couponData.code.toUpperCase().trim();
        if (couponData.type !== undefined) updates.type = couponData.type;
        if (couponData.value !== undefined) updates.value = Number(couponData.value);
        if (couponData.description !== undefined) updates.description = couponData.description;
        if (couponData.active !== undefined) updates.active = couponData.active;
        if (couponData.minPurchase !== undefined) updates.minPurchase = Number(couponData.minPurchase);
        if (couponData.soloPrimeraCompra !== undefined) updates.soloPrimeraCompra = couponData.soloPrimeraCompra === true;
        if (couponData.aplicaA !== undefined) updates.aplicaA = Array.isArray(couponData.aplicaA) ? couponData.aplicaA : [];
        if (couponData.maxDiscount !== undefined) updates.maxDiscount = couponData.maxDiscount ? Number(couponData.maxDiscount) : null;
        if (couponData.maxUses !== undefined) updates.maxUses = couponData.maxUses ? Number(couponData.maxUses) : null;
        if (couponData.startDate !== undefined) {
            updates.startDate = couponData.startDate ? Timestamp.fromDate(new Date(couponData.startDate)) : null;
        }
        if (couponData.expirationDate !== undefined) {
            updates.expirationDate = couponData.expirationDate ? Timestamp.fromDate(new Date(couponData.expirationDate)) : null;
        }
        if (couponData.isWelcomeCoupon !== undefined) updates.isWelcomeCoupon = couponData.isWelcomeCoupon;
        if (couponData.singleUsePerUser !== undefined) updates.singleUsePerUser = couponData.singleUsePerUser;
        // Campos del banner
        if (couponData.showInBanner !== undefined) updates.showInBanner = couponData.showInBanner;
        if (couponData.bannerBgColor !== undefined) updates.bannerBgColor = couponData.bannerBgColor;
        if (couponData.bannerTextColor !== undefined) updates.bannerTextColor = couponData.bannerTextColor;
        if (couponData.bannerMessage !== undefined) updates.bannerMessage = couponData.bannerMessage;
        if (couponData.bannerEmoji !== undefined) updates.bannerEmoji = couponData.bannerEmoji;

        await updateDoc(couponRef, updates);
        
        // Invalidar caché
        invalidateCacheByType('coupons');
        
        return true;
    } catch (error) {
        console.error('Error updating coupon:', error);
        throw error;
    }
};

// Eliminar cupón (admin)
export const deleteCoupon = async (couponId) => {
    try {
        await deleteDoc(doc(db, COUPONS_COLLECTION, couponId));
        
        // Invalidar caché
        invalidateCacheByType('coupons');
        
        return true;
    } catch (error) {
        console.error('Error deleting coupon:', error);
        throw error;
    }
};

// Obtener cupones activos (para mostrar en frontend si es necesario)
export const getActiveCoupons = async () => {
    try {
        const q = query(
            collection(db, COUPONS_COLLECTION),
            where('active', '==', true)
        );
        const querySnapshot = await getDocs(q);
        const now = new Date();

        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(coupon => {
                // Filtrar por fecha
                if (coupon.expirationDate) {
                    const expDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
                    if (now > expDate) return false;
                }
                if (coupon.startDate) {
                    const startDate = coupon.startDate.toDate ? coupon.startDate.toDate() : new Date(coupon.startDate);
                    if (now < startDate) return false;
                }
                // Filtrar por usos
                if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return false;
                return true;
            });
    } catch (error) {
        console.error('Error fetching active coupons:', error);
        return [];
    }
};

// Obtener cupón de bienvenida activo (para nuevos usuarios)
export const getWelcomeCoupon = async (userId = null) => {
    try {
        const q = query(
            collection(db, COUPONS_COLLECTION),
            where('active', '==', true),
            where('isWelcomeCoupon', '==', true)
        );
        const querySnapshot = await getDocs(q);
        const now = new Date();

        const validCoupons = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(coupon => {
                // Filtrar por fecha
                if (coupon.expirationDate) {
                    const expDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
                    if (now > expDate) return false;
                }
                if (coupon.startDate) {
                    const startDate = coupon.startDate.toDate ? coupon.startDate.toDate() : new Date(coupon.startDate);
                    if (now < startDate) return false;
                }
                // Filtrar por usos
                if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return false;
                // Si es de uso único por usuario, verificar si ya lo usó
                if (coupon.singleUsePerUser && userId) {
                    const usedBy = coupon.usedBy || [];
                    if (usedBy.includes(userId)) return false;
                }
                return true;
            });

        // Retornar el primer cupón de bienvenida válido
        return validCoupons.length > 0 ? validCoupons[0] : null;
    } catch (error) {
        console.error('Error fetching welcome coupon:', error);
        return null;
    }
};

/**
 * Agrega el cupón de bienvenida a un usuario específico
 * Crea una copia del cupón plantilla para el usuario
 */
export const grantWelcomeCoupon = async (userId) => {
    if (!userId) return null;

    try {
        const welcomeTemplate = await getWelcomeCoupon();
        if (!welcomeTemplate) {
            return null;
        }

        // Crear una copia específica para el usuario
        // No queremos que esta copia personal sea 'isWelcomeCoupon' true para no viciar las consultas globales
        const personalCoupon = {
            code: welcomeTemplate.code, // Mismo código o podríamos generar uno único?
            // El usuario quiere que use el mismo código pero que le "llegue" (aparezca en su lista)
            type: welcomeTemplate.type,
            value: welcomeTemplate.value,
            description: welcomeTemplate.description || '¡Tu regalo de bienvenida!',
            active: true,
            minPurchase: welcomeTemplate.minPurchase || 0,
            maxDiscount: welcomeTemplate.maxDiscount || null,
            maxUses: 1, // La copia personal es de un solo uso
            usedCount: 0,
            usedBy: [],
            isWelcomeCoupon: false, // Es una copia, no el template original
            singleUsePerUser: true,
            generatedBy: userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, COUPONS_COLLECTION), personalCoupon);
        
        // Invalidar caché
        invalidateCacheByType('coupons');
        
        return { id: docRef.id, ...personalCoupon };
    } catch (error) {
        console.error('Error granting welcome coupon:', error);
        return null;
    }
};

// Obtener cupón con banner activo (para mostrar en la página principal)
export const getBannerCoupon = async () => {
    try {
        // NOTA: Consultamos solo por showInBanner para evitar requerir un índice compuesto
        // Filtramos 'active' en memoria
        const q = query(
            collection(db, COUPONS_COLLECTION),
            where('showInBanner', '==', true)
        );
        const querySnapshot = await getDocs(q);
        const now = new Date();

        const validCoupons = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(coupon => {
                // Filtrar inactivos
                if (!coupon.active) return false;

                const isValidDate = (d) => {
                    if (!d) return false;
                    try {
                        const date = d.toDate ? d.toDate() : new Date(d);
                        return !isNaN(date.getTime());
                    } catch { return false; }
                };

                const getDate = (d) => {
                    try {
                        return d.toDate ? d.toDate() : new Date(d);
                    } catch { return null; }
                };

                const now = new Date();

                // Filtrar por fecha de expiración
                if (isValidDate(coupon.expirationDate)) {
                    const expDate = getDate(coupon.expirationDate);
                    if (expDate && now > expDate) return false;
                }

                // Filtrar por fecha de inicio
                if (isValidDate(coupon.startDate)) {
                    const startDate = getDate(coupon.startDate);
                    if (startDate && now < startDate) return false;
                }
                // Filtrar por usos
                if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return false;
                return true;
            });

        // Retornar el primer cupón con banner válido
        return validCoupons.length > 0 ? validCoupons[0] : null;
    } catch (error) {
        console.error('Error fetching banner coupon:', error);
        return null;
    }
};

// Vincular un cupón huérfano a un usuario
export const linkCouponToUser = async (couponCode, userId) => {
    if (!couponCode || !userId) return false;
    try {
        const coupon = await getCouponByCode(couponCode);
        if (coupon && !coupon.generatedBy) {
            const couponRef = doc(db, COUPONS_COLLECTION, coupon.id);
            await updateDoc(couponRef, {
                generatedBy: userId,
                updatedAt: Timestamp.now()
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error linking coupon:', error);
        return false;
    }
};

// Obtener cupones generados por un usuario específico (que aún estén activos y no usados)
export const getUserCoupons = async (userId) => {
    if (!userId) return [];
    try {
        // Consultamos solo por generatedBy para evitar requerir un índice compuesto
        const q = query(
            collection(db, COUPONS_COLLECTION),
            where('generatedBy', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const now = new Date();

        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(coupon => {
                // Solo cupones activos
                if (coupon.active === false) return false;

                // Solo cupones que no han sido usados el máximo de veces
                if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return false;
                
                // Solo cupones no expirados
                if (coupon.expirationDate) {
                    const expDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
                    if (now > expDate) return false;
                }
                
                return true;
            })
            .sort((a, b) => {
                // Ordenar por fecha de creación (descendiente)
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });
    } catch (error) {
        console.error('Error fetching user coupons:', error);
        return [];
    }
};
