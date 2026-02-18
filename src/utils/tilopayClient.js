// Tilopay API client (sandbox)
// Usa las variables de entorno VITE_TILOPAY_* definidas en .env

const TILOPAY_BASE_URL = 'https://app.tilopay.com/api/v1';

const API_USER = import.meta.env.VITE_TILOPAY_API_USER;
const API_PASSWORD = import.meta.env.VITE_TILOPAY_API_PASSWORD;
const API_KEY = import.meta.env.VITE_TILOPAY_API_KEY;

if (!API_USER || !API_PASSWORD || !API_KEY) {
  console.warn('[Tilopay] Faltan credenciales en .env. Verifique VITE_TILOPAY_API_USER, VITE_TILOPAY_API_PASSWORD y VITE_TILOPAY_API_KEY');
}

async function tilopayRequest(path, options = {}) {
  const url = `${TILOPAY_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error('[Tilopay] Error parseando respuesta JSON:', e, text);
    throw new Error('Error al procesar la respuesta de Tilopay');
  }

  if (!res.ok) {
    console.error('[Tilopay] Error HTTP', res.status, json);
    const message = json.message || json.error || `Error ${res.status}`;
    throw new Error(message);
  }

  return json;
}

// Obtiene el bearer token usando /login
export async function getTilopayToken() {
  if (!API_USER || !API_PASSWORD) {
    throw new Error('Credenciales Tilopay no configuradas');
  }

  const data = await tilopayRequest('/login', {
    body: {
      apiuser: API_USER,
      password: API_PASSWORD,
    },
  });

  // La estructura exacta depende de Tilopay; asumimos que devuelve algo como { token: '...' } o { access_token: '...' }
  const token = data.token || data.access_token || data.bearer || data.Bearer;
  if (!token) {
    console.error('[Tilopay] Respuesta de login inesperada:', data);
    throw new Error('No se pudo obtener el token de Tilopay');
  }

  return token;
}

// Procesa un pago único con /processPayment
export async function processTilopayPayment({
  amount,
  currency = 'CRC',
  orderNumber,
  customer,
  redirectUrl,
}) {
  if (!API_KEY) {
    throw new Error('API Key de Tilopay no configurada');
  }

  const token = await getTilopayToken();

  const body = {
    redirect: redirectUrl,
    key: API_KEY,
    amount: amount.toFixed(2),
    currency,
    billToFirstName: customer.firstName || 'Cliente',
    billToLastName: customer.lastName || 'BiKitchen',
    billToAddress: customer.address || 'San José',
    billToAddress2: customer.address2 || '',
    billToCity: customer.city || 'San José',
    billToState: customer.state || 'SJ',
    billToZipPostCode: customer.zip || '10101',
    billToCountry: customer.country || 'CR',
    billToTelephone: customer.phone || '00000000',
    billToEmail: customer.email || 'cliente@example.com',
    shipToFirstName: customer.firstName || 'Cliente',
    shipToLastName: customer.lastName || 'BiKitchen',
    shipToAddress: customer.address || 'San José',
    shipToAddress2: customer.address2 || '',
    shipToCity: customer.city || 'San José',
    shipToState: customer.state || 'SJ',
    shipToZipPostCode: customer.zip || '10101',
    shipToCountry: customer.country || 'CR',
    shipToTelephone: customer.phone || '00000000',
    orderNumber,
    capture: '1',
    subscription: '0',
    platform: 'api',
    // returnData se puede usar para enviar info codificada en base64 si luego quieres leerla en el redirect
    returnData: customer.returnData || '',
    hashVersion: 'V2',
  };

  const data = await tilopayRequest('/processPayment', {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: 'application/json',
    },
    body,
  });

  // La doc de Tilopay usualmente devuelve una URL de pago o un estado.
  // Vamos a devolver el objeto completo y que el caller decida qué hacer.
  return data;
}

export default {
  getTilopayToken,
  processTilopayPayment,
};
