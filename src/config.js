// ¿Estamos dentro de la app nativa (Capacitor)?
const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

// App nativa: los assets van empaquetados y la API vive en producción.
// Web: VITE_API_URL vacío => mismo origen (proxy de nginx).
export const API_URL = isNative
    ? 'https://lumbress.com'
    : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Sesión: en web va por cookie httpOnly (más segura). En la app nativa, por token
// en cabecera (las cookies de terceros no son fiables dentro del WebView).
const TOKEN_KEY = 'lumbres_token';
export const saveToken = (token) => { if (isNative && token) localStorage.setItem(TOKEN_KEY, token); };
export const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ } };
export const getToken = () => (isNative ? localStorage.getItem(TOKEN_KEY) : null);

// Opciones por defecto para TODOS los fetch a la API (cookie en web, Bearer en nativo).
export const withAuth = (options = {}) => {
    const token = getToken();
    return {
        credentials: 'include',
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };
};

// Resuelve la URL de un archivo guardado (portada, audio).
// Acepta: rutas /uploads/... (servidas por el backend), data: (base64 legacy) y URLs absolutas.
export const mediaUrl = (value) => {
    if (!value) return '';
    if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
        return value;
    }
    if (value.startsWith('/uploads')) {
        return `${API_URL}${value}`;
    }
    return value;
};

// Sube un archivo al backend (kind = 'audio' | 'covers'). Devuelve la ruta /uploads/...
export const uploadFile = async (kind, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/uploads/${kind}`);
        xhr.withCredentials = true;
        // App nativa: autenticación por token (no hay cookie en el WebView)
        const token = getToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            });
        }

        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) resolve(data);
                else reject(new Error(data.message || 'Error al subir el archivo'));
            } catch {
                reject(new Error('Respuesta inválida del servidor'));
            }
        };
        xhr.onerror = () => reject(new Error('Error de conexión al subir el archivo'));
        xhr.send(formData);
    });
};
