/**
 * Plantillas de difusión guardadas en Firestore.
 *
 * Están en la base y no en el código para que se editen desde la pantalla sin
 * tener que tocar el proyecto ni volver a publicar.
 *
 * Colección: `difusion_plantillas`
 *
 * Campo importante: `nombreMeta`. Con WhatsApp Cloud API, fuera de la ventana de
 * 24 horas solo pasan plantillas aprobadas por Meta. Acá se anota cuál plantilla
 * aprobada corresponde a este texto, para que al conectar la API se sepa cuál
 * mandar. En la Fase 1 es solo una nota.
 */

import { db } from '../firebase/config';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    orderBy,
    query
} from 'firebase/firestore';

export const COLECCION_PLANTILLAS = 'difusion_plantillas';

/** Deja el objeto listo para Firestore: sin undefined y con los tipos correctos. */
const limpiar = (plantilla = {}) => ({
    nombre: String(plantilla.nombre || '').trim() || 'Sin nombre',
    texto: String(plantilla.texto || ''),
    nombreMeta: String(plantilla.nombreMeta || '').trim(),
    segmentoSugerido: plantilla.segmentoSugerido || null
});

export const listarPlantillas = async () => {
    const q = query(collection(db, COLECCION_PLANTILLAS), orderBy('nombre', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const crearPlantilla = async (plantilla) => {
    const ref = await addDoc(collection(db, COLECCION_PLANTILLAS), {
        ...limpiar(plantilla),
        createdAt: new Date().toISOString()
    });
    return ref.id;
};

export const actualizarPlantilla = async (id, plantilla) => {
    await updateDoc(doc(db, COLECCION_PLANTILLAS, id), {
        ...limpiar(plantilla),
        updatedAt: new Date().toISOString()
    });
};

export const borrarPlantilla = async (id) => {
    await deleteDoc(doc(db, COLECCION_PLANTILLAS, id));
};
