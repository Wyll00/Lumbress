import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { API_URL, withAuth } from '../config';

export const NotificationContext = createContext();

const POLL_MS = 15000;
const supported = typeof window !== 'undefined' && 'Notification' in window;

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

    // Línea base de no-leídos por conversación. null = aún no cargada (no notificar en la 1ª vuelta).
    const prevCountsRef = useRef(null);

    const fireNotification = useCallback((conv) => {
        if (!supported || Notification.permission !== 'granted') return;
        if (!document.hidden) return; // solo si la pestaña no está enfocada; en primer plano basta el badge
        try {
            const n = new Notification(`@${conv.username}`, {
                body: (conv.ultimo_mensaje || 'Nuevo mensaje').slice(0, 140),
                icon: '/logo.png',
                tag: `codice-msg-${conv.user_id}`, // colapsa varios avisos del mismo remitente
            });
            n.onclick = () => {
                window.focus();
                navigate(`/mensajes?to=${conv.user_id}&nombre=${encodeURIComponent(conv.username)}`);
                n.close();
            };
        } catch { /* algunos navegadores lanzan si no hay gesto previo */ }
    }, [navigate]);

    const refreshUnread = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await fetch(`${API_URL}/api/mensajes/conversaciones`, withAuth());
            if (!res.ok) return;
            const convs = await res.json();

            const counts = {};
            let total = 0;
            for (const c of convs) {
                const n = Number(c.no_leidos) || 0;
                counts[c.user_id] = n;
                total += n;
            }

            // Notificar solo los incrementos respecto a la última vuelta (no en la carga inicial).
            const prev = prevCountsRef.current;
            if (prev) {
                for (const c of convs) {
                    const before = prev[c.user_id] || 0;
                    if ((Number(c.no_leidos) || 0) > before) fireNotification(c);
                }
            }
            prevCountsRef.current = counts;
            setUnreadTotal(total);
        } catch { /* silencio: el polling reintenta */ }
    }, [isAuthenticated, fireNotification]);

    // Polling global mientras hay sesión iniciada.
    useEffect(() => {
        if (!isAuthenticated) {
            setUnreadTotal(0);
            prevCountsRef.current = null;
            return;
        }
        refreshUnread();
        const id = setInterval(refreshUnread, POLL_MS);
        return () => clearInterval(id);
    }, [isAuthenticated, refreshUnread]);

    // Contador en el título de la pestaña.
    useEffect(() => {
        document.title = unreadTotal > 0 ? `(${unreadTotal}) Lumbres` : 'Lumbres';
    }, [unreadTotal]);

    const enableNotifications = useCallback(async () => {
        if (!supported) return 'unsupported';
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        } catch {
            return Notification.permission;
        }
    }, []);

    return (
        <NotificationContext.Provider value={{
            unreadTotal,
            permission,
            supported,
            enableNotifications,
            refreshUnread,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
