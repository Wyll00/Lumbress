import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Highlighter, Trash2, X } from 'lucide-react';
import { ReactReader } from 'react-reader';
import { Document, Page, pdfjs } from 'react-pdf';
import { LibraryContext } from '../context/LibraryContext';
import { API_URL, withAuth, mediaUrl } from '../config';

// Worker de PDF.js servido por Vite desde node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// Estilo del subrayado (dorado Lumbres) pintado por epub.js como SVG
const HL_STYLE = { fill: '#e0a93b', 'fill-opacity': '0.32', 'mix-blend-mode': 'multiply' };

// Lector integrado de EPUB (epub.js) y PDF (PDF.js).
// Posición de lectura en localStorage; subrayados persistidos en BD (tabla subrayados).
const Reader = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { books } = useContext(LibraryContext);
    const book = books.find((b) => String(b.id) === String(bookId));
    const posKey = `lumbres-reader-pos-${bookId}`;

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
                rendition.annotations.add('highlight', h.cfi_range, {}, undefined, 'lumbres-hl', HL_STYLE);
            } catch { /* CFI inválido: lo ignoramos */ }
        });
    }, [rendition, highlights]);

    const saveHighlight = async () => {
        if (!pending || saving) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/books/${bookId}/highlights`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cfiRange: pending.cfiRange, text: pending.text }),
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
                    borderLeft: '4px solid var(--accent-color, #e0a93b)',
                }}>
                    <Highlighter size={18} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        «{pending.text.length > 120 ? pending.text.slice(0, 120) + '…' : pending.text}»
                    </span>
                    <button className="btn-primary" onClick={saveHighlight} disabled={saving} style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                        {saving ? 'Guardando…' : 'Subrayar'}
                    </button>
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
                            <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
                            {highlights.length === 0 ? (
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 24, padding: '0 10px' }}>
                                    Selecciona una frase del libro y pulsa "Subrayar" para guardarla aquí. 🖍
                                </p>
                            ) : highlights.map((h) => (
                                <div key={h.id} style={{
                                    padding: '10px 12px', marginBottom: 8, borderRadius: 10,
                                    background: 'rgba(224, 169, 59, 0.07)', border: '1px solid rgba(224, 169, 59, 0.18)',
                                }}>
                                    <p
                                        onClick={() => goToHighlight(h)}
                                        title="Ir a esta frase"
                                        style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text)', cursor: 'pointer', fontStyle: 'italic', lineHeight: 1.45 }}
                                    >
                                        «{h.texto?.length > 160 ? h.texto.slice(0, 160) + '…' : h.texto}»
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
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
