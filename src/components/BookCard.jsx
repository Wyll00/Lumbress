import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Quote, Star, X, BookOpen, Library } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { LibraryContext } from '../context/LibraryContext';
import './BookCard.css';

const BookCard = ({ book, onEdit, onDelete, onUpdateProgress, onOpenNotes, onOpenShelves }) => {
    const { t } = useContext(LanguageContext);
    const navigate = useNavigate();
    const { updateBook, removeCategory, categories } = useContext(LibraryContext);

    const progressPercentage = book.totalPages > 0
        ? Math.round((book.pagesRead / book.totalPages) * 100)
        : 0;

    const handleProgressChange = (e) => {
        const value = parseInt(e.target.value) || 0;
        onUpdateProgress(book.id, value);
    };

    const handleRatingChange = (newRating) => {
        updateBook(book.id, { ...book, rating: newRating });
    };

    const handleRemoveCategory = (catName) => {
        const catObj = categories.find(c => c.nombre === catName);
        if(catObj) {
            removeCategory(book.id, catObj.id);
        }
    };

    const statusMap = {
        'To Read': 'toRead',
        'Reading': 'reading',
        'Read': 'read'
    };

    return (
        <div className="book-card glass-panel animate-fade-in">
            <div className="book-card-header">
                <div className="book-cover-placeholder">
                    {book.coverUrl ? (
                        <img src={book.coverUrl} alt={`Cover for ${book.title}`} />
                    ) : (
                        <div className="cover-fallback">
                            {(book.title || 'Un').substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            <div className="book-card-content">
                <div className="book-meta">
                    <span className={`status-badge status-${(book.status || 'To Read').toLowerCase().replace(' ', '-')}`}>
                        {book.formato === 'Audiolibro' 
                            ? (book.status === 'To Read' ? 'Por Escuchar' : book.status === 'Reading' ? 'Escuchando' : 'Escuchado')
                            : t(statusMap[book.status] || book.status || 'To Read')}
                    </span>
                    <span className="book-genre">{book.genre || t('uncategorized')}</span>
                    {book.formato && <span className="book-genre" style={{marginLeft:'auto', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border-color)'}}>{book.formato}</span>}
                </div>

                <h3 className="book-title" title={book.title || 'Untitled'}>{book.title || 'Untitled'}</h3>
                <p className="book-author">{book.author || 'Unknown'}</p>
                {book.impacto_emocional && <p style={{fontSize: '0.8rem', color: 'var(--warning-color)', fontWeight: 'bold', marginTop: '0.2rem'}}>{book.impacto_emocional}</p>}
                {book.cita_memorable && <p style={{fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.4rem', color: 'var(--text-secondary)'}}>"{book.cita_memorable}"</p>}

                {book.categories && book.categories.length > 0 && (
                    <div className="book-tags-container">
                        {book.categories.map((cat, idx) => (
                            <span key={idx} className="book-category-chip">
                                {cat}
                                <button className="remove-cat-btn" onClick={() => handleRemoveCategory(cat)} title="Remover categoría">
                                    <X size={10} strokeWidth={3} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="progress-section">
                    <div 
                        className="progress-pie-chart" 
                        style={{ 
                            background: `conic-gradient(var(--accent-color) ${progressPercentage}%, rgba(255,255,255,0.05) 0)` 
                        }}
                    >
                        <div className="progress-pie-inner">
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-color)' }}>{progressPercentage}%</span>
                        </div>
                    </div>

                    <div className="progress-controls">
                        <div className="progress-text">
                            <span className="pages-text">{book.pagesRead} / {book.totalPages} {book.formato === 'Audiolibro' ? 'min' : 'pág'}</span>
                        </div>

                        {book.status !== 'Read' && (
                            <div className="quick-update">
                                <input
                                    type="number"
                                    min="0"
                                    max={book.totalPages}
                                    defaultValue={book.pagesRead}
                                    onBlur={handleProgressChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleProgressChange(e);
                                    }}
                                    title="Update pages read"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="book-card-footer">
                    <div className="book-card-actions-inline">
                        {book.fileUrl && (
                            <button
                                onClick={() => navigate(`/reader/${book.id}`)}
                                className="action-btn-inline notes-btn"
                                title={`Leer ${book.fileType?.toUpperCase() || ''}`}
                                style={{ color: 'var(--accent-color, #e0a93b)' }}
                            >
                                <BookOpen size={14} />
                            </button>
                        )}
                        <button onClick={() => onOpenNotes(book)} className="action-btn-inline notes-btn" title={t('notesLabel') || "Notes"}>
                            <Quote size={14} />
                        </button>
                        {onOpenShelves && (
                            <button onClick={() => onOpenShelves(book)} className="action-btn-inline notes-btn" title="Añadir a estantería">
                                <Library size={14} />
                            </button>
                        )}
                        <button onClick={() => onEdit(book)} className="action-btn-inline edit-btn" title={t('editBook') || "Edit"}>
                            <Edit2 size={14} />
                        </button>
                        <button onClick={() => onDelete(book.id)} className="action-btn-inline delete-btn" title={t('deleteBook') || "Delete"}>
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {book.status === 'Read' && (
                        <div className="book-card-rating">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    className="inline-star-btn"
                                    onClick={() => handleRatingChange(star)}
                                    title={`${star} ${t('stars') || 'Stars'}`}
                                >
                                    <Star
                                        size={14}
                                        fill={book.rating >= star ? 'var(--warning-color)' : 'none'}
                                        color={book.rating >= star ? 'var(--warning-color)' : 'var(--text-secondary)'}
                                        style={{ opacity: book.rating >= star ? 1 : 0.4 }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookCard;
