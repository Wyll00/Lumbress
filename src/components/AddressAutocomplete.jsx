import { useCallback } from 'react';
import { API_URL, withAuth } from '../config';
import Typeahead from './Typeahead';

// Autocompletado de direcciones (Photon/OSM vía /api/geo-search).
// Al elegir, onSelect(addr) con { direccion, codigo_postal, ciudad, provincia, pais }.
const AddressAutocomplete = ({ value, onChange, onSelect, placeholder, id = 'direccion', name = 'direccion', required = false, className = 'input', maxLength }) => {
    const fetchAddresses = useCallback(async (q) => {
        const res = await fetch(`${API_URL}/api/geo-search?q=${encodeURIComponent(q)}`, withAuth());
        return res.ok ? res.json() : [];
    }, []);

    return (
        <Typeahead
            value={value}
            onChange={onChange}
            onPick={onSelect}
            fetchSuggestions={fetchAddresses}
            getKey={(a, i) => `${a.label}-${i}`}
            minChars={3}
            debounceMs={350}
            emptyMessage="Sin resultados (puedes escribirla igual)"
            placeholder={placeholder}
            id={id}
            name={name}
            required={required}
            className={className}
            maxLength={maxLength}
            renderItem={(a) => (
                <div className="typeahead-row">
                    <span className="typeahead-icon">📍</span>
                    <span className="typeahead-primary typeahead-wrap">{a.label}</span>
                </div>
            )}
        />
    );
};

export default AddressAutocomplete;
