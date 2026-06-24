import { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Check, BookOpen, Loader2, Download, Compass } from 'lucide-react';
import { sileo } from 'sileo';
import { API_URL, withAuth, mediaUrl } from '../config';
import { LibraryContext } from '../context/LibraryContext';

const LANGS = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'Inglés' },
    { code: 'fr', label: 'Francés' },
    { code: 'it', label: 'Italiano' },
    { code: 'de', label: 'Alemán' },
    { code: 'pt', label: 'Portugués' },
];

const Catalogo = () => {
    const { books, refetchBooks } = useContext(LibraryContext);
    const [q, setQ] = useState('');
    const [lang, setLang] = useState('es');
    const [page, setPage] = useState(1);
    const [results, setResults] = useState([]);
    const [count, setCount] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [addingId, setAddingId] = useState(null);

    // Mapa: id de Gutenberg -> libro ya en la biblioteca (para "En tu biblioteca" / "Leer")
    const gidToBook = useMemo(() => {
        const m = {};
        books.forEach((b) => {
            const mm = (b.fileUrl || '').match(/pg-(\d+)\.epub$/);
            if (mm) m[Number(mm[1])] = b;
        });
        return m;
    }, [books]);

    const search = useCallback(async (reset = true) => {
        setLoading(true);
        if (reset) setError('');
        const nextPage = reset ? 1 : page + 1;
        try {
            const res = await fetch(`${API_URL}/api/catalog/search?lang=${lang}&page=${nextPage}&q=${encodeURIComponent(q)}`, withAuth());
            const j = await res.json().catch(() => ({}));
            if (res.ok) {
                setCount(j.count || 0);
                setHasNext(!!j.hasNext);
                setPage(nextPage);
                setResults((prev) => (reset ? j.results : [...prev, ...j.results]));
            } else {
                setError(j.message || 'No se pudo cargar el catálogo.');
            }
        } catch {
            setError('Error de conexión con el catálogo.');
        } finally {
            setLoading(false);
        }
    }, [q, lang, page]);

    // Carga inicial y al cambiar de idioma (no queremos re-disparar al cambiar q/page)
    useEffect(() => {
        search(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    const add = async (gid) => {
        setAddingId(gid);
        const titulo = results.find((r) => r.id === gid)?.title || 'El libro';
        // Tarea: descargar el EPUB y refrescar la biblioteca (lanza si falla; devuelve el libro)
        const task = (async () => {
            const res = await fetch(`${API_URL}/api/catalog/add`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gutenbergId: gid }),
            }));
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.message || 'No se pudo añadir el libro.');
            }
            const book = await res.json();
            await refetchBooks();
            return book;
        })();
        // Toast con estados: descargando → añadido / error. Los libros del catálogo (EPUB de
        // dominio público) no traen nº de páginas: avisamos para que el usuario las ajuste.
        sileo.promise(task, {
            loading: { title: 'Añadiendo…', description: titulo },
            success: (book) => (book && Number(book.totalPages) > 0
                ? { title: 'Añadido a tu biblioteca', description: titulo }
                : {
                    title: 'Añadido a tu biblioteca',
                    description: `«${titulo}» no trae nº de páginas. Edítalo en tu biblioteca para seguir tu progreso.`,
                    duration: 7000,
                }),
            error: (e) => ({ title: 'No se pudo añadir', description: (e && e.message) || 'Inténtalo de nuevo.' }),
        });
        try { await task; } catch { /* el toast ya informa */ } finally { setAddingId(null); }
    };

    return (
        <div className="catalogo-page animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header className="page-header" style={{ marginBottom: 18 }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Compass size={26} style={{ color: '#C18A2F' }} /> Explorar catálogo
                </h1>
                <p>Miles de libros gratis y legales (dominio público) listos para leer. Añádelos a tu biblioteca con un toque.</p>
            </header>

            {/* Buscador */}
            <form
                onSubmit={(e) => { e.preventDefault(); search(true); }}
                className="glass-panel"
                style={{ display: 'flex', gap: 10, padding: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border, rgba(255,255,255,0.12))', borderRadius: 10, padding: '0 12px' }}>
                    <Search size={17} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Busca por título o autor (p. ej. Quijote, Verne…)"
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', padding: '11px 0', fontSize: '0.92rem' }}
                    />
                </div>
                <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--card-border, rgba(255,255,255,0.12))', borderRadius: 10, padding: '11px 12px', fontSize: '0.9rem', outline: 'none' }}
                >
                    {LANGS.map((l) => <option key={l.code} value={l.code} style={{ background: '#1f1a14' }}>{l.label}</option>)}
                </select>
                <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px' }}>
                    <Search size={16} /> Buscar
                </button>
            </form>

            {error && <p style={{ color: '#e74c3c', textAlign: 'center', margin: '10px 0' }}>{error}</p>}

            {loading && results.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 50, color: 'var(--text-secondary)' }}>
                    <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <>
                    {count > 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px' }}>{count.toLocaleString('es-ES')} libros encontrados</p>}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                        {results.map((b) => {
                            const owned = gidToBook[b.id];
                            return (
                                <div key={b.id} className="glass-panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ position: 'relative', aspectRatio: '2 / 3', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {b.cover ? (
                                            <img
                                                src={mediaUrl(b.cover)}
                                                alt={b.title}
                                                loading="lazy"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <BookOpen size={34} style={{ color: 'var(--text-secondary)' }} />
                                        )}
                                    </div>
                                    <div style={{ minHeight: 0 }}>
                                        <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.title}</p>
                                        <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.author}</p>
                                    </div>
                                    {owned ? (
                                        <Link to={`/reader/${owned.id}`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: '0.82rem', textDecoration: 'none', marginTop: 'auto' }}>
                                            <BookOpen size={15} /> Leer
                                        </Link>
                                    ) : (
                                        <button
                                            className="btn-secondary"
                                            onClick={() => add(b.id)}
                                            disabled={addingId === b.id}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: '0.82rem', marginTop: 'auto' }}
                                        >
                                            {addingId === b.id ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Añadiendo…</> : <><Plus size={15} /> Añadir</>}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {results.length === 0 && !loading && (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>No se encontraron libros. Prueba otra búsqueda u otro idioma.</p>
                    )}

                    {hasNext && (
                        <div style={{ textAlign: 'center', margin: '24px 0' }}>
                            <button className="btn-secondary" onClick={() => search(false)} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
                                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />} Cargar más
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Catalogo;
