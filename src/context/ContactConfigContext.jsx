import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { WHATSAPP_PHONE, WHATSAPP_PHONE_ALT } from '../config/whatsappMessages';

const ContactConfigContext = createContext();

export const useContactConfig = () => {
    const context = useContext(ContactConfigContext);
    if (!context) {
        throw new Error('useContactConfig debe ser usado dentro de ContactConfigProvider');
    }
    return context;
};

export const ContactConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({
        whatsappPhone: WHATSAPP_PHONE,
        whatsappPhoneAlt: WHATSAPP_PHONE_ALT,
        loading: true
    });

    useEffect(() => {
        // Referencia al documento de configuración
        const configRef = doc(db, 'config', 'contact');

        // Listener en tiempo real para cambios en la configuración
        const unsubscribe = onSnapshot(configRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setConfig({
                        whatsappPhone: data.whatsappPhone || WHATSAPP_PHONE,
                        whatsappPhoneAlt: data.whatsappPhoneAlt || WHATSAPP_PHONE_ALT,
                        loading: false
                    });
                } else {
                    // Si no existe el documento, crearlo con valores por defecto
                    initializeConfig(configRef);
                }
            },
            (error) => {
                console.error('Error al cargar configuración de contacto:', error);
                setConfig(prev => ({ ...prev, loading: false }));
            }
        );

        return () => unsubscribe();
    }, []);

    const initializeConfig = async (configRef) => {
        try {
            const defaultConfig = {
                whatsappPhone: WHATSAPP_PHONE,
                whatsappPhoneAlt: WHATSAPP_PHONE_ALT,
                updatedAt: new Date().toISOString()
            };

            await setDoc(configRef, defaultConfig);

            setConfig({
                ...defaultConfig,
                loading: false
            });

        } catch (error) {
            console.error('Error al inicializar configuración:', error);
            setConfig(prev => ({ ...prev, loading: false }));
        }
    };

    const updateWhatsAppPhone = async (newPhone) => {
        try {
            const configRef = doc(db, 'config', 'contact');
            await setDoc(configRef, {
                whatsappPhone: newPhone,
                whatsappPhoneAlt: config.whatsappPhoneAlt,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error al actualizar número de WhatsApp:', error);
            return false;
        }
    };

    const value = {
        whatsappPhone: config.whatsappPhone,
        whatsappPhoneAlt: config.whatsappPhoneAlt,
        loading: config.loading,
        updateWhatsAppPhone
    };

    return (
        <ContactConfigContext.Provider value={value}>
            {children}
        </ContactConfigContext.Provider>
    );
};

export default ContactConfigContext;
