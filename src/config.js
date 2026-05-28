// En dev, Vite proxea /api -> backend definido en VITE_API_URL (mantiene cookies same-site).
// En prod, deja VITE_API_URL vacío si frontend y backend comparten dominio.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Opciones por defecto que TODOS los fetch a la API deben usar
// para enviar la cookie httpOnly de sesión.
export const withAuth = (options = {}) => ({
    credentials: 'include',
    ...options,
    headers: {
        ...(options.headers || {}),
    },
});

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
