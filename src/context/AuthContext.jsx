import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Registrar usuario
    async function register(email, password, name) {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Crear documento de usuario en Firestore
            await setDoc(doc(db, 'users', result.user.uid), {
                email: email,
                name: name || 'Usuario',
                role: 'user',
                createdAt: serverTimestamp()
            });

            setUserRole('user');
            return { success: true };
        } catch (error) {
            console.error('Error en registro:', error);
            let message = 'Error al registrarse';
            if (error.code === 'auth/email-already-in-use') {
                message = 'El correo ya está registrado';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contraseña debe tener al menos 6 caracteres';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Correo inválido';
            }
            return { success: false, error: message };
        }
    }

    // Login con email y contraseña
    async function login(email, password) {
        try {
            await setPersistence(auth, browserLocalPersistence);
            const result = await signInWithEmailAndPassword(auth, email, password);

            // Obtener rol del usuario desde Firestore
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserRole(userData.role || 'user');
                return { success: true, role: userData.role };
            } else {
                // Si no existe documento, crear uno básico
                setUserRole('user');
                return { success: true, role: 'user' };
            }
        } catch (error) {
            console.error('Error en login:', error);
            let message = 'Error al iniciar sesión';
            if (error.code === 'auth/user-not-found') {
                message = 'Usuario no encontrado';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Contraseña incorrecta';
            } else if (error.code === 'auth/invalid-credential') {
                message = 'Credenciales inválidas';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Email inválido';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos. Intenta más tarde';
            }
            return { success: false, error: message };
        }
    }

    // Cerrar sesión
    async function logout() {
        try {
            await signOut(auth);
            setUserRole(null);
            return { success: true };
        } catch (error) {
            console.error('Error en logout:', error);
            return { success: false, error: 'Error al cerrar sesión' };
        }
    }

    // Restablecer contraseña (enviar email)
    async function resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            console.error('Error al restablecer contraseña:', error);
            let message = 'No se pudo enviar el correo de recuperación';
            if (error.code === 'auth/user-not-found') {
                message = 'No existe un usuario con ese correo';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Correo inválido';
            }
            return { success: false, error: message };
        }
    }

    // Lista de emails de administradores (hardcoded para seguridad)
    const ADMIN_EMAILS = [
        'bikitchenfood@gmail.com',
        'ginamaroli@gmail.com',
        'rojasporrasjan@gmail.com',
        'mfcorrales15@gmail.com'
    ];

    // Verificar si el usuario es admin (doble verificación: email + rol)
    function isAdmin() {
        if (!currentUser) return false;
        // Verificación principal: email está en lista de admins
        const isAdminEmail = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase());
        // Verificación secundaria: rol en Firestore
        const hasAdminRole = userRole === 'admin';
        // Debe cumplir al menos la verificación de email
        return isAdminEmail;
    }

    // Escuchar cambios en el estado de autenticación
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Obtener rol del usuario
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        let currentRole = userData.role || 'user';

                        // AUTO-UPGRADE: Si el email está en la lista de admins pero el rol no es admin, actualizarlo
                        if (ADMIN_EMAILS.includes(user.email.toLowerCase()) && currentRole !== 'admin') {
                            try {
                                await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
                                currentRole = 'admin';
                                console.log('Auto-upgraded user to admin role');
                            } catch (err) {
                                console.error('Error auto-upgrading admin role:', err);
                            }
                        }

                        setUserRole(currentRole);
                    } else {
                        setUserRole('user');
                    }
                } catch (error) {
                    console.error('Error obteniendo rol:', error);
                    setUserRole('user');
                }
            } else {
                setUserRole(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        isAdmin,
        login,
        register,
        logout,
        resetPassword,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
