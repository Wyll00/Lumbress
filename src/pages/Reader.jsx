import { useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactReader } from 'react-reader';
import { Document, Page, pdfjs } from 'react-pdf';
import { LibraryContext } from '../context/LibraryContext';
import { mediaUrl } from '../config';

// Worker de PDF.js servido por Vite desde node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// Lector integrado de EPUB (epub.js) y PDF (PDF.js).
// Guarda la posición de lectura en localStorage por libro.
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

    const fileUrl = book?.fileUrl ? mediaUrl(book.fileUrl) : null;
    const isPdf = book?.fileType === 'pdf';

    const onEpubLocation = useCallback((loc) => {
        setLocation(loc);
        localStorage.setItem(posKey, loc);
    }, [posKey]);

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
                {isPdf && numPages && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => goPage(-1)} disabled={page <= 1} style={{ padding: '6px 10px' }}><ChevronLeft size={16} /></button>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{page} / {numPages}</span>
                        <button className="btn-secondary" onClick={() => goPage(1)} disabled={page >= numPages} style={{ padding: '6px 10px' }}><ChevronRight size={16} /></button>
                    </div>
                )}
            </header>

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
                            epubOptions={{ allowScriptedContent: false }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reader;
