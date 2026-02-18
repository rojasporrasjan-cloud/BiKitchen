/**
 * Limpia el token de una URL de Firebase Storage
 * Las reglas de Storage permiten lectura pública, así que no necesitamos tokens
 * Esto evita errores 412 cuando los tokens expiran
 */
export function cleanFirebaseUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Solo procesar URLs de Firebase Storage
  if (!url.includes('firebasestorage.googleapis.com')) return url;
  
  // Remover el parámetro token
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('token');
    return urlObj.toString();
  } catch (e) {
    // Si falla el parsing, intentar con regex
    return url.replace(/&token=[^&]+/, '').replace(/\?token=[^&]+&/, '?').replace(/\?token=[^&]+$/, '');
  }
}

/**
 * Limpia tokens de un objeto que puede contener URLs de Firebase
 * Busca recursivamente en propiedades comunes de imágenes
 */
export function cleanFirebaseUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const imageFields = ['image', 'imageUrl', 'img', 'url', 'photo', 'thumbnail', 'cover', 'banner', 'src'];
  
  const cleaned = { ...obj };
  
  for (const field of imageFields) {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = cleanFirebaseUrl(cleaned[field]);
    }
  }
  
  return cleaned;
}

export default { cleanFirebaseUrl, cleanFirebaseUrls };
