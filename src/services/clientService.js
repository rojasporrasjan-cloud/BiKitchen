import { db } from '../firebase/config';
import {
    doc,
    setDoc,
    serverTimestamp,
    increment,
    collection,
    query,
    where,
    getDocs,
    getDoc,
    limit,
    arrayUnion,
    arrayRemove,
    updateDoc
} from 'firebase/firestore';

/**
 * Normaliza y limpia los datos del cliente antes de guardarlos
 */
const sanitizeClientData = (data) => {
    const sanitized = {};

    if (data.nombre) sanitized.nombre = data.nombre.trim();
    if (data.correo) sanitized.correo = data.correo.trim().toLowerCase();

    // Limpiar teléfono: dejar solo números
    if (data.telefono) {
        sanitized.telefono = data.telefono.replace(/[^0-9]/g, '');
    }

    if (data.direccion) sanitized.direccion = data.direccion.trim();

    return sanitized;
};

/**
 * Verifica si un correo electrónico pertenece a una cuenta registrada en el sistema (colección 'users')
 */
export const checkSystemAccount = async (email) => {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
        const userSnap = await getDocs(usersQuery);
        if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            return {
                uid: userSnap.docs[0].id,
                role: userData.role || 'user',
                name: userData.name || userData.nombre
            };
        } else {
        }
    } catch (error) {
        console.error('[CRM] ERROR crítico al verificar cuenta de sistema:', error);
    }
    return null;
};

/**
 * Crea o actualiza un cliente en la colección 'clientes'
 * @param {Object} clientData { nombre, telefono, correo, direccion }
 * @param {boolean} isNewOrder Si es true, incrementa el contador de pedidos
 * @param {Object} options Opciones adicionales (ej: { manualTotalOrders: 10 })
 */
export const upsertClient = async (clientData, isNewOrder = true, options = {}) => {
    try {
        const sanitized = sanitizeClientData(clientData);

        if (!sanitized.correo && !sanitized.telefono) {
            console.warn('[CRM] No se puede registrar cliente sin correo ni teléfono');
            return null;
        }

        // 1. Buscar si ya existe un documento para este cliente para evitar duplicados
        let clientRef = null;
        let clientId = null;

        // Intentar buscar por correo
        if (sanitized.correo) {
            const q = query(collection(db, 'clientes'), where('correo', '==', sanitized.correo), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                clientId = snap.docs[0].id;
                clientRef = doc(db, 'clientes', clientId);
            }
        }

        // Si no se encontró por correo, intentar por teléfono
        if (!clientRef && sanitized.telefono) {
            const tel = sanitized.telefono;
            const q = query(collection(db, 'clientes'), where('telefono', 'in', [
                tel,
                tel.length > 8 ? tel.slice(-8) : tel,
                tel.length === 8 ? `506${tel}` : tel
            ]), limit(1));

            const snap = await getDocs(q);
            if (!snap.empty) {
                clientId = snap.docs[0].id;
                clientRef = doc(db, 'clientes', clientId);
            }
        }

        // 2. Si es nuevo, definir el ID sugerido (correo o tel_)
        if (!clientRef) {
            clientId = sanitized.correo || `tel_${sanitized.telefono}`;
            clientRef = doc(db, 'clientes', clientId);
        }

        const dataToSave = {
            ...sanitized,
            ultimaActividad: serverTimestamp(),
            actualizadoEn: serverTimestamp()
        };

        // Verificar si tiene cuenta de sistema vinculada
        const systemAccount = await checkSystemAccount(sanitized.correo);
        if (systemAccount) {
            dataToSave.tieneCuenta = true;
            dataToSave.uid = systemAccount.uid;
        }

        const finalData = {
            ...dataToSave,
            fechaRegistro: serverTimestamp()
        };

        // Gestionar el conteo de pedidos
        if (options.manualTotalOrders !== undefined) {
            finalData.totalPedidos = options.manualTotalOrders;
        } else {
            finalData.totalPedidos = isNewOrder ? increment(1) : increment(0);
        }

        await setDoc(clientRef, finalData, { merge: true });
        return clientId;
    } catch (error) {
        console.error('[CRM] Error al registrar cliente:', error);
        return null;
    }
};

/**
 * Busca un cliente por correo o teléfono
 */
export const findClient = async (identifier) => {
    try {
        const cleanId = identifier.trim().toLowerCase();

        // 1. Intentar por ID directo (correo)
        const directRef = doc(db, 'clientes', cleanId);
        const directSnap = await getDocs(query(collection(db, 'clientes'), where('correo', '==', cleanId), limit(1)));

        if (!directSnap.empty) {
            return { id: directSnap.docs[0].id, ...directSnap.docs[0].data() };
        }

        // 2. Intentar por teléfono (limpio)
        const cleanTel = cleanId.replace(/[^0-9]/g, '');
        if (cleanTel) {
            const telQuery = query(collection(db, 'clientes'), where('telefono', '==', cleanTel), limit(1));
            const telSnap = await getDocs(telQuery);
            if (!telSnap.empty) {
                return { id: telSnap.docs[0].id, ...telSnap.docs[0].data() };
            }
        }

        return null;
    } catch (error) {
        console.error('[CRM] Error al buscar cliente:', error);
        return null;
    }
};

