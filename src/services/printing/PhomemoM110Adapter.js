/**
 * Adaptador real: Phomemo M110 por Web Bluetooth.
 *
 * Implementa la misma interfaz que MockPrinterAdapter (ver PrinterAdapter.js),
 * así que la cola y la pantalla no distinguen uno de otro.
 *
 * SIN VALIDAR CONTRA PAPEL. El protocolo está tomado de dos proyectos de
 * reverse-engineering y los bytes se verificaron byte a byte contra
 * tools/phomemo/print_test.py, pero hasta que no salga una etiqueta física
 * bien impresa esto no se puede dar por bueno.
 *
 * Limitaciones de Web Bluetooth, a tener presentes:
 *   - Solo Chrome y Edge. Firefox y Safari no lo soportan.
 *   - Exige HTTPS o localhost.
 *   - `requestDevice()` tiene que salir de un clic real del usuario, por eso
 *     está separado de `connect()`: la cola llama a connect() después de varios
 *     `await` y para entonces el navegador ya no acepta abrir el diálogo.
 *   - La M110 no informa por BLE si el papel salió bien. Lo máximo que podemos
 *     afirmar es que aceptó los bytes.
 */

import { PRINTER_STATUS } from './PrinterAdapter';
import {
    BLE_SERVICE_UUID, BLE_ADVERTISED_SERVICE_UUID, BLE_WRITE_UUID, BLE_NOTIFY_UUID,
    CHUNK_SIZE, CHUNK_MINIMO, CHUNK_DELAY_MS, HEAD_DOTS, HEAD_BYTES, SERVICIOS_CONOCIDOS,
    cmdInit, cmdSpeed, cmdDensity, cmdMediaLabels, cmdRasterHeader, cmdFooter, packRaster
} from './phomemoProtocol';
import { renderLabel, canvasToMonochrome, mmToPx } from '../../utils/labels/labelRenderer';
import { DEFAULT_SETTINGS } from './printerSettings';
import { pausaEntreEtiquetasMs } from './tiempoDeEtiqueta';

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Cuánto se espera a que el Bluetooth conteste antes de darlo por perdido.
 *
 * `gatt.connect()` NO tiene tiempo límite: en Android, si la impresora está
 * dormida, lejos o agarrada por otro teléfono, se queda esperando para siempre
 * y la pantalla muestra "Conectando…" sin fin (Jan, 29 set 2026: "se queda
 * mucho rato en conectando"). Con límite, a los pocos segundos se reintenta o
 * se dice qué pasa.
 */
export const ESPERA_CONEXION_MS = 8000;
export const ESPERA_SERVICIO_MS = 5000;

/** La promesa, o un error claro si no contesta a tiempo. */
export const conLimite = (promesa, ms, queEspera) => {
    let reloj;
    const limite = new Promise((_, rechazar) => {
        reloj = setTimeout(
            () => rechazar(new Error(`La impresora no contestó (${queEspera}). ¿Está prendida y cerca del teléfono?`)),
            ms
        );
    });
    return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
};

/**
 * ¿Este error es que se cayó el Bluetooth?
 *
 * Chrome lo dice en inglés ("GATT Server is disconnected") y el adaptador en
 * español ("La impresora se desconectó"). El reintento miraba solo el inglés,
 * así que el caso más común —la sesión muerta antes del primer byte— se iba
 * derecho al error sin intentar reconectar: 0 de 7680 bytes y a empezar de
 * nuevo a mano.
 */
export const esCaida = (err) => /disconnect|desconect|gatt server/i.test(String(err?.message || ''));

/**
 * ¿El teléfono rechazó la escritura porque la impresora no está vinculada?
 *
 * "Pide conectarse de nuevo aun estando conectada y no manda nada" — Jan, 29
 * set 2026, con un Xiaomi. Algunas impresoras exigen vinculación para la
 * escritura CON acuse: Android contesta abriendo el aviso de "vincular" y
 * Chrome recibe el error. La app lo tomaba como bloque muy grande y reintentaba
 * cuatro veces más —cuatro avisos más— sin mandar nada nunca.
 */
export const pideVincular = (err) =>
    /not authori[sz]ed|not paired|not permitted|authenticat|encrypt|insufficient|vincul|bond/i
        .test(String(err?.message || ''));

export const MENSAJE_VINCULAR = 'El teléfono pide vincular la impresora. En el aviso de Android tocá '
    + '"Vincular" UNA vez y volvé a darle Imprimir. Si no aparece el aviso: Ajustes → Bluetooth → '
    + 'olvidá la impresora y conectá de nuevo desde esta pantalla.';

/** Cuál impresora se eligió la última vez, para volver a ella sin preguntar. */
const DEVICE_KEY = 'bikitchen_printer_device_id';
const DEVICE_NAME_KEY = 'bikitchen_printer_device_name';

/** Nombre de la última impresora usada, aunque el navegador ya no la recuerde. */
export const ultimaImpresora = () => {
    try { return localStorage.getItem(DEVICE_NAME_KEY); } catch { return null; }
};

/**
 * ¿Puede el navegador reconectar sin volver a preguntar?
 *
 * Chrome solo expone `getDevices()` con la opción
 * chrome://flags/#enable-web-bluetooth-new-permissions-backend activada.
 * Sin eso, tras recargar hay que autorizar la impresora de nuevo con un clic.
 */
export const puedeReconectarSolo = () =>
    !!(typeof navigator !== 'undefined' && navigator.bluetooth && navigator.bluetooth.getDevices);

export const webBluetoothDisponible = () =>
    typeof navigator !== 'undefined' && !!navigator.bluetooth;

export class PhomemoM110Adapter {
    /**
     * @param settings - ver printerSettings.js (tamaño, corrimientos, densidad)
     * @param logo - canvas de prepareLogo(), o null para usar el texto
     */
    constructor(settings = {}, logo = null) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.logo = logo;

        this.status = PRINTER_STATUS.DISCONNECTED;
        this.isSimulated = false;
        this.name = 'Phomemo M110';
        this.device = null;
        this.characteristic = null;
        this.notifyChar = null;
        // Lo último que contestó la impresora. Sirve para diagnosticar sin
        // tener que abrir la consola del navegador.
        this.lastResponses = [];
        this.bytesSent = 0;
        this.labelsPrinted = 0;
        // Cuanto acepta ESTA impresora de un golpe. Dos unidades del mismo
        // modelo pueden negociar distinto con el Bluetooth de la maquina, asi
        // que arranca en lo de siempre y baja sola si se queja.
        this.maxChunk = CHUNK_SIZE;
        // Si el teléfono exige vínculo para escribir con acuse, se pasa a
        // escribir sin acuse durante esta sesión (ver `pideVincular`).
        this.sinAcuse = false;
        // Lo que fue pasando al conectar e imprimir, para que la pantalla lo
        // muestre: en un teléfono no hay consola, y sin esto no hay forma de
        // saber en qué paso se quedó.
        this.bitacora = [];
    }

    /** Anota un paso en la bitácora (las últimas 30). */
    anotar(texto) {
        const hora = new Date().toTimeString().slice(0, 8);
        this.bitacora.push(`${hora} ${texto}`);
        if (this.bitacora.length > 30) this.bitacora.shift();
    }

    /**
     * Abre el diálogo del navegador para elegir la impresora.
     * TIENE que llamarse desde el manejador de un clic.
     *
     * @param {boolean} mostrarTodos - si el filtro por nombre no la encuentra
     */
    /**
     * Recupera la impresora ya autorizada, sin diálogo ni clic.
     *
     * Al recargar la página se pierde el objeto del dispositivo y había que
     * volver a elegirlo a mano cada vez. Chrome recuerda lo que ya autorizaste
     * y lo devuelve por `getDevices()`, así que la reconexión es automática.
     *
     * Devuelve el nombre si la encontró, o null si hay que pedirla de nuevo.
     */
    async restoreDevice() {
        if (!webBluetoothDisponible() || !navigator.bluetooth.getDevices) return null;

        try {
            const conocidos = await navigator.bluetooth.getDevices();
            if (!conocidos || conocidos.length === 0) return null;

            // Si la guardada no esta, NO se agarra la primera que aparezca.
            //
            // Con `|| conocidos[0]` la pagina se conectaba en silencio a otra
            // impresora autorizada antes —la vieja, apagada o dormida— y desde
            // afuera se veia "conectada" pero cada escritura fallaba con "GATT
            // operation failed". Mejor pedir que la elija y saber a cual va.
            const guardado = localStorage.getItem(DEVICE_KEY);
            const elegido = conocidos.find(d => d.id === guardado)
                || (conocidos.length === 1 ? conocidos[0] : null);
            if (!elegido) return null;

            this.device = elegido;
            this.name = elegido.name || 'Phomemo M110';
            this.device.addEventListener('gattserverdisconnected', () => {
                this.status = PRINTER_STATUS.DISCONNECTED;
                this.characteristic = null;
            });
            return this.name;
        } catch (err) {
            console.warn('[M110] No se pudo recuperar la impresora autorizada:', err.message);
            return null;
        }
    }

    async requestDevice(mostrarTodos = false) {
        if (!webBluetoothDisponible()) {
            throw new Error('Este navegador no soporta Web Bluetooth. Usá Chrome o Edge.');
        }

        // Se filtra por lo que la impresora ANUNCIA (af30 y su número de serie),
        // no por el servicio de impresión ff00: ese solo aparece una vez
        // conectada, así que filtrar por él dejaba el diálogo vacío.
        // Se piden TODOS los servicios conocidos, no solo los de la M110.
        //
        // Chrome unicamente deja mirar lo que se pidio de antemano: con la
        // lista corta, una impresora que no fuera exactamente la M110 quedaba
        // muda —ni conectaba ni se le podia diagnosticar nada—. Pedir de mas no
        // cuesta: los que no existan simplemente no aparecen.
        const opciones = mostrarTodos
            ? { acceptAllDevices: true, optionalServices: SERVICIOS_CONOCIDOS }
            : {
                filters: [
                    { services: [BLE_ADVERTISED_SERVICE_UUID] },
                    { namePrefix: 'M110' },
                    { namePrefix: 'M150' },
                    { namePrefix: 'Phomemo' },
                    { namePrefix: 'Q' }   // la serie con la que se anuncian
                ],
                optionalServices: SERVICIOS_CONOCIDOS
            };

        this.device = await navigator.bluetooth.requestDevice(opciones);
        this.name = this.device.name || 'Phomemo M110';
        // Recordarla para reconectar sola después de recargar la página.
        try {
            localStorage.setItem(DEVICE_KEY, this.device.id);
            localStorage.setItem(DEVICE_NAME_KEY, this.name);
        } catch { /* opcional */ }

        this.device.addEventListener('gattserverdisconnected', () => {
            this.status = PRINTER_STATUS.DISCONNECTED;
            this.characteristic = null;
        });

        return this.device.name;
    }

    async connect() {
        if (!this.device) {
            throw new Error('Todavía no elegiste la impresora. Tocá "Conectar impresora" primero.');
        }

        if (this.characteristic && this.device.gatt?.connected) {
            this.status = PRINTER_STATUS.READY;
            return;
        }

        // Una sola conexión a la vez. Al abrir la página se reconecta sola y a
        // la vez uno puede tocar "Conectar" o "Imprimir": dos `gatt.connect()`
        // encimados en Android se traban entre ellos. El segundo espera al
        // primero en vez de abrir otro.
        if (this.conexionEnCurso) return this.conexionEnCurso;
        this.conexionEnCurso = this.#conectarConReintento()
            .finally(() => { this.conexionEnCurso = null; });
        return this.conexionEnCurso;
    }

    /** Dos intentos; entre uno y otro se suelta la sesión que quedó a medias. */
    async #conectarConReintento() {
        this.status = PRINTER_STATUS.CONNECTING;
        let ultimo = null;
        for (let intento = 1; intento <= 2; intento += 1) {
            try {
                await this.#abrirSesion();
                this.status = PRINTER_STATUS.READY;
                return;
            } catch (err) {
                ultimo = err;
                console.warn(`[M110] Conexión, intento ${intento} de 2:`, err.message);
                this.anotar(`Conexión, intento ${intento} de 2 falló: ${err.message}`);
                this.characteristic = null;
                // Soltar lo que haya quedado colgado: en Android un intento
                // trabado bloquea el siguiente hasta que se cancela.
                try { this.device.gatt?.disconnect?.(); } catch { /* ya estaba suelta */ }
                if (intento < 2) await esperar(600);
            }
        }
        this.status = PRINTER_STATUS.ERROR;
        throw new Error(`No se pudo conectar con la impresora: ${ultimo?.message || 'sin respuesta'}`);
    }

    /** Conectar, encontrar el servicio de impresión y abrir el canal de estado. */
    async #abrirSesion() {
        this.anotar(`Conectando con ${this.device?.name || 'la impresora'}…`);
        const server = await conLimite(this.device.gatt.connect(), ESPERA_CONEXION_MS, 'al conectar');
        // Descubrir servicios inmediatamente después de conectar falla a
        // veces: la impresora necesita un instante.
        await esperar(100);
        const service = await conLimite(server.getPrimaryService(BLE_SERVICE_UUID), ESPERA_SERVICIO_MS, 'al buscar el servicio');
        this.characteristic = await conLimite(service.getCharacteristic(BLE_WRITE_UUID), ESPERA_SERVICIO_MS, 'al buscar el canal de impresión');
        const p = this.characteristic.properties || {};
        this.anotar(`Conectada. Canal de impresión: ${p.write ? 'con acuse' : ''}${p.write && p.writeWithoutResponse ? ' y ' : ''}${p.writeWithoutResponse ? 'sin acuse' : ''}`);

        // Escuchar el canal de estado ANTES de mandar nada.
        //
        // No es opcional: desde Python la impresora imprime y contesta
        // "01 01" a cada bloque, y la única diferencia con el navegador
        // —que aceptaba todo sin imprimir— era tener esta suscripción
        // abierta. La M110 parece necesitar el canal activo para procesar
        // el trabajo.
        //
        // Se reintenta: "Connection Error: Connection attempt failed" al
        // suscribirse casi siempre es que el aparato todavia no termino de
        // asentar la conexion. Rendirse al primer intento dejaba la
        // impresora aceptando bytes sin imprimir ni una etiqueta.
        this.canalDeEstado = false;
        for (let intento = 1; intento <= 3; intento += 1) {
            try {
                this.notifyChar = await service.getCharacteristic(BLE_NOTIFY_UUID);
                this.lastResponses = [];
                this.notifyChar.addEventListener('characteristicvaluechanged', (e) => {
                    const v = new Uint8Array(e.target.value.buffer);
                    this.lastResponses.push([...v].map(b => b.toString(16).padStart(2, '0')).join(' '));
                    if (this.lastResponses.length > 40) this.lastResponses.shift();
                });
                // Con límite también: en algunos Android suscribirse abre
                // el aviso de "vincular" del sistema y la promesa queda
                // colgada mientras nadie lo toca.
                await conLimite(this.notifyChar.startNotifications(), ESPERA_SERVICIO_MS, 'al abrir el canal de estado');
                this.canalDeEstado = true;
                this.anotar('Canal de estado abierto');
                break;
            } catch (err) {
                console.warn(`[M110] Canal de estado, intento ${intento} de 3:`, err.message);
                this.anotar(`Canal de estado, intento ${intento} de 3: ${err.message}`);
                this.ultimoErrorDeCanal = err.message;
                // Si es por falta de vínculo, reintentar solo abre el aviso
                // de Android otra vez.
                if (pideVincular(err)) break;
                if (intento < 3) await esperar(400 * intento);
            }
        }
        if (!this.canalDeEstado) {
            // Se sigue igual: mejor intentar imprimir que bloquear el
            // trabajo. Pero queda anotado, porque sin este canal la M110
            // acepta todo y no imprime nada, y eso hay que poder verlo.
            console.warn('[M110] Sin canal de estado. La impresora puede aceptar bytes sin imprimir.');
        }
    }

    async disconnect() {
        try {
            if (this.device?.gatt?.connected) this.device.gatt.disconnect();
        } finally {
            this.characteristic = null;
            this.status = PRINTER_STATUS.DISCONNECTED;
        }
    }

    getStatus() {
        return this.status;
    }

    /** Una sola escritura, con o sin acuse segun la configuracion. */
    async #escribirUno(c, parte) {
        // Con acuse (writeValue) el navegador espera a que la impresora
        // confirme cada bloque: eso es control de flujo de verdad. Sin acuse es
        // más rápido, pero en un lote largo se le llena el buffer y pierde
        // datos —así se cortó una etiqueta a mitad en un lote de 11—.
        if ((this.settings.reliableWrite === false || this.sinAcuse)
            && c.properties?.writeWithoutResponse
            && c.writeValueWithoutResponse) {
            try {
                await c.writeValueWithoutResponse(parte);
                return;
            } catch {
                // cae a writeValue
            }
        }
        await c.writeValue(parte);
    }

    /**
     * Manda los bytes, bajando el tamano del bloque si la impresora se queja.
     *
     * "GATT operation failed for unknown reason" es lo que contesta el Bluetooth
     * cuando el bloque va mas grande de lo que esa unidad acepta. Dos impresoras
     * del MISMO modelo pueden negociar distinto, asi que el 128 que le sirve a
     * una puede reventarle a la otra.
     *
     * Al reintentar se RETOMA donde quedo, nunca desde el principio: reenviar lo
     * que ya se acepto duplicaria pixeles y la etiqueta saldria corrida.
     */
    async #write(bytes) {
        // El enlace se pudo haber caido ENTRE que se comprobo y que se escribe:
        // en Windows pasa solo, porque el sistema intenta emparejar la impresora
        // por su cuenta y le tumba la sesion a Chrome. Antes esto tiraba de una
        // "La impresora se desconectó" con 0 de 7680 bytes y no se reintentaba
        // nada; ahora se levanta sola, que es lo que ya hacia en los demas casos.
        if (!this.characteristic) await this.#asegurarConexion();
        const c = this.characteristic;
        if (!c) throw new Error('La impresora se desconectó');

        let i = 0;
        let fallos = 0;
        while (i < bytes.length) {
            const paso = Math.max(CHUNK_MINIMO, this.maxChunk);
            const parte = bytes.slice(i, i + paso);
            try {
                await this.#escribirUno(c, parte);
                i += parte.length;
            } catch (err) {
                // Un bloque rechazado por tamano se arregla mandando menos; una
                // conexion caida, no. Bajar el bloque cuatro veces contra una
                // sesion muerta solo gastaba dos segundos antes de fallar igual.
                if (esCaida(err)) throw err;
                this.anotar(`Escritura rechazada: ${err?.message || err}`);
                // Falta de vinculo: achicar el bloque no sirve y cada intento
                // vuelve a abrir el aviso de Android. La escritura SIN acuse no
                // pasa por esa verificacion en la mayoria de estas impresoras:
                // se cambia a ese modo (con pausa entre bloques) y se sigue.
                if (pideVincular(err)) {
                    if (!this.sinAcuse && c.properties?.writeWithoutResponse && c.writeValueWithoutResponse) {
                        this.sinAcuse = true;
                        this.anotar('Cambio a escritura sin acuse para no pedir vinculación');
                        await esperar(150);
                        continue;
                    }
                    throw new Error(MENSAJE_VINCULAR);
                }
                if (this.maxChunk <= CHUNK_MINIMO || fallos >= 4) throw err;
                this.maxChunk = Math.max(CHUNK_MINIMO, Math.floor(this.maxChunk / 2));
                fallos += 1;
                console.warn(`[M110] Bloque rechazado; se baja a ${this.maxChunk} bytes.`);
                await esperar(80);
            }
        }
    }

    /**
     * Cuánto se espera entre una etiqueta y la siguiente.
     *
     * El cálculo vive en `tiempoDeEtiqueta.js`, que también lo usa el
     * calibrador. Lo importante: un número puesto a mano **no puede bajar** de
     * lo que tarda el papel. Antes sí podía, y la calibración compartida quedó
     * en 250 ms para etiquetas que necesitan 1.839: de 5 salían 3.
     */
    tiempoDeImpresionMs() {
        // Lo que sale del cabezal no es solo el alto de la etiqueta: el
        // corrimiento vertical son líneas en blanco que también se imprimen
        // (ver `#rasterizar`). Con 25 mm + 3 de corrimiento se esperaba por 25 y
        // la siguiente llegaba con la anterior saliendo todavía: la impresora
        // perdía el dibujo, avanzaba igual, y salían una sí y una en blanco
        // (Jan, 29 set 2026).
        const s = this.settings;
        const alto = Number(s.heightMm) > 0 ? Number(s.heightMm) : 20;
        const corrimiento = Math.max(0, Number(s.offsetYmm) || 0);
        const base = pausaEntreEtiquetasMs({ ...s, heightMm: alto + corrimiento });
        // Algunas impresoras (otro modelo, otro rollo) son más lentas que la
        // M110 medida. Para esas hay un interruptor en la pantalla: el doble.
        return s.impresoraLenta ? base * 2 : base;
    }

    /**
     * Pausa entre bloques de imagen.
     *
     * Con escritura confirmada no hace falta ninguna: el acuse de la impresora
     * YA es el control de flujo, y esperar además 20 ms por bloque le sumaba
     * 1,3 s a cada etiqueta sin ganar nada. Solo se espera cuando se escribe
     * sin acuse, que es cuando nadie regula el ritmo.
     */
    #pausaEntreBloques() {
        return (this.settings.reliableWrite === false || this.sinAcuse) ? CHUNK_DELAY_MS : 0;
    }

    /**
     * Etiqueta → bytes del cabezal, pasando por el mismo dibujo que la vista previa.
     *
     * Se manda siempre la línea completa del cabezal (48 bytes) con la etiqueta
     * centrada, y encima se aplica la calibración que haya configurado el
     * usuario. El corrimiento vertical son líneas en blanco al inicio: la M110
     * no tiene comando para mover el origen, así que se empuja el contenido.
     */
    #rasterizar(label) {
        const s = this.settings;
        const canvas = document.createElement('canvas');
        renderLabel(canvas, label, {
            ...s,
            logo: s.useLogo ? this.logo : null
        });
        const mono = canvasToMonochrome(canvas);

        const centrado = Math.round((HEAD_DOTS - mono.width) / 2);
        const xOffset = Math.max(0, centrado + mmToPx(s.offsetXmm || 0));

        const { data, widthBytes, lines } = packRaster(mono, xOffset, HEAD_BYTES);

        const lineasArriba = Math.max(0, mmToPx(s.offsetYmm || 0));
        if (lineasArriba === 0) return { data, widthBytes, lines };

        const conMargen = new Uint8Array(widthBytes * (lines + lineasArriba));
        conMargen.set(data, widthBytes * lineasArriba);
        return { data: conMargen, widthBytes, lines: lines + lineasArriba };
    }

    /**
     * Se asegura de que el Bluetooth siga vivo justo ANTES de escribir.
     *
     * La M110 se duerme sola despues de un rato sin recibir nada y suelta el
     * GATT. Entre que se conecta y que arranca la cola pueden pasar minutos
     * —elegir el vencimiento, revisar la lista, confirmar el lote— y para
     * entonces la conexion ya no existe: la primera escritura muere con "GATT
     * Server is disconnected" y salen 0 bytes de 7680.
     *
     * Reconectar NO necesita un clic del usuario: eso solo lo exige
     * `requestDevice`. Asi que se levanta sola y nadie se entera.
     */
    async #asegurarConexion() {
        if (this.device?.gatt?.connected && this.characteristic) return;
        if (!this.device) {
            throw new Error('Todavía no elegiste la impresora. Tocá "Conectar impresora" primero.');
        }
        // El objeto viejo apunta a una sesion muerta: se descarta para que
        // `connect()` vuelva a pedir el servicio y la caracteristica.
        this.characteristic = null;
        this.status = PRINTER_STATUS.CONNECTING;
        await this.connect();
    }

    async printLabel(label) {
        if (this.status !== PRINTER_STATUS.READY && this.status !== PRINTER_STATUS.PRINTING) {
            throw new Error('La impresora no está lista');
        }

        await this.#asegurarConexion();

        this.status = PRINTER_STATUS.PRINTING;
        this.lastResponses = [];
        this.bytesSent = 0;
        try {
            try {
                await this.#enviarEtiqueta(label);
            } catch (err) {
                if (!esCaida(err)) throw err;
                // Se cayo A MEDIA etiqueta. Se manda DE NUEVO COMPLETA, no se
                // retoma: la impresora perdio el encabezado del trabajo y lo
                // que salga de la mitad para adelante es un cuadro de basura.
                //
                // Se intenta DOS veces: en Windows la primera reconexion suele
                // caer justo mientras el sistema esta emparejando la impresora
                // por su cuenta, y a la segunda ya lo solto.
                console.warn('[M110] Se cayó a media etiqueta; se reconecta y se repite.');
                let ultimo = err;
                let salio = false;
                for (let intento = 1; intento <= 2 && !salio; intento += 1) {
                    try {
                        await esperar(300 * intento);
                        await this.#asegurarConexion();
                        this.bytesSent = 0;
                        await this.#enviarEtiqueta(label);
                        salio = true;
                    } catch (otro) {
                        ultimo = otro;
                        console.warn(`[M110] Reintento ${intento} de 2 falló:`, otro.message);
                    }
                }
                if (!salio) {
                    throw new Error(esCaida(ultimo)
                        ? 'La impresora se desconectó tres veces seguidas. Casi siempre es Windows '
                          + 'intentando emparejarla: quitala de Configuración → Bluetooth y apagá '
                          + '"Mostrar notificaciones para conectar con Swift Pair".'
                        : ultimo.message);
                }
            }

            this.labelsPrinted++;
            this.anotar(`Etiqueta enviada (${this.bytesSent} bytes${this.sinAcuse ? ', sin acuse' : ''}; la impresora contestó ${this.lastResponses.length} veces)`);
            this.status = PRINTER_STATUS.READY;
        } catch (err) {
            this.anotar(`No salió la etiqueta: ${err?.message || err}`);
            this.status = PRINTER_STATUS.ERROR;
            throw err;
        }
    }

    /** El envio de una etiqueta, de principio a fin. */
    async #enviarEtiqueta(label) {
        const { data, widthBytes, lines } = this.#rasterizar(label);

        await this.#write(cmdInit());                         await esperar(30);
        await this.#write(cmdSpeed(this.settings.speed));     await esperar(30);
        await this.#write(cmdDensity(this.settings.density)); await esperar(30);
        await this.#write(cmdMediaLabels());                  await esperar(30);
        await this.#write(cmdRasterHeader(widthBytes, lines));

        const pausaBloque = this.#pausaEntreBloques();
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const bloque = data.slice(i, i + CHUNK_SIZE);
            await this.#write(bloque);
            this.bytesSent += bloque.length;
            if (pausaBloque) await esperar(pausaBloque);
        }

        await esperar(120);
        await this.#write(cmdFooter());

        // Esperar a que el papel TERMINE de salir antes de dar la etiqueta
        // por hecha. La cola manda la siguiente en cuanto esto resuelve, y
        // si la impresora sigue ocupada, esa siguiente se pierde.
        await esperar(this.tiempoDeImpresionMs());
    }
}
