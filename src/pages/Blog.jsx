import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Newspaper, Plus, Pencil, Trash2, X, Loader2, ImagePlus } from 'lucide-react';
import { sileo } from 'sileo';
import { API_URL, withAuth, mediaUrl, uploadFile } from '../config';
import { AuthContext } from '../context/AuthContext';
import './Blog.css';

const EMPTY = { titulo: '', resumen: '', categoria: '', portada_url: '', contenido: '', estado: 'publicado' };

const Blog = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useContext(AuthContext);
    const isAdmin = !!user?.is_admin;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/blog`, withAuth());
            if (res.ok) { const j = await res.json(); setPosts(j.posts || []); }
        } catch { /* sin conexión */ }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const closeEditor = () => { setEditorOpen(false); setForm(EMPTY); setEditingId(null); };
    const openNew = () => { setEditingId(null); setForm(EMPTY); setEditorOpen(true); };

    const openEdit = useCallback(async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/blog/${id}`, withAuth());
            if (!res.ok) throw new Error();
            const { post } = await res.json();
            setForm({
                titulo: post.titulo || '', resumen: post.resumen || '', categoria: post.categoria || '',
                portada_url: post.portada_url || '', contenido: post.contenido || '', estado: post.estado || 'publicado',
            });
            setEditingId(id);
            setEditorOpen(true);
        } catch { sileo.error({ title: 'No se pudo cargar el artículo' }); }
    }, []);

    // Editar desde la página del artículo (/blog?editar=ID)
    useEffect(() => {
        const id = searchParams.get('editar');
        if (id && isAdmin) { openEdit(id); setSearchParams({}, { replace: true }); }
    }, [searchParams, isAdmin, openEdit, setSearchParams]);

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
        if (!form.titulo.trim() || !form.contenido.trim()) {
            sileo.warning({ title: 'Faltan datos', description: 'El título y el contenido son obligatorios.' });
            return;
        }
        setSubmitting(true);
        try {
            const url = editingId ? `${API_URL}/api/blog/${editingId}` : `${API_URL}/api/blog`;
            const res = await fetch(url, withAuth({
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            }));
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.message || 'No se pudo guardar.');
            sileo.success({ title: editingId ? 'Artículo actualizado' : (form.estado === 'borrador' ? 'Borrador guardado' : 'Artículo publicado') });
            closeEditor();
            load();
        } catch (err) {
            sileo.error({ title: 'No se pudo guardar', description: err.message || 'Inténtalo de nuevo.' });
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('¿Eliminar este artículo? No se puede deshacer.')) return;
        const prev = posts;
        setPosts((arr) => arr.filter((p) => p.id !== id));
        try {
            const res = await fetch(`${API_URL}/api/blog/${id}`, withAuth({ method: 'DELETE' }));
            if (!res.ok) throw new Error();
            sileo.success({ title: 'Artículo eliminado' });
        } catch {
            setPosts(prev);
            sileo.error({ title: 'No se pudo eliminar' });
        }
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="blog-page animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Newspaper size={26} style={{ color: '#7fa06f' }} /> Blog
                    </h1>
                    <p>Artículos, listas y consejos de lectura del equipo de Lumbres.</p>
                </div>
                {isAdmin && !editorOpen && (
                    <button className="btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', whiteSpace: 'nowrap' }}>
                        <Plus size={16} /> Nuevo artículo
                    </button>
                )}
            </header>

            {editorOpen ? (
                <form onSubmit={submit} className="glass-panel" style={{ padding: 20, display: 'grid', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{editingId ? 'Editar artículo' : 'Nuevo artículo'}</h2>
                        <button type="button" onClick={closeEditor} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={20} /></button>
                    </div>

                    <input className="blog-input" placeholder="Título del artículo *" value={form.titulo} onChange={set('titulo')} maxLength={255} />

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <input className="blog-input" style={{ flex: 2, minWidth: 180 }} placeholder="Categoría (opcional)" value={form.categoria} onChange={set('categoria')} maxLength={80} />
                        <button type="button" className="btn-secondary" onClick={() => !uploading && fileRef.current?.click()} style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={16} />} {form.portada_url ? 'Cambiar portada' : 'Subir portada'}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" onChange={onPickCover} style={{ display: 'none' }} />
                    </div>
                    {form.portada_url && <img src={mediaUrl(form.portada_url)} alt="portada" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10 }} />}

                    <input className="blog-input" placeholder="Resumen breve (se muestra en la lista)" value={form.resumen} onChange={set('resumen')} maxLength={400} />

                    <textarea className="blog-input" style={{ minHeight: 300, resize: 'vertical', lineHeight: 1.6 }}
                        placeholder="Escribe aquí el artículo… (deja una línea en blanco entre párrafos)" value={form.contenido} onChange={set('contenido')} maxLength={50000} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[['publicado', 'Publicado'], ['borrador', 'Borrador']].map(([es, label]) => (
                                <button key={es} type="button" onClick={() => setForm((f) => ({ ...f, estado: es }))}
                                    className="btn-secondary"
                                    style={{ padding: '8px 16px', background: form.estado === es ? 'var(--accent-color, #e0a93b)' : undefined, color: form.estado === es ? '#1a130a' : undefined, fontWeight: form.estado === es ? 700 : 500 }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className="btn-secondary" onClick={closeEditor} style={{ padding: '10px 18px' }}>Cancelar</button>
                            <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px' }}>
                                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando…</> : (editingId ? 'Guardar cambios' : (form.estado === 'borrador' ? 'Guardar borrador' : 'Publicar'))}
                            </button>
                        </div>
                    </div>
                </form>
            ) : loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 50, color: 'var(--text-secondary)' }}>
                    <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : posts.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                    <Newspaper size={34} style={{ color: '#7fa06f', marginBottom: 10 }} />
                    <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600 }}>Aún no hay artículos</p>
                    <p style={{ margin: '6px 0 0' }}>{isAdmin ? 'Pulsa "Nuevo artículo" para publicar el primero.' : 'Pronto habrá contenido por aquí. ¡Vuelve pronto!'}</p>
                </div>
            ) : (
                <div className="blog-grid">
                    {posts.map((p) => (
                        <article key={p.id} className="blog-card glass-panel" onClick={() => navigate(`/blog/${p.id}`)}>
                            <div className="blog-cover">
                                {p.portada_url ? (
                                    <img src={mediaUrl(p.portada_url)} alt={p.titulo} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                    <Newspaper size={34} style={{ color: 'var(--text-secondary)' }} />
                                )}
                            </div>
                            <div className="blog-card-body">
                                <div className="blog-card-meta">
                                    {p.categoria && <span className="blog-chip">{p.categoria}</span>}
                                    {p.estado === 'borrador' && <span className="blog-draft">Borrador</span>}
                                </div>
                                <h2 className="blog-card-title">{p.titulo}</h2>
                                {p.resumen && <p className="blog-card-summary">{p.resumen}</p>}
                                <div className="blog-card-date">{fmtDate(p.created_at)}{p.autor ? ` · ${p.autor}` : ''}</div>
                                {isAdmin && (
                                    <div className="blog-card-admin" onClick={(e) => e.stopPropagation()}>
                                        <button className="btn-secondary" onClick={() => openEdit(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: '0.8rem' }}><Pencil size={13} /> Editar</button>
                                        <button className="btn-secondary" onClick={(e) => remove(p.id, e)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: '0.8rem', color: '#e07b6a' }}><Trash2 size={13} /> Borrar</button>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Blog;
