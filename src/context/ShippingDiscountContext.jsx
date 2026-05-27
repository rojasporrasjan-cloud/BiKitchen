import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const ShippingDiscountContext = createContext();

export const useShippingDiscount = () => {
  const context = useContext(ShippingDiscountContext);
  if (!context) {
    throw new Error('useShippingDiscount must be used within ShippingDiscountProvider');
  }
  return context;
};

export const ShippingDiscountProvider = ({ children }) => {
  const [discountConfig, setDiscountConfig] = useState({
    enabled: false,
    percentage: 50,
    message: '🎉 50% de descuento en envío en TODOS los pedidos'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en tiempo real desde Firebase
    const configRef = doc(db, 'config', 'shippingDiscount');
    
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDiscountConfig({
          enabled: data.enabled || false,
          percentage: data.percentage || 50,
          message: data.message || '🎉 50% de descuento en envío en TODOS los pedidos'
        });
      } else {
        // Valores por defecto si no existe el documento
        setDiscountConfig({
          enabled: false,
          percentage: 50,
          message: '🎉 50% de descuento en envío en TODOS los pedidos'
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading shipping discount config:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calcular precio de envío con descuento
  const calculateShipping = (baseShippingCost) => {
    if (!discountConfig.enabled) {
      return {
        original: baseShippingCost,
        final: baseShippingCost,
        discount: 0,
        hasDiscount: false
      };
    }

    const discount = Math.round(baseShippingCost * (discountConfig.percentage / 100));
    const final = baseShippingCost - discount;

    return {
      original: baseShippingCost,
      final: final,
      discount: discount,
      hasDiscount: true,
      percentage: discountConfig.percentage
    };
  };

  const value = {
    discountConfig,
    loading,
    calculateShipping,
    isEnabled: discountConfig.enabled,
    percentage: discountConfig.percentage,
    message: discountConfig.message
  };

  return (
    <ShippingDiscountContext.Provider value={value}>
      {children}
    </ShippingDiscountContext.Provider>
  );
};
