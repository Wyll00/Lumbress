import { useState, useEffect, useRef, useCallback } from 'react';
import './Typeahead.css';

// Autocompletado genérico y reutilizable.
// El que lo usa aporta: cómo buscar (fetchSuggestions), cómo pintar cada item (renderItem)
// y qué hacer al elegir (onPick). Sigue siendo texto libre.
const Typeahead = ({
    value,
    onChange,            // (texto) => void  — cambios del input
    onPick,              // (item) => void   — al elegir una sugerencia
    fetchSuggestions,    // (query) => Promise<item[]>
    renderItem,          // (item) => ReactNode  — contenido de cada sugerencia
    getKey,              // (item, index) => string (opcional)
    minChars = 2,
    debounceMs = 300,
    emptyMessage = 'Sin resultados',
    placeholder,
    id,
    name,
    required = false,
    className = 'input',
    maxLength,
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const suppressFetchRef = useRef(true);  // salta la búsqueda en el montaje y justo tras elegir
    const fetchRef = useRef(fetchSuggestions);
    fetchRef.current = fetchSuggestions;    // siempre la última, sin re-disparar el efecto
    const boxRef = useRef(null);

    // Búsqueda con debounce mientras se escribe
    useEffect(() => {
        const q = (value || '').trim();
        if (suppressFetchRef.current) { suppressFetchRef.current = false; return; }
        if (q.length < minChars) { setSuggestions([]); setOpen(false); setLoading(false); return; }

        let active = true;
        setLoading(true);
        setOpen(true);
        const handle = setTimeout(async () => {
            try {
                const data = await fetchRef.current(q);
                if (active) { setSuggestions(Array.isArray(data) ? data : []); setActiveIndex(-1); }
            } catch {
                if (active) setSuggestions([]);
            } finally {
                if (active) setLoading(false);
            }
        }, debounceMs);

        return () => { active = false; clearTimeout(handle); };
    }, [value, minChars, debounceMs]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const onDocClick = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const choose = useCallback((item) => {
        suppressFetchRef.current = true;
        onPick(item);
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
    }, [onPick]);

    const onKeyDown = (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
        else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) { e.preventDefault(); choose(suggestions[activeIndex]); }
        else if (e.key === 'Escape') { setOpen(false); }
    };

    return (
        <div className="typeahead" ref={boxRef}>
            <input
                required={required}
                type="text"
                id={id}
                name={name}
                className={className}
                autoComplete="off"
                maxLength={maxLength}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                placeholder={placeholder}
            />
            {open && (
                <ul className="typeahead-list">
                    {loading && <li className="typeahead-msg">Buscando…</li>}
                    {!loading && suggestions.length === 0 && <li className="typeahead-msg">{emptyMessage}</li>}
                    {!loading && suggestions.map((item, i) => (
                        <li
                            key={getKey ? getKey(item, i) : i}
                            className={`typeahead-item ${i === activeIndex ? 'active' : ''}`}
                            onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            {renderItem(item)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Typeahead;
