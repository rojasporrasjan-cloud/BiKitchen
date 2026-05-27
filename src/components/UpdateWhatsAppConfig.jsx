import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useContactConfig } from '../context/ContactConfigContext';

export default function UpdateWhatsAppConfig() {
    const { whatsappPhone, whatsappPhoneAlt } = useContactConfig();
    const [updating, setUpdating] = useState(false);

    const updateToTestNumber = async () => {
        setUpdating(true);
        try {
            const configRef = doc(db, 'config', 'contact');
            await setDoc(configRef, {
                whatsappPhone: '50685067200',
                whatsappPhoneAlt: '50688311500',
                updatedAt: new Date().toISOString(),
                description: 'Configuración de números de WhatsApp para BiKitchen'
            });
            alert('✅ Número actualizado a 8506-7200');
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            background: 'white',
            padding: '20px',
            border: '2px solid #333',
            borderRadius: '10px',
            zIndex: 9999,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Configuración WhatsApp</h3>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Número actual:</strong> {whatsappPhone}
            </p>
            <button
                onClick={updateToTestNumber}
                disabled={updating}
                style={{
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginTop: '10px'
                }}
            >
                {updating ? 'Actualizando...' : '🔄 Actualizar a 8506-7200'}
            </button>
        </div>
    );
}
