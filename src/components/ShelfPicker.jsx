import { useContext, useState } from 'react';
import { X, Plus, Check, Library } from 'lucide-react';
import { LibraryContext } from '../context/LibraryContext';
import './ShelfPicker.css';

const EMOJIS = ['📚', '⭐', '❤️', '🔥', '🏆', '🌙', '🧙', '🔍', '💼', '🎓', '✈️', '🌿'];

// Modal para añadir/quitar un libro de tus estanterías (y crear nuevas al vuelo).
const ShelfPicker = ({ book, onClose }) => {
    const { books, shelves, toggleBookInShelf, createShelf } = useContext(LibraryContext);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmoji, setNewEmoji] = useState('📚');
    const [saving, setSaving] = useState(false);

    // Lee el libro vivo del contexto para reflejar cambios al instante
    const live = books.find(b => b.id === book.id) || book;
    const inShelf = (id) => (live.shelfIds || []).includes(id);

    const create = async () => {
        const nombre = newName.trim();
        if (!nombre || saving) return;
        setSaving(true);
        const shelf = await createShelf(nombre, newEmoji);
        if (shelf) {
            await toggleBookInShelf(shelf.id, live.id, true);
            setNewName(''); setNewEmoji('📚'); setCreating(false);
        }
        setSaving(false);
    };

    return (
        <div className="shelf-overlay" onClick={onClose}>
            <div className="shelf-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                <button className="shelf-close" onClick={onClose}><X size={20} /></button>
                <h3><Library size={20} /> Añadir a estantería</h3>
                <p className="shelf-book-title">«{live.title}»</p>

                <div className="shelf-list">
                    {shelves.length === 0 && !creating && (
                        <p className="shelf-empty">Aún no tienes estanterías. Crea la primera 👇</p>
                    )}
                    {shelves.map((s) => {
                        const active = inShelf(s.id);
                        return (
                            <button
                                key={s.id}
                                className={`shelf-item ${active ? 'active' : ''}`}
                                onClick={() => toggleBookInShelf(s.id, live.id, !active)}
                            >
                                <span className="shelf-item-emoji">{s.emoji}</span>
                                <span className="shelf-item-name">{s.nombre}</span>
                                <span className="shelf-item-count">{s.libros}</span>
                                <span className={`shelf-check ${active ? 'on' : ''}`}>{active && <Check size={14} />}</span>
                            </button>
                        );
                    })}
                </div>

                {creating ? (
                    <div className="shelf-create">
                        <div className="shelf-emoji-row">
                            {EMOJIS.map((e) => (
                                <button key={e} className={`shelf-emoji ${newEmoji === e ? 'sel' : ''}`} onClick={() => setNewEmoji(e)}>{e}</button>
                            ))}
                        </div>
                        <div className="shelf-create-row">
                            <input
                                autoFocus value={newName} maxLength={60}
                                placeholder="Nombre de la estantería…"
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
                            />
                            <button className="btn-primary" onClick={create} disabled={saving || !newName.trim()}>
                                {saving ? '…' : 'Crear'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button className="shelf-new-btn" onClick={() => setCreating(true)}>
                        <Plus size={16} /> Nueva estantería
                    </button>
                )}
            </div>
        </div>
    );
};

export default ShelfPicker;
