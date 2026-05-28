import { useState, useContext } from 'react';
import { X, Plus, Trash2, Edit2, Check, Quote } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import './NotesPanel.css';

const NotesPanel = ({ book, onClose, onUpdateBook }) => {
    const { t } = useContext(LanguageContext);
    const [newNote, setNewNote] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteText, setEditNoteText] = useState('');

    if (!book) return null;

    const notes = book.notes || [];

    const handleAddNote = () => {
        if (!newNote.trim()) return;

        const note = {
            id: Date.now().toString(),
            content: newNote.trim(),
            createdAt: new Date().toISOString()
        };

        onUpdateBook(book.id, {
            ...book,
            notes: [...notes, note]
        });
        setNewNote('');
    };

    const handleDeleteNote = (noteId) => {
        onUpdateBook(book.id, {
            ...book,
            notes: notes.filter(n => n.id !== noteId)
        });
    };

    const startEditing = (note) => {
        setEditingNoteId(note.id);
        setEditNoteText(note.content || note.text);
    };

    const saveEdit = () => {
        if (!editNoteText.trim()) return;

        onUpdateBook(book.id, {
            ...book,
            notes: notes.map(n => n.id === editingNoteId ? { ...n, content: editNoteText.trim() } : n)
        });
        setEditingNoteId(null);
        setEditNoteText('');
    };

    return (
        <aside className="notes-panel glass-panel animate-fade-in">
            <header className="notes-panel-header">
                <div>
                    <h2 className="notes-panel-title">
                        <Quote size={20} className="title-icon" />
                        {t('notesLabel')}
                    </h2>
                    <p className="notes-panel-subtitle">{book.title}</p>
                </div>
                <button className="close-panel-btn" onClick={onClose} title={t('cancel')}>
                    <X size={20} />
                </button>
            </header>

            <div className="notes-panel-content">
                <div className="add-note-box">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder={t('addNotePlaceholder')}
                        rows={3}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddNote();
                            }
                        }}
                    />
                    <button
                        className="btn-primary"
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                    >
                        {t('addNoteBtn')}
                    </button>
                </div>

                <div className="notes-feed">
                    {notes.length === 0 ? (
                        <div className="empty-notes">
                            <Quote size={32} />
                            <p>{t('noNotesYet') || "No notes yet for this book. Add some thoughts!"}</p>
                        </div>
                    ) : (
                        notes.slice().reverse().map(note => (
                            <div key={note.id} className="note-card animate-fade-in">
                                {editingNoteId === note.id ? (
                                    <div className="edit-note-mode">
                                        <textarea
                                            value={editNoteText}
                                            onChange={(e) => setEditNoteText(e.target.value)}
                                            autoFocus
                                            rows={3}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    saveEdit();
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingNoteId(null);
                                                }
                                            }}
                                        />
                                        <div className="edit-actions">
                                            <button className="btn-secondary small" onClick={() => setEditingNoteId(null)}>
                                                <X size={14} /> {t('cancel')}
                                            </button>
                                            <button className="btn-primary small" onClick={saveEdit}>
                                                <Check size={14} /> {t('saveChanges')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="note-body">{note.content || note.text}</p>
                                        <div className="note-footer">
                                            <span className="note-date">
                                                {new Date(note.createdAt || note.date).toLocaleDateString()}
                                            </span>
                                            <div className="note-actions">
                                                <button onClick={() => startEditing(note)} title={t('editBook') || 'Edit'}>
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteNote(note.id)} className="danger" title={t('deleteBook') || 'Delete'}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
};

export default NotesPanel;
