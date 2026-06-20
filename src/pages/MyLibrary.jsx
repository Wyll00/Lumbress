import { useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LibraryContext } from '../context/LibraryContext';
import { LanguageContext } from '../context/LanguageContext';
import BookCard from '../components/BookCard';
import BookModal from '../components/BookModal';
import NotesPanel from '../components/NotesPanel';
import ImportBooksModal from '../components/ImportBooksModal';
import ShelfPicker from '../components/ShelfPicker';
import { Plus, Search, Filter, Upload, Pencil, Trash2, Check, X, Compass } from 'lucide-react';
import './MyLibrary.css';

const MyLibrary = () => {
    const { books, addBook, updateBook, deleteBook, updateProgress, refetchBooks,
            shelves, createShelf, renameShelf, deleteShelf } = useContext(LibraryContext);
    const { t } = useContext(LanguageContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [selectedBookForNotes, setSelectedBookForNotes] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [shelfPickerBook, setShelfPickerBook] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterFormat, setFilterFormat] = useState('All');
    const [sortBy, setSortBy] = useState('Date Added');

    // Estanterías
    const [activeShelf, setActiveShelf] = useState(null); // id de estantería o null = todas
    const [showNewShelf, setShowNewShelf] = useState(false);
    const [newShelfName, setNewShelfName] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState('');

    const activeShelfObj = shelves.find(s => s.id === activeShelf) || null;

    const doCreateShelf = async () => {
        const name = newShelfName.trim();
        if (!name) return;
        const shelf = await createShelf(name);
        setNewShelfName(''); setShowNewShelf(false);
        if (shelf) setActiveShelf(shelf.id);
    };

    const handleDeleteShelf = () => {
        if (!activeShelfObj) return;
        if (window.confirm(`¿Eliminar la estantería "${activeShelfObj.nombre}"? Tus libros NO se borran, solo se quitan de ella.`)) {
            deleteShelf(activeShelf);
            setActiveShelf(null);
        }
    };

    const saveRename = () => {
        const v = renameVal.trim();
        if (v && v !== activeShelfObj?.nombre) renameShelf(activeShelf, { nombre: v });
        setRenaming(false);
    };

    const filteredAndSortedBooks = useMemo(() => {
        let result = books;

        // Filter by search term
        if (searchTerm) {
            result = result.filter(book =>
                (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (book.author || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by status
        if (filterStatus !== 'All') {
            result = result.filter(book => book.status === filterStatus);
        }

        // Filter by format
        if (filterFormat !== 'All') {
            result = result.filter(book => (book.formato || '') === filterFormat);
        }

        // Filter by shelf
        if (activeShelf) {
            result = result.filter(book => (book.shelfIds || []).includes(activeShelf));
        }

        // Sort
        result = [...result].sort((a, b) => {
            switch (sortBy) {
                case 'Title: A-Z':
                    return a.title.localeCompare(b.title);
                case 'Title: Z-A':
                    return b.title.localeCompare(a.title);
                case 'Progress': {
                    const aProg = a.totalPages ? a.pagesRead / a.totalPages : 0;
                    const bProg = b.totalPages ? b.pagesRead / b.totalPages : 0;
                    return bProg - aProg;
                }
                case 'Date Added':
                default:
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
            }
        });

        return result;
    }, [books, searchTerm, filterStatus, filterFormat, sortBy, activeShelf]);

    const handleOpenModal = (book = null) => {
        setEditingBook(book);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingBook(null);
        setIsModalOpen(false);
    };

    const handleOpenNotes = (book) => {
        setSelectedBookForNotes(book);
    };

    const handleUpdateBookNotes = (id, updatedBook) => {
        updateBook(id, updatedBook);
        // Also update local selected book representation to prevent panel flicker
        setSelectedBookForNotes(updatedBook);
    };

    const handleSaveBook = (bookData) => {
        if (editingBook) {
            updateBook(editingBook.id, bookData);
            if (selectedBookForNotes?.id === editingBook.id) {
                setSelectedBookForNotes(bookData);
            }
        } else {
            addBook(bookData);
        }
        handleCloseModal();
    };

    const handleDeleteBook = (id) => {
        deleteBook(id);
        if (selectedBookForNotes?.id === id) {
            setSelectedBookForNotes(null);
        }
    };

    return (
        <div className="mylibrary-layout">
            <div className={`mylibrary-main animate-fade-in ${selectedBookForNotes ? 'with-notes-panel' : ''}`}>
                <header className="library-header">
                    <div className="title-section">
                        <h1>{t('myLibrary')}</h1>
                        <p>{books.length === 1 ? t('bookTotal', { count: books.length }) : t('booksTotal', { count: books.length })}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => setImportOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <Upload size={18} />
                            <span>Importar</span>
                        </button>
                        <button className="btn-primary add-book-btn" onClick={() => handleOpenModal()}>
                            <Plus size={20} />
                            <span>{t('addNewBook')}</span>
                        </button>
                    </div>
                </header>

                {/* Estanterías */}
                <div className="shelf-tabs">
                    <button className={`shelf-tab ${!activeShelf ? 'active' : ''}`} onClick={() => { setActiveShelf(null); setRenaming(false); }}>
                        📚 Todas <span className="shelf-tab-count">{books.length}</span>
                    </button>
                    {shelves.map((s) => (
                        <button key={s.id} className={`shelf-tab ${activeShelf === s.id ? 'active' : ''}`} onClick={() => { setActiveShelf(s.id); setRenaming(false); }}>
                            <span>{s.emoji}</span> {s.nombre} <span className="shelf-tab-count">{s.libros}</span>
                        </button>
                    ))}
                    {showNewShelf ? (
                        <span className="shelf-new-inline">
                            <input
                                autoFocus value={newShelfName} maxLength={60} placeholder="Nombre…"
                                onChange={(e) => setNewShelfName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') doCreateShelf(); if (e.key === 'Escape') { setShowNewShelf(false); setNewShelfName(''); } }}
                            />
                            <button onClick={doCreateShelf} title="Crear"><Check size={15} /></button>
                            <button onClick={() => { setShowNewShelf(false); setNewShelfName(''); }} title="Cancelar"><X size={15} /></button>
                        </span>
                    ) : (
                        <button className="shelf-tab shelf-tab-add" onClick={() => setShowNewShelf(true)}>
                            <Plus size={15} /> Nueva estantería
                        </button>
                    )}
                </div>

                {/* Gestión de la estantería activa */}
                {activeShelfObj && (
                    <div className="shelf-manage">
                        {renaming ? (
                            <span className="shelf-new-inline">
                                <input
                                    autoFocus value={renameVal} maxLength={60}
                                    onChange={(e) => setRenameVal(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                                />
                                <button onClick={saveRename} title="Guardar"><Check size={15} /></button>
                                <button onClick={() => setRenaming(false)} title="Cancelar"><X size={15} /></button>
                            </span>
                        ) : (
                            <>
                                <button onClick={() => { setRenaming(true); setRenameVal(activeShelfObj.nombre); }}>
                                    <Pencil size={14} /> Renombrar
                                </button>
                                <button onClick={handleDeleteShelf}>
                                    <Trash2 size={14} /> Eliminar estantería
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div className="controls-bar glass-panel">
                    <div className="search-box">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            className="input"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filters-box">
                        <div className="filter-group">
                            <Filter size={18} className="filter-icon" />
                            <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="All">{t('allStatuses')}</option>
                                <option value="To Read">{t('toRead')}</option>
                                <option value="Reading">{t('reading')}</option>
                                <option value="Read">{t('read')}</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <select className="input" value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} title="Filtrar por formato">
                                <option value="All">Todos los formatos</option>
                                <option value="Físico">📖 Físico</option>
                                <option value="Kindle">📱 Kindle/eBook</option>
                                <option value="Audiolibro">🎧 Audiolibro</option>
                                <option value="PDF">💻 PDF</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="Date Added">{t('newestFirst')}</option>
                                <option value="Title: A-Z">{t('titleAZ')}</option>
                                <option value="Title: Z-A">{t('titleZA')}</option>
                                <option value="Progress">{t('progressSort')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {filteredAndSortedBooks.length === 0 ? (
                    <div className="empty-library">
                        <div className="empty-message glass-panel">
                            <h2>{t('noBooksFound')}</h2>
                            <p>{t('tryAdjusting')}</p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <Link to="/catalogo" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                                    <Compass size={16} /> Explorar catálogo gratis
                                </Link>
                                <button className="btn-secondary" onClick={() => handleOpenModal()}>
                                    {t('addABook')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="books-grid">
                        {filteredAndSortedBooks.map(book => (
                            <BookCard
                                key={book.id}
                                book={book}
                                onEdit={handleOpenModal}
                                onDelete={handleDeleteBook}
                                onUpdateProgress={updateProgress}
                                onOpenNotes={handleOpenNotes}
                                onOpenShelves={setShelfPickerBook}
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedBookForNotes && (
                <NotesPanel
                    book={selectedBookForNotes}
                    onClose={() => setSelectedBookForNotes(null)}
                    onUpdateBook={handleUpdateBookNotes}
                />
            )}

            <BookModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveBook}
                editingBook={editingBook}
            />

            <ImportBooksModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                onImported={refetchBooks}
            />

            {shelfPickerBook && (
                <ShelfPicker book={shelfPickerBook} onClose={() => setShelfPickerBook(null)} />
            )}
        </div>
    );
};

export default MyLibrary;
