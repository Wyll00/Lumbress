import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Highlighter, Trash2, X, Pencil, Check } from 'lucide-react';
import { ReactReader } from 'react-reader';
import { Document, Page, pdfjs } from 'react-pdf';
import { LibraryContext } from '../context/LibraryContext';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth, mediaUrl } from '../config';

// Worker de PDF.js servido por Vite desde node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// Paleta de subrayado: 5 colores con significado por defecto, personalizable por el usuario.
const HL_COLORS = {
    amber:  { hex: '#e0a93b', defaultLabel: 'Me encanta' },
    red:    { hex: '#e74c3c', defaultLabel: 'Amor' },
    green:  { hex: '#2ecc71', defaultLabel: 'Inspirador' },
    blue:   { hex: '#4aa3df', defaultLabel: 'Reflexión' },
    purple: { hex: '#9b59b6', defaultLabel: 'Tristeza' },
};
const hexFor = (color) => (HL_COLORS[color] || HL_COLORS.amber).hex;
// Estilo SVG que pinta epub.js sobre el texto
const styleFor = (color) => ({ fill: hexFor(color), 'fill-opacity': '0.32', 'mix-blend-mode': 'multiply' });

// Lector integrado de EPUB (epub.js) y PDF (PDF.js).
// Posición de lectura en localStorage; subrayados persistidos en BD (tabla subrayados).
const Reader = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { books } = useContext(LibraryContext);
    const { user, refreshUser } = useContext(AuthContext);
    const book = books.find((b) => String(b.id) === String(bookId));
    const posKey = `lumbres-reader-pos-${bookId}`;

    // Significados de los colores: los del usuario (BD) sobre los por defecto
    const labels = (() => {
        const base = Object.fromEntries(Object.entries(HL_COLORS).map(([k, v]) => [k, v.defaultLabel]));
        try {
            const saved = user?.highlight_labels ? JSON.parse(user.highlight_labels) : {};
            return { ...base, ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => k in base && v)) };
        } catch { return base; }
    })();

    // EPUB: posición (CFI) · PDF: número de página
    const [location, setLocation] = useState(() => localStorage.getItem(posKey) || null);
    const [page, setPage] = useState(() => Number(localStorage.getItem(posKey)) || 1);
    const [numPages, setNumPages] = useState(null);
    const [pdfError, setPdfError] = useState('');

    // Subrayados
    const [rendition, setRendition] = useState(null);
    const [highlights, setHighlights] = useState([]);
    const [pending, setPending] = useState(null); // { cfiRange, text } selección sin guardar
    const [panelOpen, setPanelOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editLabels, setEditLabels] = useState(null); // null | { amber: '...', ... } en edición
    const [savingLabels, setSavingLabels] = useState(false);
    const appliedRef = useRef(new Set()); // ids ya pintados en el rendition

    const fileUrl = book?.fileUrl ? mediaUrl(book.fileUrl) : null;
    const isPdf = book?.fileType === 'pdf';

    const onEpubLocation = useCallback((loc) => {
        setLocation(loc);
        localStorage.setItem(posKey, loc);
    }, [posKey]);

    // Al seleccionar texto en el EPUB, ofrecer subrayar
    const onTextSelected = useCallback((cfiRange, contents) => {
        const text = contents.window.getSelection()?.toString().trim();
        if (text) setPending({ cfiRange, text });
    }, []);

    const onRendition = useCallback((r) => {
        setRendition(r);
        if (import.meta.env.DEV) window.__lumbresRendition = r; // depuración en dev
    }, []);

    // Cargar subrayados guardados
    useEffect(() => {
        if (!book || isPdf) return;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/books/${book.id}/highlights`, withAuth());
                if (res.ok) setHighlights(await res.json());
            } catch { /* noop */ }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookId, isPdf, !!book]);

    // Pintarlos cuando el lector esté listo (y cada vez que se añada uno)
    useEffect(() => {
        if (!rendition) return;
        highlights.forEach((h) => {
            if (appliedRef.current.has(h.id)) return;
            appliedRef.current.add(h.id);
            try {
                rendition.annotations.add('highlight', h.cfi_range, {}, undefined, 'lumbres-hl', styleFor(h.color));
            } catch { /* CFI inválido: lo ignoramos */ }
        });
    }, [rendition, highlights]);

    const saveHighlight = async (color) => {
        if (!pending || saving) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/books/${bookId}/highlights`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cfiRange: pending.cfiRange, text: pending.text, color }),
            }));
            if (res.ok) {
                const h = await res.json();
                setHighlights((prev) => [...prev, h]); // el efecto lo pinta
                setPending(null);
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.message || 'No se pudo guardar el subrayado.');
            }
        } catch { alert('Error de conexión.'); }
        finally { setSaving(false); }
    };

    // Guardar los significados personalizados de los colores
    const saveLabels = async () => {
        if (!editLabels || savingLabels) return;
        setSavingLabels(true);
        try {
            const res = await fetch(`${API_URL}/api/users/me/highlight-labels`, withAuth({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: editLabels }),
            }));
            if (res.ok) { await refreshUser(); setEditLabels(null); }
            else alert('No se pudieron guardar las etiquetas.');
        } catch { alert('Error de conexión.'); }
        finally { setSavingLabels(false); }
    };

    const removeHighlight = async (h) => {
        try {
            const res = await fetch(`${API_URL}/api/books/${bookId}/highlights/${h.id}`, withAuth({ method: 'DELETE' }));
            if (res.ok) {
                setHighlights((prev) => prev.filter((x) => x.id !== h.id));
                appliedRef.current.delete(h.id);
                try { rendition?.annotations.remove(h.cfi_range, 'highlight'); } catch { /* noop */ }
            }
        } catch { /* noop */ }
    };

    const goToHighlight = (h) => {
        try { rendition?.display(h.cfi_range); } catch { /* noop */ }
    };

    const goPage = (delta) => {
        setPage((p) => {
            const next = Math.min(Math.max(1, p + delta), numPages || 1);
            localStorage.setItem(posKey, String(next));
            return next;
        });
    };

    // Flechas del teclado para pasar página en PDF
    useEffect(() => {
        if (!isPdf) return;
        const onKey = (e) => {
            if (e.key === 'ArrowRight') goPage(1);
            if (e.key === 'ArrowLeft') goPage(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPdf, numPages]);

    if (books.length > 0 && !book) {
        return (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                <p>No se encontró el libro.</p>
                <button className="btn-secondary" onClick={() => navigate('/library')}>Volver a Mi Biblioteca</button>
            </div>
        );
    }
    if (!book) return null; // biblioteca aún cargando

    if (!fileUrl) {
        return (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                <p>Este libro no tiene archivo EPUB/PDF. Súbelo desde "Editar libro".</p>
                <button className="btn-secondary" onClick={() => navigate('/library')}>Volver a Mi Biblioteca</button>
            </div>
        );
    }

    return (
        <div className="reader-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <button
                    className="btn-secondary"
                    onClick={() => navigate('/library')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
                >
                    <ArrowLeft size={16} /> Biblioteca
                </button>
                <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{book.author} · {book.fileType?.toUpperCase()}</p>
                </div>
                {!isPdf && (
                    <button
                        className="btn-secondary"
                        onClick={() => setPanelOpen((o) => !o)}
                        title="Tus frases subrayadas"
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', color: panelOpen ? 'var(--accent-color)' : undefined }}
                    >
                        <Highlighter size={16} /> Subrayados ({highlights.length})
                    </button>
                )}
                {isPdf && numPages && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => goPage(-1)} disabled={page <= 1} style={{ padding: '6px 10px' }}><ChevronLeft size={16} /></button>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{page} / {numPages}</span>
                        <button className="btn-secondary" onClick={() => goPage(1)} disabled={page >= numPages} style={{ padding: '6px 10px' }}><ChevronRight size={16} /></button>
                    </div>
                )}
            </header>

            {/* Barra de selección pendiente: aparece al seleccionar texto en el EPUB */}
            {pending && (
                <div className="glass-panel" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', marginBottom: 10,
                    borderLeft: '4px solid var(--accent-color, #e0a93b)', flexWrap: 'wrap',
                }}>
                    <Highlighter size={18} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 160, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        «{pending.text.length > 90 ? pending.text.slice(0, 90) + '…' : pending.text}»
                    </span>
                    {/* Elegir color = guardar con ese significado */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {Object.entries(HL_COLORS).map(([key, c]) => (
                            <button
                                key={key}
                                onClick={() => saveHighlight(key)}
                                disabled={saving}
                                title={labels[key]}
                                style={{
                                    width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                                    background: c.hex, border: '2px solid rgba(255,255,255,0.25)',
                                    opacity: saving ? 0.5 : 1, transition: 'transform 0.15s',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            />
                        ))}
                    </div>
                    <button className="btn-secondary" onClick={() => setPending(null)} style={{ padding: '7px 10px' }} title="Cancelar">
                        <X size={15} />
                    </button>
                </div>
            )}

            <div className="glass-panel" style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
                {isPdf ? (
                    <div style={{ height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', background: '#262019' }}>
                        <Document
                            file={fileUrl}
                            onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPage((p) => Math.min(p, n)); }}
                            onLoadError={(e) => setPdfError(e?.message || 'No se pudo abrir el PDF')}
                            loading={<p style={{ color: 'var(--text-secondary)', padding: 30 }}>Abriendo PDF…</p>}
                            error={<p style={{ color: '#e74c3c', padding: 30 }}>{pdfError || 'No se pudo abrir el PDF'}</p>}
                        >
                            <Page
                                pageNumber={page}
                                width={Math.min(880, window.innerWidth - 380)}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </Document>
                    </div>
                ) : (
                    /* EPUB — react-reader necesita un contenedor con posición y altura definidas */
                    <div style={{ position: 'absolute', inset: 0 }}>
                        <ReactReader
                            url={fileUrl}
                            title={book.title}
                            location={location}
                            locationChanged={onEpubLocation}
                            getRendition={onRendition}
                            handleTextSelected={onTextSelected}
                            epubOptions={{ allowScriptedContent: false }}
                        />
                    </div>
                )}

                {/* Panel lateral de subrayados */}
                {panelOpen && !isPdf && (
                    <div style={{
                        position: 'absolute', top: 0, right: 0, bottom: 0, width: 300, zIndex: 5,
                        background: 'var(--card-bg, #1f1a14)', borderLeft: '1px solid var(--card-border, rgba(255,255,255,0.1))',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.08))' }}>
                            <strong style={{ color: 'var(--text)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Highlighter size={15} style={{ color: 'var(--accent-color)' }} /> Tus subrayados
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                    onClick={() => setEditLabels(editLabels ? null : { ...labels })}
                                    title="Personalizar el significado de cada color"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: editLabels ? 'var(--accent-color)' : 'var(--text-secondary)', display: 'flex' }}
                                >
                                    <Pencil size={15} />
                                </button>
                                <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Editor de significados de los colores */}
                        {editLabels && (
                            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.08))' }}>
                                <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    ¿Qué significa cada color para ti?
                                </p>
                                {Object.entries(HL_COLORS).map(([key, c]) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.hex, flexShrink: 0 }} />
                                        <input
                                            value={editLabels[key]}
                                            maxLength={30}
                                            onChange={(e) => setEditLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                                            style={{
                                                flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text)',
                                                border: '1px solid var(--card-border, rgba(255,255,255,0.12))',
                                                borderRadius: 8, padding: '6px 9px', fontSize: '0.8rem', outline: 'none',
                                            }}
                                        />
                                    </div>
                                ))}
                                <button
                                    className="btn-primary"
                                    onClick={saveLabels}
                                    disabled={savingLabels}
                                    style={{ width: '100%', marginTop: 6, padding: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    <Check size={14} /> {savingLabels ? 'Guardando…' : 'Guardar significados'}
                                </button>
                            </div>
                        )}

                        <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
                            {highlights.length === 0 ? (
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 24, padding: '0 10px' }}>
                                    Selecciona una frase del libro y elige un color para guardarla aquí. 🖍
                                </p>
                            ) : highlights.map((h) => (
                                <div key={h.id} style={{
                                    padding: '10px 12px', marginBottom: 8, borderRadius: 10,
                                    background: `${hexFor(h.color)}12`,
                                    border: `1px solid ${hexFor(h.color)}30`,
                                    borderLeft: `4px solid ${hexFor(h.color)}`,
                                }}>
                                    <p
                                        onClick={() => goToHighlight(h)}
                                        title="Ir a esta frase"
                                        style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text)', cursor: 'pointer', fontStyle: 'italic', lineHeight: 1.45 }}
                                    >
                                        «{h.texto?.length > 160 ? h.texto.slice(0, 160) + '…' : h.texto}»
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: hexFor(h.color) }}>
                                            {labels[h.color] || labels.amber}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                {h.created_at ? new Date(h.created_at).toLocaleDateString('es-ES') : ''}
                                            </span>
                                            <button
                                                onClick={() => removeHighlight(h)}
                                                title="Eliminar subrayado"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reader;
