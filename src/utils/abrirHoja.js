/**
 * Abrir la hoja de cocina o la de empaque sin llenar el navegador de pestanas.
 *
 * `window.open(url, '_blank')` abre una pestana NUEVA cada vez. Sacar la hoja
 * cuatro veces en una manana —cosa normal cuando se esta revisando— dejaba
 * cuatro pestanas iguales abiertas.
 *
 * Con un nombre de ventana, el navegador reusa la que ya existe: la primera vez
 * la abre y las siguientes le cambian el contenido. Quedan como mucho dos, una
 * para cocina y otra para empaque, que es justo lo que se quiere poder mirar al
 * mismo tiempo.
 */

/** El nombre de la ventana segun que hoja sea. Una para cocina, otra para empaque. */
export const nombreDeVentana = (url) => {
    const u = String(url || '');
    if (/view=empaque/.test(u)) return 'bikitchen-empaque';
    // Todo lo demas —cocina, las tandas, la vista completa— comparte ventana:
    // son la misma hoja mirada de distintas formas.
    return 'bikitchen-cocina';
};

/**
 * @param {string} url  la ruta de la hoja
 * @param {Window} [ventana]  solo para las pruebas
 * @returns {Window|null} la ventana, por si hay que enfocarla
 */
export const abrirHoja = (url, ventana = typeof window !== 'undefined' ? window : null) => {
    if (!ventana || !url) return null;
    const abierta = ventana.open(url, nombreDeVentana(url));
    // Si ya estaba abierta atras, el cambio de contenido no se ve solo.
    if (abierta && typeof abierta.focus === 'function') abierta.focus();
    return abierta;
};
