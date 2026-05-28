import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ExternalLink, CalendarPlus, RefreshCw, Newspaper, Clock, X, CalendarCheck } from 'lucide-react';
import { API_URL, withAuth } from '../config';
import './NewsFeed.css';

const PERIODS = [
    { key: 'day', label: 'Hoy' },
    { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mes' },
    { key: 'year', label: 'Este año' },
];

const formatRelative = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `hace ${diffD} día${diffD === 1 ? '' : 's'}`;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const toDateInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const NewsFeed = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('week');
    const [refreshing, setRefreshing] = useState(false);
    const [savedToCalendar, setSavedToCalendar] = useState({}); // { [newsId]: true }

    // Estado del modal "Añadir al calendario"
    const [calendarItem, setCalendarItem] = useState(null);
    const [eventForm, setEventForm] = useState({ nombre: '', fecha: '', hora: '12:00' });
    const [savingEvent, setSavingEvent] = useState(false);
    const overlayRef = useRef(null);
    const modalRef = useRef(null);

    const fetchNews = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/news?period=${period}`, withAuth());
            if (res.ok) setNews(await res.json());
        } catch (err) {
            console.error('Error fetching news', err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchNews(); }, [fetchNews]);

    // Animación de entrada del modal + bloqueo de scroll
    useEffect(() => {
        if (!calendarItem) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const ctx = gsap.context(() => {
            gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
            gsap.fromTo(modalRef.current,
                { y: 30, opacity: 0, scale: 0.95 },
                { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
            );
        });
        return () => {
            document.body.style.overflow = prevOverflow;
            ctx.revert();
        };
    }, [calendarItem]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetch(`${API_URL}/api/news/refresh`, withAuth({ method: 'POST' }));
            setTimeout(async () => {
                await fetchNews();
                setRefreshing(false);
            }, 2000);
        } catch (err) {
            console.error('Error refreshing', err);
            setRefreshing(false);
        }
    };

    // Abre el modal con el formulario pre-rellenado
    const openCalendarModal = (item) => {
        setEventForm({
            nombre: item.titulo.slice(0, 50),  // sugerencia corta y editable
            fecha: toDateInput(item.fecha_publicacion) || toDateInput(new Date()),
            hora: '12:00',
        });
        setCalendarItem(item);
    };

    const closeCalendarModal = () => {
        setCalendarItem(null);
        setSavingEvent(false);
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        const nombre = eventForm.nombre.trim();
        if (!nombre || !eventForm.fecha || !eventForm.hora) return;

        setSavingEvent(true);
        try {
            const res = await fetch(`${API_URL}/api/events`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo: nombre,
                    fecha: eventForm.fecha,
                    hora: eventForm.hora,
                }),
            }));
            if (res.ok) {
                setSavedToCalendar(prev => ({ ...prev, [calendarItem.id]: true }));
                closeCalendarModal();
            } else {
                setSavingEvent(false);
            }
        } catch (err) {
            console.error('Error saving to calendar', err);
            setSavingEvent(false);
        }
    };

    return (
        <div className="news-feed">
            <div className="news-controls glass-panel">
                <div className="news-header-row">
                    <div className="news-title">
                        <Newspaper size={20} />
                        <h2>Noticias literarias</h2>
                        <span className="news-count">{news.length}</span>
                    </div>
                    <button
                        className="news-refresh-btn"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        title="Actualizar noticias"
                    >
                        <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
                        {refreshing ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>
                <div className="news-period-tabs">
                    {PERIODS.map(p => (
                        <button
                            key={p.key}
                            className={`period-pill ${period === p.key ? 'active' : ''}`}
                            onClick={() => setPeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="news-loading">
                    <div className="loading-spinner" />
                    <p>Cargando noticias...</p>
                </div>
            ) : news.length === 0 ? (
                <div className="news-empty glass-panel">
                    <Newspaper size={48} style={{ opacity: 0.3 }} />
                    <h3>Aún no hay noticias en este período</h3>
                    <p>Pulsa "Actualizar" arriba para traer las últimas o cambia el filtro temporal.</p>
                </div>
            ) : (
                <div className="news-grid">
                    {news.map(item => (
                        <article key={item.id} className="news-card glass-panel">
                            {item.image_url && (
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-image">
                                    <img src={item.image_url} alt="" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                                </a>
                            )}
                            <div className="news-body">
                                <div className="news-meta">
                                    <span className="news-source">{item.source}</span>
                                    <span className="news-date">
                                        <Clock size={11} /> {formatRelative(item.fecha_publicacion)}
                                    </span>
                                </div>
                                <h3 className="news-title-text">
                                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                                        {item.titulo}
                                    </a>
                                </h3>
                                {item.descripcion && (
                                    <p className="news-desc">{item.descripcion}</p>
                                )}
                                <div className="news-actions">
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-link">
                                        <ExternalLink size={13} /> Leer en {item.source}
                                    </a>
                                    <button
                                        className={`news-cal-btn ${savedToCalendar[item.id] ? 'saved' : ''}`}
                                        onClick={() => openCalendarModal(item)}
                                        title="Añadir al calendario"
                                    >
                                        <CalendarPlus size={13} />
                                        {savedToCalendar[item.id] ? 'Guardado' : 'Calendario'}
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {calendarItem && createPortal(
                <div className="cal-modal-overlay" ref={overlayRef} onClick={closeCalendarModal}>
                    <div className="cal-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="cal-modal-header">
                            <div className="cal-modal-title">
                                <CalendarCheck size={20} />
                                <h3>Añadir al calendario</h3>
                            </div>
                            <button className="cal-modal-close" onClick={closeCalendarModal} title="Cerrar">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="cal-modal-newsref" title={calendarItem.titulo}>
                            <Newspaper size={13} />
                            <span>{calendarItem.titulo}</span>
                        </div>

                        <form onSubmit={handleSaveEvent} className="cal-modal-form">
                            <div className="cal-field">
                                <label htmlFor="cal-nombre">Nombre del evento</label>
                                <input
                                    id="cal-nombre"
                                    type="text"
                                    value={eventForm.nombre}
                                    onChange={(e) => setEventForm(f => ({ ...f, nombre: e.target.value }))}
                                    placeholder="Ej: Estreno de la película"
                                    maxLength={60}
                                    required
                                    autoFocus
                                />
                                <small>{eventForm.nombre.length}/60 · un nombre corto cabe mejor en el calendario</small>
                            </div>

                            <div className="cal-field-row">
                                <div className="cal-field">
                                    <label htmlFor="cal-fecha">Fecha</label>
                                    <input
                                        id="cal-fecha"
                                        type="date"
                                        value={eventForm.fecha}
                                        onChange={(e) => setEventForm(f => ({ ...f, fecha: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="cal-field">
                                    <label htmlFor="cal-hora">Hora</label>
                                    <input
                                        id="cal-hora"
                                        type="time"
                                        value={eventForm.hora}
                                        onChange={(e) => setEventForm(f => ({ ...f, hora: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="cal-modal-actions">
                                <button type="button" className="cal-btn-secondary" onClick={closeCalendarModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="cal-btn-primary" disabled={savingEvent}>
                                    {savingEvent ? 'Guardando...' : 'Añadir al calendario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default NewsFeed;
