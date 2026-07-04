import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Pencil, X } from 'lucide-react';
import { mediaUrl } from '../config';
import './BookshelfView.css';

// Vista "estantería real": los libros se muestran por el lomo sobre baldas de madera.
// El grosor del lomo es proporcional al nº de páginas y el color sale de un hash del
// título (estable: cada libro conserva siempre su color). Al tocar un lomo, el libro
// se abre en 3D con sus datos y acciones.

const SPINE_COLORS = [
    ['#7a3b2e', '#5e2d23'], // teja
    ['#2e4a3f', '#22382f'], // verde bosque
    ['#3d3a63', '#2d2b4a'], // añil
    ['#8a6d3b', '#6d552c'], // mostaza vieja
    ['#5a2f45', '#432335'], // burdeos
    ['#33586e', '#264353'], // azul petróleo
    ['#6e4a2f', '#543823'], // cuero
    ['#474747', '#363636'], // carbón
];

const hashOf = (s) => [...String(s || '')].reduce((a, c) => ((a * 31) + c.charCodeAt(0)) >>> 0, 7);

// Grosor del lomo según páginas reales (26–54 px); sin páginas: grosor medio
const spineWidth = (pages) => {
    const p = Number(pages) || 0;
    if (!p) return 32;
    return Math.max(26, Math.min(54, Math.round(26 + (p / 1200) * 28)));
};

// Alturas ligeramente distintas para que la balda se vea natural
const spineHeight = (title) => 156 + (hashOf(title) % 5) * 8; // 156–188

const BookshelfView = ({ books, onEdit }) => {
    const navigate = useNavigate();
    const [openBook, setOpenBook] = useState(null); // libro seleccionado
    const [opened, setOpened] = useState(false);    // tapa abierta (segunda fase de la animación)

    const close = () => {
        setOpened(false);
        setTimeout(() => setOpenBook(null), 450); // deja terminar la animación de cierre
    };

    // Al montar el overlay, un instante después se abre la tapa (transición CSS)
    useEffect(() => {
        if (!openBook) return;
        const t = setTimeout(() => setOpened(true), 350);
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
         
    }, [openBook]);

    if (!books.length) return null;

    return (
        <div className="bookshelf-wrap glass-panel">
            <div className="bookshelf">
                {books.map((b) => {
                    const [c1, c2] = SPINE_COLORS[hashOf(b.title) % SPINE_COLORS.length];
                    return (
                        <div className="shelf-slot" key={b.id}>
                            <button
                                className="book-spine"
                                title={`${b.title}${b.author ? ' · ' + b.author : ''}`}
                                style={{
                                    width: spineWidth(b.totalPages),
                                    height: spineHeight(b.title),
                                    background: `linear-gradient(90deg, ${c2} 0%, ${c1} 18%, ${c1} 82%, ${c2} 100%)`,
                                }}
                                onClick={() => { setOpened(false); setOpenBook(b); }}
                            >
                                <span className="spine-band" />
                                <span className="spine-title">{b.title}</span>
                                <span className="spine-band spine-band-bottom" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Libro abierto (overlay 3D). Portal al <body>: dentro del panel glass, el
                efecto cristal atraparía el position:fixed y recortaría el overlay. */}
            {openBook && createPortal(
                <div className="openbook-overlay" onClick={close}>
                    <div className={`openbook ${opened ? 'opened' : ''}`} onClick={(e) => e.stopPropagation()}>
                        {/* Páginas (debajo de la tapa) */}
                        <div className="openbook-pages">
                            <h3 className="openbook-title">{openBook.title}</h3>
                            {openBook.author && <p className="openbook-author">{openBook.author}</p>}
                            <div className="openbook-meta">
                                {Number(openBook.totalPages) > 0 && (
                                    <span>📖 {openBook.pagesRead || 0} / {openBook.totalPages} págs</span>
                                )}
                                {openBook.status && <span className="openbook-status">{openBook.status}</span>}
                            </div>
                            <div className="openbook-actions">
                                {openBook.fileUrl && (
                                    <button className="btn-primary" onClick={() => navigate(`/reader/${openBook.id}`)}>
                                        <BookOpen size={16} /> Leer
                                    </button>
                                )}
                                <button className="btn-secondary" onClick={() => { const b = openBook; close(); onEdit?.(b); }}>
                                    <Pencil size={15} /> Editar
                                </button>
                            </div>
                        </div>
                        {/* Tapa (gira para abrirse) */}
                        <div
                            className="openbook-cover"
                            style={!openBook.coverUrl ? { background: `linear-gradient(135deg, ${SPINE_COLORS[hashOf(openBook.title) % SPINE_COLORS.length][0]}, ${SPINE_COLORS[hashOf(openBook.title) % SPINE_COLORS.length][1]})` } : undefined}
                        >
                            {openBook.coverUrl
                                ? <img src={mediaUrl(openBook.coverUrl)} alt={openBook.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                : <span className="openbook-cover-title">{openBook.title}</span>}
                        </div>
                        <button className="openbook-close" onClick={close} title="Cerrar"><X size={17} /></button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default BookshelfView;
