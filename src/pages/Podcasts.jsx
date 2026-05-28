import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { Headphones, Search, Filter, X, Trash2, Edit3, ExternalLink, Star, Play, Pause, Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { PlayerContext } from '../context/PlayerContext';
import { API_URL, withAuth, mediaUrl, uploadFile } from '../config';
import './Podcasts.css';

const formatHours = (seconds) => {
    const totalSeconds = Number(seconds) || 0;
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = totalMinutes / 60;
    if (hours < 10) return `${hours.toFixed(1)} h`;
    return `${Math.floor(hours)} h`;
};

const ESTADO_LABELS = {
    por_escuchar: { label: 'Por escuchar', emoji: '🎧', color: '#7b61ff' },
    escuchando: { label: 'Escuchando', emoji: '🔊', color: '#f1c40f' },
    escuchado: { label: 'Escuchado', emoji: '✅', color: '#2ecc71' },
};

const emptyForm = {
    nombre: '', autor: '', descripcion: '', url_fuente: '', audio_url: '',
    portada_url: '', categoria: '', estado: 'por_escuchar',
    rating: 0, notas: '', episodios_total: 0, episodios_escuchados: 0,
};

const Podcasts = () => {
    const { isAuthenticated, user } = useContext(AuthContext);
    const player = useContext(PlayerContext);
    const [listenedSeconds, setListenedSeconds] = useState(0);

    // Sincroniza con el valor del backend al montar y cuando user cambia
    useEffect(() => {
        if (user?.podcast_seconds !== undefined) {
            setListenedSeconds(user.podcast_seconds);
        }
    }, [user?.podcast_seconds]);

    // Suscribirse a actualizaciones del player cuando flushea segundos al backend
    useEffect(() => {
        if (!player?.onTotalSecondsUpdate) return;
        return player.onTotalSecondsUpdate((newTotal) => {
            setListenedSeconds(newTotal);
        });
    }, [player]);
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchPodcasts = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/podcasts`, withAuth());
                if (res.ok) setPodcasts(await res.json());
            } catch (err) {
                console.error('Error fetching podcasts', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPodcasts();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from('.page-header', { y: -20, duration: 0.5, ease: 'power3.out', clearProps: 'all' });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (!rootRef.current || podcasts.length === 0) return;
        const ctx = gsap.context(() => {
            gsap.from('.podcast-card', { y: 24, duration: 0.45, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
        }, rootRef);
        return () => ctx.revert();
    }, [podcasts.length]);

    const filtered = useMemo(() => {
        let result = podcasts;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                (p.nombre || '').toLowerCase().includes(q) ||
                (p.autor || '').toLowerCase().includes(q) ||
                (p.categoria || '').toLowerCase().includes(q)
            );
        }
        if (filterEstado !== 'All') {
            result = result.filter(p => p.estado === filterEstado);
        }
        return result;
    }, [podcasts, search, filterEstado]);

    const stats = useMemo(() => ({
        total: podcasts.length,
        escuchando: podcasts.filter(p => p.estado === 'escuchando').length,
        escuchados: podcasts.filter(p => p.estado === 'escuchado').length,
    }), [podcasts]);

    const openNew = () => {
        setEditing(null);
        setForm(emptyForm);
        setAudioName('');
        setAudioError('');
        setSaveError('');
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({
            nombre: p.nombre || '',
            autor: p.autor || '',
            descripcion: p.descripcion || '',
            url_fuente: p.url_fuente || '',
            audio_url: p.audio_url || '',
            portada_url: p.portada_url || '',
            categoria: p.categoria || '',
            estado: p.estado || 'por_escuchar',
            rating: p.rating || 0,
            notas: p.notas || '',
            episodios_total: p.episodios_total || 0,
            episodios_escuchados: p.episodios_escuchados || 0,
        });
        setAudioName('');
        setAudioError('');
        setSaveError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        setForm(emptyForm);
        setAudioName('');
        setAudioError('');
        setSaveError('');
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const [audioName, setAudioName] = useState('');
    const [audioError, setAudioError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [feedback, setFeedback] = useState(null); // { type, text }
    const [coverUploading, setCoverUploading] = useState(null);  // null | 0-100
    const [audioUploading, setAudioUploading] = useState(null);  // null | 0-100
    const [ratingModal, setRatingModal] = useState(null);  // podcast a valorar tras terminar
    const [ratingHover, setRatingHover] = useState(0);

    // Cuando un podcast termina de reproducirse: marcarlo como "escuchado" y pedir valoración
    useEffect(() => {
        const ended = player?.endedTrack;
        if (!ended?.id) return;
        player.clearEndedTrack();
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/podcasts/${ended.id}`, withAuth({
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: 'escuchado' }),
                }));
                if (res.ok) {
                    const updated = await res.json();
                    setPodcasts(prev => prev.map(p => p.id === updated.id ? updated : p));
                    setRatingModal(updated);
                    setRatingHover(0);
                }
            } catch (err) {
                console.error('Error marcando podcast como escuchado', err);
            }
        })();
    }, [player?.endedTrack]);

    const submitRating = async (stars) => {
        if (!ratingModal) return;
        // stars === 0 = "Omitir": cerramos sin tocar la valoración existente
        if (stars > 0) {
            try {
                const res = await fetch(`${API_URL}/api/podcasts/${ratingModal.id}`, withAuth({
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: stars }),
                }));
                if (res.ok) {
                    const updated = await res.json();
                    setPodcasts(prev => prev.map(p => p.id === updated.id ? updated : p));
                }
            } catch (err) {
                console.error('Error guardando valoración', err);
            }
        }
        setRatingModal(null);
        setRatingHover(0);
    };

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setSaveError('La imagen supera los 10 MB. Usa una más ligera.');
            e.target.value = '';
            return;
        }
        setSaveError('');
        setCoverUploading(0);
        try {
            const { url } = await uploadFile('covers', file, (p) => setCoverUploading(p));
            setForm(prev => ({ ...prev, portada_url: url }));
        } catch (err) {
            setSaveError(`No se pudo subir la portada: ${err.message}`);
        } finally {
            setCoverUploading(null);
        }
    };

    const handleAudioChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioError('');
        if (file.size > 500 * 1024 * 1024) {
            setAudioError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo 500 MB.`);
            e.target.value = '';
            return;
        }
        setAudioName(file.name);
        setAudioUploading(0);
        try {
            const { url } = await uploadFile('audio', file, (p) => setAudioUploading(p));
            setForm(prev => ({ ...prev, audio_url: url }));
        } catch (err) {
            setAudioError(`No se pudo subir el audio: ${err.message}`);
            setAudioName('');
        } finally {
            setAudioUploading(null);
        }
    };

    const clearAudio = () => {
        setForm(prev => ({ ...prev, audio_url: '' }));
        setAudioName('');
        setAudioError('');
        setSaveError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) return;
        setSaving(true);
        setSaveError('');
        try {
            const url = editing
                ? `${API_URL}/api/podcasts/${editing.id}`
                : `${API_URL}/api/podcasts`;
            const method = editing ? 'PUT' : 'POST';
            const payload = {
                ...form,
                rating: Number(form.rating) || 0,
                episodios_total: Number(form.episodios_total) || 0,
                episodios_escuchados: Number(form.episodios_escuchados) || 0,
            };
            const res = await fetch(url, withAuth({
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }));

            if (res.ok) {
                const saved = await res.json();
                setPodcasts(prev => editing
                    ? prev.map(p => p.id === saved.id ? saved : p)
                    : [saved, ...prev]
                );
                closeModal();
                setFeedback({ type: 'success', text: editing ? '✓ Cambios guardados correctamente' : '✓ Podcast añadido correctamente' });
                setTimeout(() => setFeedback(null), 3500);
            } else {
                let msg = 'No se pudieron guardar los cambios.';
                try {
                    const data = await res.json();
                    if (data?.message) msg = data.message;
                } catch (e) { /* respuesta sin JSON */ }
                setSaveError(msg);
            }
        } catch (err) {
            console.error('Error saving podcast', err);
            setSaveError('Error de conexión. Revisa que el servidor esté activo.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este podcast? No se puede deshacer.')) return;
        try {
            const res = await fetch(`${API_URL}/api/podcasts/${id}`, withAuth({ method: 'DELETE' }));
            if (res.ok) setPodcasts(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting podcast', err);
        }
    };

    return (
        <div className="podcasts-page" ref={rootRef}>
            <header className="page-header">
                <div className="podcasts-title">
                    <Headphones size={32} />
                    <div>
                        <h1>Podcasts y Audiolibros</h1>
                        <p>Gestiona tus podcasts favoritos y descubre nuevos episodios</p>
                    </div>
                </div>
                <div className="podcasts-header-actions">
                    <button className="btn-primary" onClick={openNew}>
                        Añadir
                    </button>
                    <div className="podcast-listened-counter" title="Tiempo total reproducido en la app">
                        <Clock size={18} />
                        <span><strong>{formatHours(listenedSeconds)}</strong> escuchadas</span>
                    </div>
                </div>
            </header>

            {feedback && (
                <div className={`podcast-feedback ${feedback.type}`}>
                    {feedback.text}
                </div>
            )}

            <div className="podcast-stats">
                <div className="podcast-stat-card glass-panel">
                    <span className="stat-label">Total</span>
                    <span className="stat-value">{stats.total}</span>
                </div>
                <div className="podcast-stat-card glass-panel">
                    <span className="stat-label">🔊 Escuchando</span>
                    <span className="stat-value" style={{ color: '#f1c40f' }}>{stats.escuchando}</span>
                </div>
                <div className="podcast-stat-card glass-panel">
                    <span className="stat-label">✅ Escuchados</span>
                    <span className="stat-value" style={{ color: '#2ecc71' }}>{stats.escuchados}</span>
                </div>
            </div>

            <div className="controls-bar glass-panel">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        className="input"
                        placeholder="Buscar por nombre, autor o categoría..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select className="input" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                        <option value="All">Todos los estados</option>
                        <option value="por_escuchar">🎧 Por escuchar</option>
                        <option value="escuchando">🔊 Escuchando</option>
                        <option value="escuchado">✅ Escuchado</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <p className="podcast-empty">Cargando...</p>
            ) : filtered.length === 0 ? (
                <div className="podcast-empty glass-panel">
                    <Headphones size={48} style={{ opacity: 0.3 }} />
                    <h2>{podcasts.length === 0 ? 'Aún no has añadido podcasts' : 'No hay resultados'}</h2>
                    <p>{podcasts.length === 0 ? 'Empieza añadiendo tu primer podcast favorito.' : 'Prueba a cambiar los filtros.'}</p>
                    {podcasts.length === 0 && (
                        <button className="btn-primary" onClick={openNew}>
                            Añadir el primero
                        </button>
                    )}
                </div>
            ) : (
                <div className="podcasts-grid">
                    {filtered.map(p => {
                        const estado = ESTADO_LABELS[p.estado] || ESTADO_LABELS.por_escuchar;
                        const progreso = p.episodios_total > 0
                            ? Math.round((p.episodios_escuchados / p.episodios_total) * 100)
                            : 0;
                        return (
                            <article key={p.id} className="podcast-card glass-panel">
                                <div className="podcast-cover">
                                    {p.portada_url
                                        ? <img src={mediaUrl(p.portada_url)} alt={p.nombre} />
                                        : <div className="podcast-cover-fallback"><Headphones size={28} /></div>
                                    }
                                </div>
                                <div className="podcast-info">
                                    <h3 title={p.nombre}>{p.nombre}</h3>
                                    {p.autor && <p className="podcast-author">{p.autor}</p>}
                                    <div className="podcast-info-tags">
                                        <span className="podcast-estado-badge" style={{ '--badge-color': estado.color }}>
                                            {estado.emoji} {estado.label}
                                        </span>
                                        {p.categoria && <span className="podcast-categoria">{p.categoria}</span>}
                                    </div>
                                    {p.descripcion && <p className="podcast-desc">{p.descripcion}</p>}

                                    {p.episodios_total > 0 && (
                                        <div className="podcast-progress">
                                            <div className="progress-info">
                                                <span>{p.episodios_escuchados} / {p.episodios_total} episodios</span>
                                                <span>{progreso}%</span>
                                            </div>
                                            <div className="progress-bar"><div style={{ width: `${progreso}%` }} /></div>
                                        </div>
                                    )}

                                    {p.rating > 0 && (
                                        <div className="podcast-rating">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star key={i} size={14} fill={i < p.rating ? '#f1c40f' : 'none'} color={i < p.rating ? '#f1c40f' : 'var(--text-muted)'} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="podcast-actions">
                                    {p.audio_url && (
                                        (() => {
                                            const isCurrent = player?.track?.id === p.id;
                                            const isPlaying = isCurrent && player?.playing;
                                            return (
                                                <button
                                                    className={`action-btn-inline podcast-play-btn ${isPlaying ? 'playing' : ''}`}
                                                    onClick={() => {
                                                        if (isCurrent) {
                                                            player.togglePlay();
                                                        } else {
                                                            player.play({
                                                                id: p.id,
                                                                title: p.nombre,
                                                                author: p.autor,
                                                                cover: mediaUrl(p.portada_url),
                                                                audio_url: mediaUrl(p.audio_url),
                                                            });
                                                        }
                                                    }}
                                                    title={isPlaying ? 'Pausar' : 'Reproducir'}
                                                >
                                                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                                                </button>
                                            );
                                        })()
                                    )}
                                    {p.url_fuente && (
                                        <a href={p.url_fuente} target="_blank" rel="noopener noreferrer" className="action-btn-inline" title="Abrir fuente">
                                            <ExternalLink size={15} />
                                        </a>
                                    )}
                                    <button className="action-btn-inline" onClick={() => openEdit(p)} title="Editar">
                                        <Edit3 size={15} />
                                    </button>
                                    <button className="action-btn-inline delete-btn" onClick={() => handleDelete(p.id)} title="Eliminar">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Editar podcast' : 'Añadir nuevo podcast'}</h2>
                            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="podcast-form">
                            <div className="form-group">
                                <label>Nombre *</label>
                                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required maxLength={200} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Autor / Host</label>
                                    <input type="text" name="autor" value={form.autor} onChange={handleChange} maxLength={150} />
                                </div>
                                <div className="form-group">
                                    <label>Categoría</label>
                                    <input type="text" name="categoria" value={form.categoria} onChange={handleChange} placeholder="Tecnología, Historia..." maxLength={100} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} />
                            </div>
                            <div className="form-group">
                                <label>URL fuente (RSS, Spotify, web...)</label>
                                <input type="url" name="url_fuente" value={form.url_fuente} onChange={handleChange} placeholder="https://..." maxLength={500} />
                            </div>
                            <div className="form-group">
                                <label>🎵 Archivo de audio (MP3, M4A, OGG, WAV)</label>
                                <input type="file" accept="audio/*" onChange={handleAudioChange} disabled={audioUploading !== null} />
                                {audioUploading !== null && (
                                    <div className="upload-progress">
                                        <div className="upload-progress-bar"><div style={{ width: `${audioUploading}%` }} /></div>
                                        <span>Subiendo audio… {audioUploading}%</span>
                                    </div>
                                )}
                                {form.audio_url && audioUploading === null && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 10px', marginTop: '8px',
                                        background: 'rgba(46, 204, 113, 0.1)',
                                        border: '1px solid rgba(46, 204, 113, 0.3)',
                                        borderRadius: '6px', fontSize: '0.8rem',
                                    }}>
                                        <span style={{ flex: 1, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            ✓ {audioName || 'Audio guardado'}
                                        </span>
                                        <button type="button" onClick={clearAudio} style={{
                                            background: 'transparent', border: 'none', color: '#e74c3c',
                                            cursor: 'pointer', fontSize: '0.85rem', padding: 0,
                                        }}>Quitar</button>
                                    </div>
                                )}
                                {audioError && (
                                    <small style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px' }}>
                                        {audioError}
                                    </small>
                                )}
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px' }}>
                                    Sube un archivo desde tu ordenador. Máximo 500 MB.
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Portada (imagen)</label>
                                <input type="file" accept="image/*" onChange={handleImageChange} disabled={coverUploading !== null} />
                                {coverUploading !== null && (
                                    <div className="upload-progress">
                                        <div className="upload-progress-bar"><div style={{ width: `${coverUploading}%` }} /></div>
                                        <span>Subiendo portada… {coverUploading}%</span>
                                    </div>
                                )}
                                {form.portada_url && coverUploading === null && (
                                    <img src={mediaUrl(form.portada_url)} alt="preview" style={{ maxWidth: '100px', marginTop: '8px', borderRadius: '8px' }} />
                                )}
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select name="estado" value={form.estado} onChange={handleChange}>
                                        <option value="por_escuchar">🎧 Por escuchar</option>
                                        <option value="escuchando">🔊 Escuchando</option>
                                        <option value="escuchado">✅ Escuchado</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Rating (0-5)</label>
                                    <input type="number" name="rating" min={0} max={5} value={form.rating} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Episodios totales</label>
                                    <input type="number" name="episodios_total" min={0} value={form.episodios_total} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Episodios escuchados</label>
                                    <input type="number" name="episodios_escuchados" min={0} value={form.episodios_escuchados} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notas personales</label>
                                <textarea name="notas" value={form.notas} onChange={handleChange} rows={3} placeholder="Episodios favoritos, ideas, etc." />
                            </div>
                            {saveError && (
                                <div style={{
                                    background: 'rgba(231, 76, 60, 0.12)',
                                    border: '1px solid rgba(231, 76, 60, 0.35)',
                                    color: '#e74c3c',
                                    borderRadius: '8px',
                                    padding: '9px 12px',
                                    fontSize: '0.82rem',
                                }}>
                                    ⚠️ {saveError}
                                </div>
                            )}
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={saving || coverUploading !== null || audioUploading !== null}>
                                    {saving ? 'Guardando...'
                                        : (coverUploading !== null || audioUploading !== null) ? 'Subiendo archivo...'
                                        : (editing ? 'Guardar cambios' : 'Añadir podcast')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {ratingModal && createPortal(
                <div className="rating-overlay" onClick={() => submitRating(0)}>
                    <div className="rating-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                        <p className="rating-eyebrow">🎧 Has terminado de escuchar</p>
                        <h3 className="rating-title">{ratingModal.nombre}</h3>
                        <p className="rating-question">¿Qué te ha parecido?</p>
                        <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    className="rating-star-btn"
                                    onMouseEnter={() => setRatingHover(n)}
                                    onMouseLeave={() => setRatingHover(0)}
                                    onClick={() => submitRating(n)}
                                    aria-label={`${n} estrellas`}
                                >
                                    <Star
                                        size={38}
                                        fill={n <= ratingHover ? '#f1c40f' : 'none'}
                                        color={n <= ratingHover ? '#f1c40f' : 'var(--text-muted)'}
                                    />
                                </button>
                            ))}
                        </div>
                        <button className="rating-skip" onClick={() => submitRating(0)}>
                            Omitir
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Podcasts;
