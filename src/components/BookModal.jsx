import { useState, useEffect, useContext, useRef } from 'react';
import { X, Plus, Trash2, Upload, Star } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { LibraryContext } from '../context/LibraryContext';
import './BookModal.css';

const INITIAL_STATE = {
    title: '',
    author: '',
    genre: '',
    formato: '',
    impacto_emocional: '',
    cita_memorable: '',
    coverUrl: '',
    totalPages: '',
    pagesRead: '',
    fecha_inicio: '',
    fecha_fin: '',
    status: 'To Read',
    rating: 0,
    notes: []
};

// Convierte cualquier valor de fecha del backend (Date, ISO string, "YYYY-MM-DD") al formato que espera <input type="date">
const toDateInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const BookModal = ({ isOpen, onClose, onSave, editingBook }) => {
    const { t } = useContext(LanguageContext);
    const { categories } = useContext(LibraryContext);
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [newNote, setNewNote] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (editingBook) {
            const catIds = (editingBook.categories || []).map(catName => {
                const c = categories.find(cat => cat.nombre === catName);
                return c ? c.id : null;
            }).filter(Boolean);
            
            setFormData({
                ...editingBook,
                fecha_inicio: toDateInput(editingBook.fecha_inicio),
                fecha_fin: toDateInput(editingBook.fecha_fin),
                notes: editingBook.notes || [],
                categoryIds: catIds
            });
        } else {
            setFormData(INITIAL_STATE);
        }
    }, [editingBook, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const parsedValue = ['totalPages', 'pagesRead', 'rating'].includes(name)
                ? (value === '' ? '' : Number(value))
                : value;
                
            const newData = { ...prev, [name]: parsedValue };

            // Auto-completar páginas leídas si se marca como "Read"
            if (name === 'status' && value === 'Read' && newData.totalPages) {
                newData.pagesRead = newData.totalPages;
            }

            // Auto-cambiar estado a "Read" si las páginas leídas alcanzan el total
            if (name === 'pagesRead' && newData.totalPages && parsedValue >= newData.totalPages) {
                newData.status = 'Read';
                newData.pagesRead = newData.totalPages;
            }

            return newData;
        });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Comprimir a JPEG con calidad 0.7 para asegurar que pese menos de 1MB
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    setFormData(prev => ({
                        ...prev,
                        coverUrl: compressedDataUrl
                    }));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Auto adjust status
        let finalStatus = formData.status;
        let finalPagesRead = formData.pagesRead || 0;

        if (finalPagesRead >= (formData.totalPages || 0) && formData.totalPages > 0) {
            finalStatus = 'Read';
            finalPagesRead = formData.totalPages;
        } else if (finalPagesRead > 0 && finalStatus === 'To Read') {
            finalStatus = 'Reading';
        }

        let currentNotes = formData.notes || [];
        if (newNote.trim()) {
            currentNotes = [...currentNotes, {
                id: Date.now().toString(),
                content: newNote.trim(),
                createdAt: new Date().toISOString()
            }];
        }

        onSave({
            ...formData,
            status: finalStatus,
            pagesRead: finalPagesRead,
            fecha_inicio: formData.fecha_inicio || null,
            fecha_fin: formData.fecha_fin || null,
            notes: currentNotes
        });
        setNewNote('');
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;

        const note = {
            id: Date.now().toString(),
            content: newNote.trim(),
            createdAt: new Date().toISOString()
        };

        setFormData(prev => ({
            ...prev,
            notes: [...(prev.notes || []), note]
        }));
        setNewNote('');
    };

    const handleDeleteNote = (noteId) => {
        setFormData(prev => ({
            ...prev,
            notes: (prev.notes || []).filter(n => n.id !== noteId)
        }));
    };

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-container glass-panel">
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <h2 className="modal-title">{editingBook ? t('editBook') : t('addBookHeading')}</h2>

                <form onSubmit={handleSubmit} className="book-form">
                    <div className="form-group">
                        <label htmlFor="title">{t('titleLabel')}</label>
                        <input
                            required
                            type="text"
                            id="title"
                            name="title"
                            className="input"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="The Great Gatsby"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="author">{t('authorLabel')}</label>
                        <input
                            required
                            type="text"
                            id="author"
                            name="author"
                            className="input"
                            value={formData.author}
                            onChange={handleChange}
                            placeholder="F. Scott Fitzgerald"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="genre">{t('genreLabel')}</label>
                            <input
                                type="text"
                                id="genre"
                                name="genre"
                                className="input"
                                value={formData.genre}
                                onChange={handleChange}
                                placeholder="Ficción, Biografía..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">{t('statusLabel')}</label>
                            <select
                                id="status"
                                name="status"
                                className="input"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="To Read">{formData.formato === 'Audiolibro' ? 'Por Escuchar 🎧' : t('toRead')}</option>
                                <option value="Reading">{formData.formato === 'Audiolibro' ? 'Escuchando 🎧' : t('reading')}</option>
                                <option value="Read">{formData.formato === 'Audiolibro' ? 'Escuchado ✅' : t('read')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Etiquetas / Categorías (Personalizadas)</span>
                            <span style={{
                                fontSize: '0.72rem',
                                color: (formData.categoryIds || []).length >= 4 ? 'var(--accent-color)' : 'var(--text-muted)',
                                fontWeight: 600,
                            }}>
                                {(formData.categoryIds || []).length} / 4
                            </span>
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            {(categories || []).map(cat => {
                                const ids = formData.categoryIds || [];
                                const isSelected = ids.includes(cat.id);
                                const limitReached = !isSelected && ids.length >= 4;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        disabled={limitReached}
                                        title={limitReached ? 'Máximo 4 categorías por libro' : ''}
                                        onClick={() => {
                                            setFormData(prev => {
                                                const ids = prev.categoryIds || [];
                                                if (ids.includes(cat.id)) {
                                                    return { ...prev, categoryIds: ids.filter(i => i !== cat.id) };
                                                }
                                                if (ids.length >= 4) return prev;
                                                return { ...prev, categoryIds: [...ids, cat.id] };
                                            });
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem',
                                            border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                            background: isSelected ? 'rgba(230, 179, 69, 0.2)' : 'rgba(0,0,0,0.2)',
                                            color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                                            cursor: limitReached ? 'not-allowed' : 'pointer',
                                            opacity: limitReached ? 0.4 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {cat.nombre}
                                    </button>
                                );
                            })}
                        </div>
                        {(formData.categoryIds || []).length >= 4 && (
                            <p style={{
                                fontSize: '0.72rem',
                                color: 'var(--accent-color)',
                                marginTop: '6px',
                                marginBottom: 0,
                            }}>
                                Has alcanzado el máximo de 4 categorías. Quita una para añadir otra.
                            </p>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Formato de Lectura</label>
                            <select name="formato" value={formData.formato} onChange={handleChange} className="input">
                                <option value="">Selecciona...</option>
                                <option value="Físico">Físico 📖</option>
                                <option value="Kindle">Kindle/eBook 📱</option>
                                <option value="Audiolibro">Audiolibro 🎧</option>
                                <option value="PDF">PDF 💻</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Impacto Emocional</label>
                            <select name="impacto_emocional" value={formData.impacto_emocional} onChange={handleChange} className="input">
                                <option value="">Selecciona...</option>
                                <option value="Me cambió la vida">Me cambió la vida ✨</option>
                                <option value="Montaña rusa">Montaña rusa 🎢</option>
                                <option value="Para pasar el rato">Para pasar el rato 🍿</option>
                                <option value="Me durmió">Me durmió 💤</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label>Cita Memorable</label>
                        <textarea 
                            name="cita_memorable"
                            className="input"
                            value={formData.cita_memorable || ''}
                            onChange={handleChange}
                            placeholder="Esa frase que te dejó pensando..."
                            rows="2"
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="totalPages">{t('totalPagesLabel')}</label>
                            <input
                                required
                                type="number"
                                id="totalPages"
                                name="totalPages"
                                className="input"
                                min="1"
                                value={formData.totalPages}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="pagesRead">{t('pagesReadLabel')}</label>
                            <input
                                type="number"
                                id="pagesRead"
                                name="pagesRead"
                                className="input"
                                min="0"
                                max={formData.totalPages || 9999}
                                value={formData.pagesRead}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="fecha_inicio">📅 Fecha de inicio</label>
                            <input
                                type="date"
                                id="fecha_inicio"
                                name="fecha_inicio"
                                className="input"
                                value={formData.fecha_inicio || ''}
                                onChange={handleChange}
                                max={formData.fecha_fin || undefined}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="fecha_fin">🏁 Fecha de fin</label>
                            <input
                                type="date"
                                id="fecha_fin"
                                name="fecha_fin"
                                className="input"
                                value={formData.fecha_fin || ''}
                                onChange={handleChange}
                                min={formData.fecha_inicio || undefined}
                            />
                        </div>
                    </div>

                    <div className="form-group cover-upload-group">
                        <label>{t('coverUrlLabel')}</label>
                        <div className="cover-upload-container">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                            />

                            <div className="cover-preview-wrapper" onClick={() => fileInputRef.current?.click()}>
                                {formData.coverUrl ? (
                                    <img src={formData.coverUrl} alt="Cover Preview" className="cover-preview" />
                                ) : (
                                    <div className="cover-placeholder">
                                        <Upload size={24} />
                                        <span>{t('uploadCoverBtn')}</span>
                                    </div>
                                )}
                            </div>

                            <div className="cover-url-fallback">
                                <input
                                    type="url"
                                    id="coverUrl"
                                    name="coverUrl"
                                    className="input"
                                    value={formData.coverUrl}
                                    onChange={handleChange}
                                    placeholder={t('coverUrlPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>

                    {formData.status === 'Read' && (
                        <div className="form-group">
                            <label>{t('ratingLabel')}</label>
                            <div className="star-rating-input" onMouseLeave={() => setHoverRating(0)}>
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isActive = (hoverRating || formData.rating) >= star;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-btn ${isActive ? 'active' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                                            onMouseEnter={() => setHoverRating(star)}
                                            title={`${star} ${t('stars') || 'Stars'}`}
                                            style={{ opacity: isActive ? 1 : 0.6 }}
                                        >
                                            <Star
                                                size={32}
                                                strokeWidth={isActive ? 0 : 1.5}
                                                fill={isActive ? 'var(--warning-color)' : 'none'}
                                                color={isActive ? 'var(--warning-color)' : 'var(--text-muted)'}
                                                style={{ transition: 'all 0.2s ease' }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    <div className="notes-section">
                        <label>{t('notesLabel')}</label>

                        <div className="add-note-container">
                            <input
                                type="text"
                                className="input"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder={t('addNotePlaceholder')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNote();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="add-note-btn"
                                onClick={handleAddNote}
                                disabled={!newNote.trim()}
                                title={t('addNoteBtn')}
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {formData.notes && formData.notes.length > 0 && (
                            <div className="notes-list">
                                {formData.notes.map(note => (
                                    <div key={note.id} className="note-item animate-fade-in">
                                        <p className="note-text">{note.content || note.text}</p>
                                        <button
                                            type="button"
                                            className="delete-note-btn"
                                            onClick={() => handleDeleteNote(note.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingBook ? t('saveChanges') : t('addBookBtn')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookModal;
