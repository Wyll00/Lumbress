import { useContext, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { LibraryContext } from '../context/LibraryContext';
import { LanguageContext } from '../context/LanguageContext';
import { Library, BookOpen, Clock } from 'lucide-react';
import AnimatedNumber from '../components/AnimatedNumber';
import ReadBooksModal from '../components/ReadBooksModal';
import ReadingGoal from '../components/ReadingGoal';
import Recommendations from '../components/Recommendations';
import './Dashboard.css';

const Dashboard = () => {
    const { books, categories, assignCategory } = useContext(LibraryContext);
    const { t } = useContext(LanguageContext);
    const rootRef = useRef(null);

    // Animación de entrada del header + stats — solo una vez al montar
    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from('.page-header', {
                y: -20, duration: 0.6, ease: 'power3.out',
                clearProps: 'all',
            });
            gsap.from('.stat-card', {
                y: 24, scale: 0.95, duration: 0.6, stagger: 0.12, delay: 0.15,
                ease: 'back.out(1.4)',
                clearProps: 'all',
            });
        }, rootRef);
        return () => ctx.revert();
    }, []);

    // Animación de las recent cards — re-anima cuando cambia la lista
    useEffect(() => {
        if (!rootRef.current || books.length === 0) return;
        const ctx = gsap.context(() => {
            gsap.from('.recent-card-vertical', {
                y: 30, duration: 0.5, stagger: 0.08,
                ease: 'power3.out',
                clearProps: 'all',
            });
        }, rootRef);
        return () => ctx.revert();
    }, [books.length]);

    const totalBooks = books.length;
    const readBooks = books.filter(b => b.status === 'Read').length;
    const readingBooks = books.filter(b => b.status === 'Reading').length;
    const [showBooksModal, setShowBooksModal] = useState(false);

    const handleCategoryChange = (bookId, e) => {
        const catId = e.target.value;
        if (!catId) return;

        const book = books.find(b => b.id === bookId);
        if (book && (book.categories?.length || 0) >= 4) {
            e.target.style.borderColor = '#e74c3c';
            e.target.value = '';
            // Mostrar tooltip-like mensaje breve
            const original = e.target.title;
            e.target.title = 'Máximo 4 categorías por libro';
            setTimeout(() => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.title = original;
            }, 2000);
            return;
        }

        assignCategory(bookId, catId);
        e.target.style.borderColor = 'var(--success-color)';
        setTimeout(() => { e.target.style.borderColor = 'var(--border-color)'; e.target.value = ''; }, 1500);
    }

    return (
        <div className="dashboard" ref={rootRef}>
            <header className="page-header">
                <h1>{t('welcomeBack')}</h1>
                <p>{t('libraryOverview')}</p>
            </header>

            <div className="stats-grid">
                <div
                    className="stat-card glass-panel clickable-stat"
                    onClick={() => setShowBooksModal(true)}
                    title="Click para ver detalle de tus libros"
                >
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(123, 97, 255, 0.2)' }}>
                        <Library size={24} color="#7b61ff" />
                    </div>
                    <div className="stat-details">
                        <h3>{t('totalBooks')}</h3>
                        <p className="stat-number"><AnimatedNumber value={totalBooks} delay={0.3} /></p>
                    </div>
                </div>

                <div className="stat-card glass-panel">
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(46, 204, 113, 0.2)' }}>
                        <BookOpen size={24} color="#2ecc71" />
                    </div>
                    <div className="stat-details">
                        <h3>{t('booksRead')}</h3>
                        <p className="stat-number"><AnimatedNumber value={readBooks} delay={0.42} /></p>
                    </div>
                </div>

                <div className="stat-card glass-panel">
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(241, 196, 15, 0.2)' }}>
                        <Clock size={24} color="#f1c40f" />
                    </div>
                    <div className="stat-details">
                        <h3>{t('currentlyReading')}</h3>
                        <p className="stat-number"><AnimatedNumber value={readingBooks} delay={0.54} /></p>
                    </div>
                </div>
            </div>

            <ReadingGoal books={books} />

            <div className="dashboard-content">
                <div className="recent-books glass-panel">
                    <h2>{t('recentlyAdded')}</h2>
                    {books.length === 0 ? (
                        <p className="empty-state">{t('noBooksYet')}</p>
                    ) : (
                        <div className="recent-grid-vertical">
                            {books.slice(0, 4).map(book => {
                                const pages = book.totalPages || 0;
                                const read = book.pagesRead || 0;
                                const progress = pages > 0 ? Math.min(100, Math.round((read / pages) * 100)) : 0;
                                const rating = Number(book.rating) || 0;
                                return (
                                    <div key={book.id} className="recent-card-vertical">
                                        <div className="vertical-card-header">
                                            {book.coverUrl ? (
                                                <img src={book.coverUrl} alt="Cover" />
                                            ) : (
                                                <div className="fallback-cover-small">{book.title.substring(0, 2).toUpperCase()}</div>
                                            )}
                                        </div>
                                        <div className="vertical-card-info">
                                            <h4 title={book.title}>{book.title}</h4>
                                            <p>{book.author}</p>
                                            {book.genre && <p className="book-genre" style={{fontSize: '0.75rem', marginTop: '4px'}}>{book.genre}</p>}
                                            {book.categories && book.categories.length > 0 && (
                                                <div className="book-tags-container" style={{ marginTop: '8px', marginBottom: '0', gap: '4px' }}>
                                                    {book.categories.map((cat, index) => (
                                                        <span key={index} className="book-category-chip" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="vertical-card-actions">
                                            <select
                                                className="category-dropdown"
                                                onChange={(e) => handleCategoryChange(book.id, e)}
                                                defaultValue=""
                                                title="Añadir a categoría"
                                            >
                                                <option value="" disabled>🏷️ Añadir a...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="book-preview-overlay">
                                            <h4 className="preview-title">{book.title}</h4>
                                            <p className="preview-author">por {book.author}</p>

                                            <div className="preview-meta">
                                                {book.genre && <span className="preview-badge">{book.genre}</span>}
                                                {book.status && <span className={`preview-status status-${(book.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{book.status}</span>}
                                            </div>

                                            {(pages > 0 || rating > 0) && (
                                                <div className="preview-stats">
                                                    {pages > 0 && (
                                                        <div className="preview-progress">
                                                            <span>📖 {read}/{pages} págs</span>
                                                            <div className="preview-progress-bar"><div style={{ width: `${progress}%` }} /></div>
                                                        </div>
                                                    )}
                                                    {rating > 0 && (
                                                        <div className="preview-rating" title={`${rating}/5`}>
                                                            {'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {book.cita_memorable && (
                                                <blockquote className="preview-quote">"{book.cita_memorable}"</blockquote>
                                            )}

                                            {book.impacto_emocional && (
                                                <p className="preview-emotion">💭 {book.impacto_emocional}</p>
                                            )}

                                            {book.categories && book.categories.length > 0 && (
                                                <div className="preview-tags">
                                                    {book.categories.map((cat, i) => (
                                                        <span key={i} className="preview-tag">{cat}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <Recommendations />

            <ReadBooksModal
                isOpen={showBooksModal}
                onClose={() => setShowBooksModal(false)}
                books={books}
                title="Tus libros"
            />
        </div>
    );
};

export default Dashboard;
