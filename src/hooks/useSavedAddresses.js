import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bikitchen_saved_addresses';

export default function useSavedAddresses() {
    const [addresses, setAddresses] = useState([]);

    // Cargar direcciones del localStorage al iniciar
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setAddresses(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading saved addresses:', error);
        }
    }, []);

    // Guardar en localStorage cuando cambian las direcciones
    const saveToStorage = (newAddresses) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
        } catch (error) {
            console.error('Error saving addresses:', error);
        }
    };

    // Agregar nueva dirección (máximo 5)
    const addAddress = (address) => {
        if (addresses.length >= 5) {
            console.warn('[useSavedAddresses] Límite de 5 direcciones alcanzado.');
            return null;
        }
        const newAddress = {
            id: Date.now().toString(),
            ...address,
            isDefault: addresses.length === 0, // Primera dirección es default
            createdAt: new Date().toISOString()
        };

        const newAddresses = [...addresses, newAddress];
        setAddresses(newAddresses);
        saveToStorage(newAddresses);
        return newAddress;
    };

    // Actualizar dirección existente
    const updateAddress = (id, updates) => {
        const newAddresses = addresses.map(addr => 
            addr.id === id ? { ...addr, ...updates } : addr
        );
        setAddresses(newAddresses);
        saveToStorage(newAddresses);
    };

    // Eliminar dirección
    const deleteAddress = (id) => {
        const addressToDelete = addresses.find(a => a.id === id);
        let newAddresses = addresses.filter(addr => addr.id !== id);
        
        // Si eliminamos la default, hacer default la primera que quede
        if (addressToDelete?.isDefault && newAddresses.length > 0) {
            newAddresses[0].isDefault = true;
        }
        
        setAddresses(newAddresses);
        saveToStorage(newAddresses);
    };

    // Establecer dirección por defecto
    const setDefaultAddress = (id) => {
        const newAddresses = addresses.map(addr => ({
            ...addr,
            isDefault: addr.id === id
        }));
        setAddresses(newAddresses);
        saveToStorage(newAddresses);
    };

    // Obtener dirección por defecto
    const getDefaultAddress = () => {
        return addresses.find(addr => addr.isDefault) || addresses[0] || null;
    };

    return {
        addresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        getDefaultAddress,
        hasAddresses: addresses.length > 0
    };
}
