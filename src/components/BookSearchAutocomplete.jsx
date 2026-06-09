import { useCallback } from 'react';
import { API_URL, withAuth } from '../config';
import Typeahead from './Typeahead';

// Búsqueda de libro por título (Open Library vía /api/book-search).
// Al elegir, onSelect(book) con { title, author, coverUrl, totalPages, year, key }.
const BookSearchAutocomplete = ({ value, onChange, onSelect, placeholder, id = 'title', name = 'title', required = false, className = 'input' }) => {
    const fetchBooks = useCallback(async (q) => {
        const res = await fetch(`${API_URL}/api/book-search?q=${encodeURIComponent(q)}`, withAuth());
        return res.ok ? res.json() : [];
    }, []);

    const pick = useCallback((book) => {
        onSelect(book); // rellena ya título/autor/portada/páginas (si vienen)
        // Si faltan las páginas, intenta sacarlas de las ediciones del libro (en segundo plano)
        if (book.totalPages == null && book.key) {
            fetch(`${API_URL}/api/book-search/pages?key=${encodeURIComponent(book.key)}`, withAuth())
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (d && d.totalPages != null) onSelect({ ...book, totalPages: d.totalPages }); })
                .catch(() => { /* sin páginas: el usuario las pone a mano */ });
        }
    }, [onSelect]);

    return (
        <Typeahead
            value={value}
            onChange={onChange}
            onPick={pick}
            fetchSuggestions={fetchBooks}
            getKey={(b, i) => `${b.title}-${i}`}
            minChars={3}
            debounceMs={350}
            emptyMessage="Sin resultados (puedes escribirlo igual)"
            placeholder={placeholder}
            id={id}
            name={name}
            required={required}
            className={className}
            renderItem={(b) => (
                <div className="typeahead-row">
                    {b.coverUrl
                        ? <img className="typeahead-cover" src={b.coverUrl} alt="" loading="lazy" />
                        : <span className="typeahead-cover typeahead-cover-empty">📕</span>}
                    <div className="typeahead-text">
                        <span className="typeahead-primary">{b.title}</span>
                        <span className="typeahead-secondary">
                            {[b.author, b.year, b.totalPages ? `${b.totalPages} págs` : null].filter(Boolean).join(' · ')}
                        </span>
                    </div>
                </div>
            )}
        />
    );
};

export default BookSearchAutocomplete;
