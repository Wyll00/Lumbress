import { useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LibraryContext } from '../context/LibraryContext';
import { LanguageContext } from '../context/LanguageContext';
import BookCard from '../components/BookCard';
import BookModal from '../components/BookModal';
import NotesPanel from '../components/NotesPanel';
import ImportBooksModal from '../components/ImportBooksModal';
import ShelfPicker from '../components/ShelfPicker';
import BookshelfView from '../components/BookshelfView';
import { Plus, Search, Upload, Pencil, Trash2, Check, X, Compass, Library, LayoutGrid } from 'lucide-react';
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
    // Búsqueda expandible (diseño 1c): lupa → campo con foco; ✕ limpia y colapsa
    const [searchOpen, setSearchOpen] = useState(false);

    // Vista: cuadrícula clásica o estantería con lomos (se recuerda la elección)
    const [viewMode, setViewModeState] = useState(() => localStorage.getItem('lumbres-library-view') || 'grid');
    const setViewMode = (v) => { setViewModeState(v); localStorage.setItem('lumbres-library-view', v); };

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

        // Filter by shelf
        if (activeShelf) {
            result = result.filter(book => (book.shelfIds || []).includes(activeShelf));
        }

        // Más recientes primero (sin más filtros: búsqueda + estanterías bastan)
        return [...result].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }, [books, searchTerm, activeShelf]);

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
                {/* Cabecera 1c (Claude Design): título + contador · lupa expandible · vista · importar · añadir */}
                <header className="library-header">
                    <div className="library-title-row">
                        <h1>{t('myLibrary')}</h1>
                        <span className="library-count">{books.length === 1 ? '1 libro' : `${books.length} libros`}</span>
                    </div>
                    <div className="library-actions">
                        {searchOpen ? (
                            <div className="lib-search-pill">
                                <Search size={14} className="lib-search-icon" />
                                <input
                                    autoFocus
                                    value={searchTerm}
                                    placeholder={t('searchPlaceholder')}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Escape') { setSearchTerm(''); setSearchOpen(false); } }}
                                />
                                <button className="lib-search-clear" onClick={() => { setSearchTerm(''); setSearchOpen(false); }} title="Cerrar búsqueda">
                                    <X size={13} />
                                </button>
                            </div>
                        ) : (
                            <button className="lib-icon-btn" onClick={() => setSearchOpen(true)} title="Buscar libros o autores">
                                <Search size={15} />
                            </button>
                        )}
                        <button
                            className="lib-icon-btn"
                            onClick={() => setViewMode(viewMode === 'shelf' ? 'grid' : 'shelf')}
                            title={viewMode === 'shelf' ? 'Cambiar a vista cuadrícula' : 'Cambiar a vista estantería'}
                        >
                            {viewMode === 'shelf' ? <LayoutGrid size={15} /> : <Library size={15} />}
                        </button>
                        <button className="lib-icon-btn" onClick={() => setImportOpen(true)} title="Importar libros">
                            <Upload size={15} />
                        </button>
                        <button className="lib-add-btn" onClick={() => handleOpenModal()} title={t('addNewBook')}>
                            <Plus size={17} />
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

                <div className="library-books-area">
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
                ) : viewMode === 'shelf' ? (
                    <BookshelfView books={filteredAndSortedBooks} onEdit={handleOpenModal} />
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
