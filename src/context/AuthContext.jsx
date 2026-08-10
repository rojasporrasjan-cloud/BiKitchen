import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import {
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ADMIN_EMAILS, isSuperAdminEmail } from '../config/admins';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [loading, setLoading] = useState(true);

    const isAdmin = () => {
        if (!currentUser || !currentUser.email) return false;
        const emailToTest = currentUser.email.toLowerCase().trim();
        const isWhitelisted = ADMIN_EMAILS.includes(emailToTest);
        const hasAdminRole = userRole === 'admin' || userRole === 'ADMIN';
        // Un super admin siempre es admin: si no, quedaría fuera del panel
        // cuando su correo no esté en VITE_ADMIN_EMAILS.
        return isWhitelisted || hasAdminRole || isSuperAdminEmail(emailToTest);
    };

    /**
     * Jerarquía por encima de admin — solo el dueño ve las herramientas internas.
     * Controla visibilidad en el panel, NO permisos de Firestore.
     */
    const isSuperAdmin = () => isSuperAdminEmail(currentUser?.email);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const cleanEmail = user.email.toLowerCase().trim();
                setCurrentUser(user);

                // Forzar rol admin si el email coincide
                if (ADMIN_EMAILS.includes(cleanEmail)) {
                    setUserRole('admin');
                }

                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.role?.toLowerCase().trim() === 'admin') {
                            setUserRole('admin');
                        }
                    }
                } catch (error) {
                    // Solo log de error genérico en desarrollo
                }
            } else {
                setCurrentUser(null);
                setUserRole('user');
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // FUNCIÓN LOGIN CORE
    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            console.error("Login error:", error);
            let message = 'Error al iniciar sesión';
            if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
            if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
            if (error.code === 'auth/invalid-credential') message = 'Credenciales inválidas';
            return { success: false, error: message };
        }
    };

    // FUNCIÓN REGISTRO CORE
    const register = async (email, password, name) => {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(user, { displayName: name });

            // Crear perfil en Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email.toLowerCase(),
                displayName: name,
                role: 'user',
                createdAt: serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            console.error("Registration error:", error);
            return { success: false, error: error.message };
        }
    };

    // FUNCIÓN RECUPERAR CONTRASEÑA
    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => signOut(auth);

    const value = {
        currentUser,
        userRole,
        isAdmin,
        isSuperAdmin,
        login,
        register,
        resetPassword,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
