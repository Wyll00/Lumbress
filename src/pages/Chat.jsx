import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft, MessagesSquare } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth, mediaUrl } from '../config';
import './Chat.css';

const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const formatConvDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return formatTime(d);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
};

const Avatar = ({ name, image, size = 42 }) => (
    image
        ? <img src={mediaUrl(image)} alt={name} className="chat-avatar" style={{ width: size, height: size }} />
        : <span className="chat-avatar chat-avatar-fallback" style={{ width: size, height: size }}>
            {(name || '?').substring(0, 2).toUpperCase()}
          </span>
);

const Chat = () => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const [conversaciones, setConversaciones] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [activeUser, setActiveUser] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchConversaciones = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/mensajes/conversaciones`, withAuth());
            if (res.ok) setConversaciones(await res.json());
        } catch (err) {
            console.error('Error fetching conversaciones', err);
        }
    }, []);

    const fetchMensajes = useCallback(async (otroId) => {
        try {
            const res = await fetch(`${API_URL}/api/mensajes/${otroId}`, withAuth());
            if (res.ok) {
                const data = await res.json();
                setMensajes(data.mensajes);
                if (data.usuario) setActiveUser(data.usuario);
            }
        } catch (err) {
            console.error('Error fetching mensajes', err);
        }
    }, []);

    // Carga inicial de conversaciones
    useEffect(() => {
        if (isAuthenticated) fetchConversaciones();
    }, [isAuthenticated, fetchConversaciones]);

    // Deep-link desde ofertas: ?to=ID&nombre=NAME
    useEffect(() => {
        const to = searchParams.get('to');
        if (to) {
            const id = Number(to);
            setActiveId(id);
            const nombre = searchParams.get('nombre');
            if (nombre) setActiveUser({ id, username: nombre });
        }
    }, [searchParams]);

    // Al abrir un chat: cargar mensajes
    useEffect(() => {
        if (activeId) fetchMensajes(activeId);
    }, [activeId, fetchMensajes]);

    // Polling de mensajes mientras hay un chat abierto
    useEffect(() => {
        if (!activeId) return;
        const interval = setInterval(() => {
            fetchMensajes(activeId);
            fetchConversaciones();
        }, 5000);
        return () => clearInterval(interval);
    }, [activeId, fetchMensajes, fetchConversaciones]);

    // Auto-scroll al final
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    const openChat = (conv) => {
        setActiveId(conv.user_id);
        setActiveUser({ id: conv.user_id, username: conv.username, profile_image: conv.profile_image });
        setSearchParams({});
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const contenido = input.trim();
        if (!contenido || !activeId) return;
        setSending(true);
        // Optimista
        const optimistic = {
            id: `tmp-${Date.now()}`,
            emisor_id: user.id,
            receptor_id: activeId,
            contenido,
            created_at: new Date().toISOString(),
        };
        setMensajes(prev => [...prev, optimistic]);
        setInput('');
        try {
            const res = await fetch(`${API_URL}/api/mensajes`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receptor_id: activeId, contenido }),
            }));
            if (res.ok) {
                await fetchMensajes(activeId);
                fetchConversaciones();
            }
        } catch (err) {
            console.error('Error sending', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="chat-page">
            <header className="page-header">
                <h1><MessagesSquare size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />Mensajes</h1>
                <p>Habla con otros lectores y coordina tus compras</p>
            </header>

            <div className={`chat-layout ${activeId ? 'chat-open' : ''}`}>
                {/* Lista de conversaciones */}
                <aside className="chat-conversations glass-panel">
                    {conversaciones.length === 0 ? (
                        <div className="chat-conv-empty">
                            <MessagesSquare size={36} style={{ opacity: 0.3 }} />
                            <p>Aún no tienes conversaciones</p>
                            <span>Escribe a un vendedor desde sus ofertas.</span>
                        </div>
                    ) : (
                        conversaciones.map(c => (
                            <button
                                key={c.user_id}
                                className={`chat-conv-item ${activeId === c.user_id ? 'active' : ''}`}
                                onClick={() => openChat(c)}
                            >
                                <Avatar name={c.username} image={c.profile_image} />
                                <div className="chat-conv-info">
                                    <div className="chat-conv-top">
                                        <span className="chat-conv-name">@{c.username}</span>
                                        <span className="chat-conv-date">{formatConvDate(c.ultima_fecha)}</span>
                                    </div>
                                    <span className="chat-conv-last">{c.ultimo_mensaje}</span>
                                </div>
                                {c.no_leidos > 0 && <span className="chat-conv-badge">{c.no_leidos}</span>}
                            </button>
                        ))
                    )}
                </aside>

                {/* Ventana de chat */}
                <section className="chat-window glass-panel">
                    {!activeId ? (
                        <div className="chat-placeholder">
                            <MessagesSquare size={56} style={{ opacity: 0.25 }} />
                            <p>Selecciona una conversación</p>
                        </div>
                    ) : (
                        <>
                            <div className="chat-window-header">
                                <button className="chat-back" onClick={() => { setActiveId(null); setActiveUser(null); }}>
                                    <ArrowLeft size={18} />
                                </button>
                                <Avatar name={activeUser?.username} image={activeUser?.profile_image} size={36} />
                                <span className="chat-window-name">@{activeUser?.username || '...'}</span>
                            </div>

                            <div className="chat-messages">
                                {mensajes.length === 0 ? (
                                    <div className="chat-no-messages">
                                        <p>👋 Escribe el primer mensaje</p>
                                    </div>
                                ) : (
                                    mensajes.map(m => (
                                        <div
                                            key={m.id}
                                            className={`chat-bubble ${m.emisor_id === user.id ? 'mine' : 'theirs'}`}
                                        >
                                            <p>{m.contenido}</p>
                                            <span className="chat-bubble-time">{formatTime(m.created_at)}</span>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input-bar" onSubmit={handleSend}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    maxLength={2000}
                                />
                                <button type="submit" disabled={sending || !input.trim()} title="Enviar">
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Chat;
