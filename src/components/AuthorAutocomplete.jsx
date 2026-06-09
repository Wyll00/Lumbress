import { useCallback } from 'react';
import { API_URL, withAuth } from '../config';
import Typeahead from './Typeahead';

// Autocompletado de autores (Open Library vía /api/authors/search). Texto libre.
const AuthorAutocomplete = ({ value, onChange, placeholder, id = 'author', name = 'author', required = false, className = 'input', maxLength }) => {
    const fetchAuthors = useCallback(async (q) => {
        const res = await fetch(`${API_URL}/api/authors/search?q=${encodeURIComponent(q)}`, withAuth());
        return res.ok ? res.json() : [];
    }, []);

    return (
        <Typeahead
            value={value}
            onChange={onChange}
            onPick={(a) => onChange(a.name)}
            fetchSuggestions={fetchAuthors}
            getKey={(a, i) => `${a.name}-${i}`}
            minChars={2}
            debounceMs={300}
            emptyMessage="Sin sugerencias (puedes escribirlo igual)"
            placeholder={placeholder}
            id={id}
            name={name}
            required={required}
            className={className}
            maxLength={maxLength}
            renderItem={(a) => (
                <div className="typeahead-text">
                    <span className="typeahead-primary">{a.name}</span>
                    {a.topWork && <span className="typeahead-secondary">{a.topWork}</span>}
                </div>
            )}
        />
    );
};

export default AuthorAutocomplete;