/**
 * Busca clientes cuyo nombre comience con el término de búsqueda
 */
export const searchClientByName = async (nameQuery) => {
    try {
        if (!nameQuery || nameQuery.trim().length < 3) return [];
        
        // Convert to typical case or just search directly.
        // Firestore is case-sensitive, so we assume the name is capitalized exactly as typed, 
        // or we can fetch a bit and filter in memory if the list is small.
        // Given BiKitchen, let's fetch all clients and filter in memory for robust case-insensitive search.
        const q = query(collection(db, 'clientes'), limit(500));
        const snap = await getDocs(q);
        
        const searchLower = nameQuery.trim().toLowerCase();
        const matches = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            if (data.nombre && data.nombre.toLowerCase().includes(searchLower)) {
                matches.push({ id: doc.id, ...data });
            }
        });
        
        return matches;
    } catch (error) {
        console.error('[CRM] Error al buscar cliente por nombre:', error);
        return [];
    }
};

/**
 * Envía una notificación personalizada a un cliente
 */
export const sendClientNotification = async (clientId, notification) => {
    try {
        // Logica de resolución de ID: El frontend (NotificationPopupManager)
        // escucha sobre el correo electrónico en minúsculas.
        // Si el clientId recibido NO es un correo, intentamos buscar el documento 
        // del cliente para ver si tiene uno vinculado.

        let targetId = clientId;
        if (!clientId.includes('@')) {
            const clientSnap = await getDoc(doc(db, 'clientes', clientId));
            if (clientSnap.exists() && clientSnap.data().correo) {
                targetId = clientSnap.data().correo.toLowerCase();
            }
        }

        const clientRef = doc(db, 'clientes', targetId);
        const newNotification = {
            id: `notif_${Date.now()}`,
            date: new Date().toISOString(),
            dismissed: false,
            ...notification
        };

        // Usamos setDoc con merge para asegurar que el documento exista
        await setDoc(clientRef, {
            notifications: arrayUnion(newNotification),
            actualizadoEn: serverTimestamp(),
            ultimaActividad: serverTimestamp()
        }, { merge: true });

        return newNotification;
    } catch (error) {
        console.error('[CRM] Error enviando notificación:', error);
        throw error;
    }
};

/**
 * Marca una notificación como leída/descartada
 */
export const dismissNotification = async (clientId, notificationId) => {
    try {
        const clientRef = doc(db, 'clientes', clientId);
        const clientSnap = await getDoc(clientRef);

        if (clientSnap.exists()) {
            const data = clientSnap.data();
            const notifications = data.notifications || [];
            const updated = notifications.map(n =>
                n.id === notificationId ? { ...n, dismissed: true } : n
            );

            await updateDoc(clientRef, {
                notifications: updated,
                actualizadoEn: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('[CRM] Error descartando notificación:', error);
    }
};

/**
 * Ajusta los puntos de un cliente
 */
export const updateClientPoints = async (clientId, pointsDelta, reason) => {
    try {
        const clientRef = doc(db, 'clientes', clientId);

        // 1. Actualizar en colección 'clientes' (CRM)
        await setDoc(clientRef, {
            totalPuntos: increment(pointsDelta),
            actualizadoEn: serverTimestamp(),
            ultimaActividad: serverTimestamp(),
            puntosLog: arrayUnion({
                date: new Date().toISOString(),
                delta: pointsDelta,
                reason: reason || 'Ajuste manual por administrador'
            })
        }, { merge: true });

        // 2. Sincronizar con colección 'loyalty' (Lo que ve el usuario)
        // Buscamos si el cliente tiene un correo electrónico para indexar en loyalty
        let email = clientId.includes('@') ? clientId : null;
        if (!email) {
            const snap = await getDoc(clientRef);
            if (snap.exists()) email = snap.data().correo;
        }

        if (email) {
            const cleanEmail = email.toLowerCase().trim();
            const loyaltyRef = doc(db, 'loyalty', cleanEmail);
            const loyaltySnap = await getDoc(loyaltyRef);

            const pointsEntry = {
                id: `admin-adj-${Date.now()}`,
                type: pointsDelta > 0 ? 'earned' : 'redeemed',
                points: pointsDelta,
                description: reason || 'Ajuste manual por administrador',
                date: new Date().toISOString()
            };

            if (loyaltySnap.exists()) {
                // Si existe, actualizamos
                await updateDoc(loyaltyRef, {
                    currentPoints: increment(pointsDelta),
                    totalEarned: pointsDelta > 0 ? increment(pointsDelta) : increment(0),
                    history: arrayUnion(pointsEntry),
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Si no existe, creamos el documento inicial para que el usuario no empiece de cero si ya le regalamos puntos
                await setDoc(loyaltyRef, {
                    currentPoints: pointsDelta,
                    totalEarned: pointsDelta > 0 ? pointsDelta : 0,
                    totalRedeemed: pointsDelta < 0 ? Math.abs(pointsDelta) : 0,
                    history: [pointsEntry],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        }

        return true;
    } catch (error) {
        console.error('[CRM] Error actualizando puntos:', error);
        throw error;
    }
};
