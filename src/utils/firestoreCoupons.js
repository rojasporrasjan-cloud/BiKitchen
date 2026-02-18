import { db } from '../firebase/config';
import { cachedFetch } from './firestoreCache';
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
    arrayUnion
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
export const validateCoupon = async (code, cartTotal, userId = null) => {
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
        if (coupon.singleUsePerUser) {
            if (!userId) {
                return { valid: false, error: 'Debes iniciar sesión para usar este cupón' };
            }

            const usedBy = coupon.usedBy || [];
            if (usedBy.includes(userId)) {
                return { valid: false, error: 'Ya has utilizado este cupón anteriormente' };
            }
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

        switch (coupon.type) {
            case 'percentage':
                discount = Math.round(cartTotal * (coupon.value / 100));
                // Aplicar máximo de descuento si existe
                if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                    discount = coupon.maxDiscount;
                }
                discountText = `${coupon.value}% de descuento`;
                break;
            case 'fixed':
                discount = coupon.value;
                discountText = `₡${coupon.value.toLocaleString('es-CR')} de descuento`;
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
export const useCoupon = async (couponId, userId = null) => {
    try {
        const couponRef = doc(db, COUPONS_COLLECTION, couponId);
        const updates = {
            usedCount: increment(1),
            lastUsed: Timestamp.now()
        };

        // Si se proporciona userId, agregarlo al array de usuarios que han usado el cupón
        if (userId) {
            updates.usedBy = arrayUnion(userId);
        }

        await updateDoc(couponRef, updates);
        return true;
    } catch (error) {
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
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // Verificar que el código no exista
        const existing = await getCouponByCode(newCoupon.code);
        if (existing) {
            throw new Error('Ya existe un cupón con este código');
        }

        const docRef = await addDoc(collection(db, COUPONS_COLLECTION), newCoupon);
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
