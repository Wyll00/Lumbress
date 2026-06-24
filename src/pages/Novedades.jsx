import { useState, useEffect, useRef } from 'react';
import { Sparkles, Plus, Trash2, ExternalLink, BookOpen, Loader2, X, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { sileo } from 'sileo';
import { API_URL, withAuth, mediaUrl, uploadFile } from '../config';
import './Novedades.css';

const EMPTY = { titulo: '', autor: '', genero: '', enlace: '', sinopsis: '', portada_url: '' };

const Novedades = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    // Carrusel: índice activo + pausa al pasar el ratón
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/novedades`, withAuth());
                if (res.ok) setItems(await res.json());
            } catch { /* sin conexión: lista vacía */ }
            finally { setLoading(false); }
        })();
    }, []);

    // Auto-avance cada 3s (se pausa al pasar el ratón); no rota si hay 0/1 libro
    useEffect(() => {
        if (items.length < 2 || paused) return undefined;
        const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 3000);
        return () => clearInterval(t);
    }, [items.length, paused]);

    // Si se borra el último, no dejar el índice fuera de rango
    useEffect(() => {
        if (index >= items.length && items.length > 0) setIndex(0);
    }, [items.length, index]);

    const go = (n) => setIndex((i) => (i + n + items.length) % items.length);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const onPickCover = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { url } = await uploadFile('covers', file);
            setForm((f) => ({ ...f, portada_url: url }));
        } catch (err) {
            sileo.error({ title: 'No se pudo subir la portada', description: err.message || 'Inténtalo de nuevo.' });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.titulo.trim() || !form.autor.trim() || !form.enlace.trim()) {
            sileo.warning({ title: 'Faltan datos', description: 'Título, autor y enlace son obligatorios.' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/novedades`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            }));
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.message || 'No se pudo publicar.');
            setItems((prev) => [j, ...prev]);
            setForm(EMPTY);
            setShowForm(false);
            sileo.success({ title: '¡Publicado!', description: 'Tu libro ya aparece en Novedades.' });
        } catch (err) {
            sileo.error({ title: 'No se pudo publicar', description: err.message || 'Inténtalo de nuevo.' });
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async (id) => {
        const prev = items;
        setItems((arr) => arr.filter((i) => i.id !== id));
        try {
            const res = await fetch(`${API_URL}/api/novedades/${id}`, withAuth({ method: 'DELETE' }));
            if (!res.ok) throw new Error();
            sileo.success({ title: 'Promoción eliminada' });
        } catch {
            setItems(prev);
            sileo.error({ title: 'No se pudo eliminar', description: 'Inténtalo de nuevo.' });
        }
    };

    const inputStyle = {
        width: '100%', background: 'rgba(255,255,255,0.05)', color: 'var(--text)',
        border: '1px solid var(--card-border, rgba(255,255,255,0.12))', borderRadius: 10,
        padding: '11px 12px', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div className="novedades-page animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header className="page-header" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Sparkles size={26} style={{ color: '#e0a93b' }} /> Novedades
                    </h1>
                    <p>Descubre libros de autores noveles. ¿Eres escritor/a? Promociona tu libro: sube la ficha y el enlace donde conseguirlo.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowForm((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', whiteSpace: 'nowrap' }}>
                    {showForm ? <><X size={16} /> Cerrar</> : <><Plus size={16} /> Promociona tu libro</>}
                </button>
            </header>

            {/* Formulario para promocionar un libro */}
            {showForm && (
                <form onSubmit={submit} className="glass-panel" style={{ padding: 18, marginBottom: 22, display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'start' }}>
                        {/* Portada */}
                        <div>
                            <div
                                onClick={() => !uploading && fileRef.current?.click()}
                                style={{ width: 96, aspectRatio: '2 / 3', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--card-border, rgba(255,255,255,0.18))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)', textAlign: 'center', padding: 6 }}
                                title="Subir portada"
                            >
                                {uploading ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                                    : form.portada_url ? <img src={mediaUrl(form.portada_url)} alt="portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <><ImagePlus size={22} /><span style={{ fontSize: '0.68rem' }}>Portada</span></>}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" onChange={onPickCover} style={{ display: 'none' }} />
                        </div>
                        {/* Campos */}
                        <div style={{ display: 'grid', gap: 10 }}>
                            <input style={inputStyle} placeholder="Título del libro *" value={form.titulo} onChange={set('titulo')} maxLength={255} />
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <input style={{ ...inputStyle, flex: 2, minWidth: 160 }} placeholder="Nombre del autor/a *" value={form.autor} onChange={set('autor')} maxLength={160} />
                                <input style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Género (opcional)" value={form.genero} onChange={set('genero')} maxLength={80} />
                            </div>
                            <input style={inputStyle} placeholder="Enlace donde conseguirlo (Amazon, tu web…) *" value={form.enlace} onChange={set('enlace')} maxLength={500} />
                        </div>
                    </div>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Sinopsis: de qué va el libro (opcional)" value={form.sinopsis} onChange={set('sinopsis')} maxLength={2000} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setForm(EMPTY); }} style={{ padding: '10px 18px' }}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
                            {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Publicando…</> : <><Sparkles size={16} /> Publicar</>}
                        </button>
                    </div>
                </form>
            )}

            {/* Listado */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 50, color: 'var(--text-secondary)' }}>
                    <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : items.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                    <Sparkles size={34} style={{ color: '#e0a93b', marginBottom: 10 }} />
                    <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600 }}>Aún no hay novedades</p>
                    <p style={{ margin: '6px 0 0' }}>¿Eres escritor/a? Sé el primero en promocionar tu libro aquí.</p>
                </div>
            ) : (
                <>
                    <div className="nov-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                        <div className="nov-track" style={{ transform: `translateX(-${index * 100}%)` }}>
                            {items.map((it) => (
                                <div className="nov-slide" key={it.id}>
                                    <div className="nov-card glass-panel">
                                        <div className="nov-cover">
                                            {it.portada_url ? (
                                                <img src={mediaUrl(it.portada_url)} alt={it.titulo} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            ) : (
                                                <BookOpen size={48} style={{ color: 'var(--text-secondary)' }} />
                                            )}
                                        </div>
                                        <div className="nov-info">
                                            <div className="nov-info-top">
                                                {it.genero && <span className="nov-chip">{it.genero}</span>}
                                                <h2 className="nov-title">{it.titulo}</h2>
                                                <p className="nov-author">{it.autor}</p>
                                                {it.sinopsis && <p className="nov-synopsis">{it.sinopsis}</p>}
                                            </div>
                                            <div className="nov-actions">
                                                <a href={it.enlace} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', textDecoration: 'none' }}>
                                                    Conseguir <ExternalLink size={15} />
                                                </a>
                                                <div className="nov-actions-meta">
                                                    {it.publicado_por && <span className="nov-by">Promocionado por @{it.publicado_por}</span>}
                                                    {it.isOwner && (
                                                        <button className="nov-del" onClick={() => remove(it.id)} title="Quitar promoción">
                                                            <Trash2 size={14} /> Quitar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {items.length > 1 && (
                            <>
                                <button className="nov-arrow left" onClick={() => go(-1)} aria-label="Anterior"><ChevronLeft size={20} /></button>
                                <button className="nov-arrow right" onClick={() => go(1)} aria-label="Siguiente"><ChevronRight size={20} /></button>
                            </>
                        )}
                    </div>
                    {items.length > 1 && (
                        <div className="nov-dots">
                            {items.map((_, i) => (
                                <button key={i} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Ir al libro ${i + 1}`} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Novedades;
