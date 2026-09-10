/**
 * Netlify Function: sommelier
 *
 * Puente entre el asistente de la web y Gemini.
 *
 * POR QUE EXISTE: la llave vivia en `VITE_GEMINI_API_KEY`, y TODO lo que empieza
 * con VITE_ se empaqueta dentro del JavaScript que baja al navegador. Cualquiera
 * que abriera el codigo fuente de bikitchencr.com podia copiarla y gastar Google
 * AI a nombre de BiKitchen. Se comprobo el 9 de setiembre de 2026 bajando el
 * bundle de produccion: ahi estaba.
 *
 * Aca la llave se llama GEMINI_API_KEY —SIN el prefijo VITE_— para que se quede
 * en el servidor. Ese prefijo es la unica diferencia entre una llave privada y
 * una publicada.
 *
 * Variable que hay que configurar en Netlify:
 *   GEMINI_API_KEY   → la llave de Google AI Studio
 *
 * Endpoint: POST /.netlify/functions/sommelier
 */

const MODELO = 'gemini-flash-latest';
const GEMINI = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:streamGenerateContent?alt=sse`;

/** Cuanto texto se acepta de una sola vez. Un mensaje normal no llega a 2.000. */
const LIMITE_CARACTERES = 12000;

const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const LLAVE = process.env.GEMINI_API_KEY;
    if (!LLAVE) {
        console.error('[Sommelier] Falta GEMINI_API_KEY en las variables de Netlify');
        return json(503, { error: 'El asistente no está configurado.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Cuerpo inválido' });
    }

    const { systemInstruction, contents } = payload;
    if (!Array.isArray(contents) || contents.length === 0) {
        return json(400, { error: 'Falta la conversación' });
    }

    // Un tope de tamano: sin esto, cualquiera puede mandar un texto enorme desde
    // afuera y la cuenta la paga BiKitchen igual que si la llave estuviera suelta.
    const largo = JSON.stringify({ systemInstruction, contents }).length;
    if (largo > LIMITE_CARACTERES) {
        return json(413, { error: 'La conversación es demasiado larga.' });
    }

    try {
        const res = await fetch(`${GEMINI}&key=${LLAVE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: systemInstruction
                    ? { parts: [{ text: String(systemInstruction) }] }
                    : undefined,
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
            })
        });

        if (!res.ok) {
            // El detalle de Google puede traer la llave o datos de la cuenta:
            // se registra del lado del servidor y afuera va solo el codigo.
            console.error('[Sommelier] Gemini respondio', res.status, await res.text());
            return json(502, { error: 'El asistente no está disponible ahora.' });
        }

        // Se devuelve el stream TAL CUAL para que el asistente siga escribiendo
        // de a poco, como antes. Si se esperara la respuesta entera, el chat
        // pasaria de responder al instante a quedarse callado varios segundos.
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache'
            },
            body: await res.text()
        };
    } catch (err) {
        console.error('[Sommelier] Error llamando a Gemini:', err.message);
        return json(502, { error: 'El asistente no está disponible ahora.' });
    }
};
