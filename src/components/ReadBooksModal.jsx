import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { X, BookOpen, Star } from 'lucide-react';
import './ReadBooksModal.css';

const FORMAT_EMOJI = {
    'Físico': '📖',
    'Kindle': '📱',
    'Audiolibro': '🎧',
    'PDF': '💻',
};

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const calcDays = (start, end) => {
    if (!start || !end) return null;
    const a = new Date(start);
    const b = new Date(end);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
};

const ReadBooksModal = ({ isOpen, onClose, books, title = 'Libros leídos' }) => {
    const overlayRef = useRef(null);
    const modalRef = useRef(null);

    // Bloquea el scroll del body cuando el modal está abierto
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
            gsap.fromTo(modalRef.current,
                { y: 40, opacity: 0, scale: 0.96 },
                { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }
            );
            gsap.from('.read-row', { opacity: 0, y: 12, stagger: 0.04, delay: 0.15, duration: 0.3, ease: 'power3.out' });
        });
        return () => ctx.revert();
    }, [isOpen]);

    const summary = useMemo(() => {
        if (!books?.length) return null;
        let pages = 0;
        let totalDays = 0;
        let booksWithDays = 0;
        let ratings = 0;
        let booksRated = 0;
        books.forEach(b => {
            pages += Number(b.totalPages) || 0;
            const days = calcDays(b.fecha_inicio, b.fecha_fin);
            if (days) { totalDays += days; booksWithDays++; }
            if (b.rating) { ratings += Number(b.rating); booksRated++; }
        });
        return {
            count: books.length,
            pages,
            avgDays: booksWithDays ? Math.round(totalDays / booksWithDays) : null,
            avgPagesDay: booksWithDays && totalDays > 0 ? Math.round(pages / totalDays) : null,
            avgRating: booksRated ? (ratings / booksRated).toFixed(1) : null,
        };
    }, [books]);

    if (!isOpen) return null;

    return createPortal(
        <div className="read-overlay" ref={overlayRef} onClick={onClose}>
            <div className="read-modal glass-panel" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                <div className="read-header">
                    <div className="read-title">
                        <BookOpen size={22} />
                        <h2>{title}</h2>
                        <span className="read-count">{books?.length || 0}</span>
                    </div>
                    <button className="read-close" onClick={onClose} title="Cerrar">
                        <X size={20} />
                    </button>
                </div>

                {!books?.length ? (
                    <div className="read-empty">
                        <p>Aún no has marcado ningún libro como leído.</p>
                    </div>
                ) : (
                    <>
                        <div className="read-table-wrapper">
                            <table className="read-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Título</th>
                                        <th>Autor</th>
                                        <th>Género</th>
                                        <th>Formato</th>
                                        <th className="num">Págs.</th>
                                        <th>Inicio</th>
                                        <th>Fin</th>
                                        <th className="num">Días</th>
                                        <th className="num">Pág/día</th>
                                        <th>Rating</th>
                                        <th>Impacto</th>
                                        <th>Categorías</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {books.map(b => {
                                        const days = calcDays(b.fecha_inicio, b.fecha_fin);
                                        const pagsDia = days && b.totalPages
                                            ? Math.round(Number(b.totalPages) / days)
                                            : null;
                                        const rating = Number(b.rating) || 0;
                                        return (
                                            <tr key={b.id} className="read-row">
                                                <td className="cover-cell">
                                                    {b.coverUrl
                                                        ? <img src={b.coverUrl} alt="" />
                                                        : <div className="cover-fallback">{(b.title || '?').substring(0, 2).toUpperCase()}</div>
                                                    }
                                                </td>
                                                <td className="title-cell" title={b.title}>{b.title}</td>
                                                <td className="muted">{b.author || '—'}</td>
                                                <td>
                                                    {b.genre
                                                        ? <span className="genre-chip">{b.genre}</span>
                                                        : <span className="muted">—</span>
                                                    }
                                                </td>
                                                <td>
                                                    {b.formato
                                                        ? <span title={b.formato}>{FORMAT_EMOJI[b.formato] || ''} {b.formato}</span>
                                                        : <span className="muted">—</span>
                                                    }
                                                </td>
                                                <td className="num">{b.totalPages || <span className="muted">—</span>}</td>
                                                <td className="muted">{formatDate(b.fecha_inicio)}</td>
                                                <td className="muted">{formatDate(b.fecha_fin)}</td>
                                                <td className="num">{days ?? <span className="muted">—</span>}</td>
                                                <td className="num">{pagsDia ?? <span className="muted">—</span>}</td>
                                                <td>
                                                    {rating > 0 ? (
                                                        <div className="rating-stars">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <Star key={i} size={12}
                                                                    fill={i < rating ? '#f1c40f' : 'none'}
                                                                    color={i < rating ? '#f1c40f' : 'var(--text-muted)'} />
                                                            ))}
                                                        </div>
                                                    ) : <span className="muted">—</span>}
                                                </td>
                                                <td className="muted">{b.impacto_emocional || '—'}</td>
                                                <td>
                                                    {b.categories?.length ? (
                                                        <div className="cat-chips">
                                                            {b.categories.map((c, i) => (
                                                                <span key={i} className="cat-chip">{c}</span>
                                                            ))}
                                                        </div>
                                                    ) : <span className="muted">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {summary && (
                            <div className="read-footer">
                                <div className="summary-item">
                                    <span className="summary-label">Total libros</span>
                                    <span className="summary-value">{summary.count}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Páginas leídas</span>
                                    <span className="summary-value">{summary.pages.toLocaleString()}</span>
                                </div>
                                {summary.avgDays !== null && (
                                    <div className="summary-item">
                                        <span className="summary-label">Días promedio</span>
                                        <span className="summary-value">{summary.avgDays}</span>
                                    </div>
                                )}
                                {summary.avgPagesDay !== null && (
                                    <div className="summary-item">
                                        <span className="summary-label">Pág/día promedio</span>
                                        <span className="summary-value">{summary.avgPagesDay}</span>
                                    </div>
                                )}
                                {summary.avgRating !== null && (
                                    <div className="summary-item">
                                        <span className="summary-label">Rating promedio</span>
                                        <span className="summary-value">⭐ {summary.avgRating}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ReadBooksModal;
