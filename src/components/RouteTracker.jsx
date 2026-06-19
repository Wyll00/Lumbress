import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { API_URL, withAuth } from '../config';

// Registra una "página vista" en el backend cada vez que cambia la ruta del SPA.
// Sirve para la analítica de tráfico del panel de admin (país e IP los pone el servidor).
const RouteTracker = () => {
    const location = useLocation();
    const last = useRef(null);

    useEffect(() => {
        const path = location.pathname;
        if (last.current === path) return; // evita duplicados por re-render
        last.current = path;
        fetch(`${API_URL}/api/track`, withAuth({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        })).catch(() => { /* la analítica nunca debe molestar al usuario */ });
    }, [location.pathname]);

    return null;
};

export default RouteTracker;
