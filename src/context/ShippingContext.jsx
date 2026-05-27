import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SHIPPING_ZONES as INITIAL_ZONES } from '../data/shippingZones';

const ShippingContext = createContext();

export const useShipping = () => {
    const context = useContext(ShippingContext);
    if (!context) {
        throw new Error('useShipping debe ser usado dentro de ShippingProvider');
    }
    return context;
};

export const ShippingProvider = ({ children }) => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const zonesRef = collection(db, 'shipping_zones');

        // Listener en tiempo real para las zonas de envío
        const unsubscribe = onSnapshot(zonesRef, (snapshot) => {
            if (snapshot.empty) {
                // Si la colección está vacía, inicializar con los datos estáticos
                initializeShippingZones();
            } else {
                const zonesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Ordenar por provincia y nombre para consistencia
                zonesData.sort((a, b) => {
                    if (a.province !== b.province) {
                        return a.province.localeCompare(b.province);
                    }
                    return a.name.localeCompare(b.name);
                });
                setZones(zonesData);
                setLoading(false);
            }
        }, (error) => {
            console.error('Error loading shipping zones:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const initializeShippingZones = async () => {
        console.log('📦 Inicializando zonas de envío en Firestore...');
        setLoading(true);
        try {
            const batch = writeBatch(db);
            INITIAL_ZONES.forEach(zone => {
                const zoneRef = doc(db, 'shipping_zones', zone.id);
                batch.set(zoneRef, {
                    ...zone,
                    updatedAt: new Date().toISOString()
                });
            });
            await batch.commit();
            console.log('✅ Zonas de envío inicializadas exitosamente');
            return { success: true };
        } catch (error) {
            console.error('Error initializing shipping zones:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const updateZonePrice = async (zoneId, newPrice) => {
        try {
            const zoneRef = doc(db, 'shipping_zones', zoneId);
            await setDoc(zoneRef, {
                cost: Number(newPrice),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Error updating zone price:', error);
            return { success: false, error: error.message };
        }
    };

    const addNewZone = async (zoneData) => {
        try {
            const id = zoneData.name.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .replace(/\s+/g, '-');

            const zoneRef = doc(db, 'shipping_zones', id);
            await setDoc(zoneRef, {
                ...zoneData,
                id,
                cost: Number(zoneData.cost),
                updatedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            console.error('Error adding new zone:', error);
            return { success: false, error: error.message };
        }
    };

    const getZoneById = (id) => zones.find(z => z.id === id);

    const getShippingCost = (id) => {
        const zone = getZoneById(id);
        return zone ? zone.cost : 0;
    };

    const zoneRequiresContact = (id) => {
        const zone = getZoneById(id);
        return zone ? zone.requiresContact : false;
    };

    const value = {
        zones,
        loading,
        updateZonePrice,
        addNewZone,
        initializeShippingZones,
        getZoneById,
        getShippingCost,
        zoneRequiresContact,
        SHIPPING_ZONES: zones // Mantener compatibilidad con el nombre anterior
    };

    return (
        <ShippingContext.Provider value={value}>
            {children}
        </ShippingContext.Provider>
    );
};

export default ShippingContext;
