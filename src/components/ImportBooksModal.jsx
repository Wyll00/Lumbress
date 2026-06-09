import { useState } from 'react';
import { X, Upload, FileText, Check } from 'lucide-react';
import { API_URL, withAuth } from '../config';
import './ImportBooksModal.css';

// Parser CSV que maneja comillas, comas y saltos de línea dentro de campos.
function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* ignorar */ }
        else field += c;
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
}

function parseDate(s) {
    if (!s) return null;
    const d = new Date(String(s).trim().replace(/\//g, '-'));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function mapRows(rows) {
    if (rows.length < 2) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (...names) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
    const iTitle = col('title', 'titulo', 'título');
    const iAuthor = col('author', 'authors', 'autor');
    const iPages = col('number of pages', 'pages', 'páginas', 'paginas', 'page count');
    const iRating = col('my rating', 'rating', 'star rating', 'valoración', 'valoracion');
    const iShelf = col('exclusive shelf', 'read status', 'estado', 'status');
    const iDate = col('date read', 'last date read', 'fecha de lectura', 'read date');
    if (iTitle < 0) return [];

    return rows.slice(1)
        .filter((r) => r[iTitle] && r[iTitle].trim())
        .map((r) => {
            const shelf = (iShelf >= 0 ? (r[iShelf] || '') : '').toLowerCase().trim();
            const status = shelf === 'read' ? 'Read' : (shelf.includes('reading') ? 'Reading' : 'To Read');
            const rating = iRating >= 0 ? parseInt(r[iRating], 10) : 0;
            const pages = iPages >= 0 ? parseInt(r[iPages], 10) : 0;
            return {
                title: (r[iTitle] || '').replace(/\s+/g, ' ').trim(),
                author: iAuthor >= 0 ? (r[iAuthor] || '').replace(/\s+/g, ' ').trim() : '',
                totalPages: Number.isFinite(pages) && pages > 0 ? pages : 0,
                rating: Number.isFinite(rating) && rating > 0 ? Math.min(5, rating) : 0,
                status,
                fecha_fin: iDate >= 0 ? parseDate(r[iDate]) : null,
            };
        });
}

const ImportBooksModal = ({ isOpen, onClose, onImported }) => {
    const [books, setBooks] = useState([]);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const [done, setDone] = useState(0);

    if (!isOpen) return null;

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(''); setDone(0); setBooks([]); setFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const mapped = mapRows(parseCSV(String(reader.result)));
                if (mapped.length === 0) setError('No encontré libros en el CSV (¿tiene una columna "Title"?).');
                else setBooks(mapped);
            } catch {
                setError('No pude leer el archivo. ¿Es un CSV válido?');
            }
        };
        reader.readAsText(file);
    };

    const doImport = async () => {
        setImporting(true);
        try {
            const res = await fetch(`${API_URL}/api/books/import`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ books }),
            }));
            const data = await res.json();
            if (res.ok) { setDone(data.imported || 0); onImported?.(); }
            else setError(data.message || 'Error al importar.');
        } catch {
            setError('Error de conexión.');
        } finally {
            setImporting(false);
        }
    };

    const close = () => {
        setBooks([]); setFileName(''); setError(''); setDone(0);
        onClose();
    };

    return (
        <div className="import-overlay" onClick={close}>
            <div className="import-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                <button className="import-close" onClick={close}><X size={20} /></button>
                <h2><Upload size={22} /> Importar biblioteca</h2>

                {done > 0 ? (
                    <div className="import-success">
                        <Check size={40} />
                        <p>¡Importados <strong>{done}</strong> libros! 🎉</p>
                        <button className="btn-primary" onClick={close}>Cerrar</button>
                    </div>
                ) : (
                    <>
                        <p className="import-help">
                            Sube el <strong>CSV exportado de Goodreads o StoryGraph</strong>. Detecto título, autor, estado, valoración, páginas y fecha de lectura.
                        </p>

                        <label className="import-dropzone">
                            <FileText size={28} />
                            <span>{fileName || 'Elegir archivo CSV…'}</span>
                            <input type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
                        </label>

                        {error && <div className="import-error">{error}</div>}

                        {books.length > 0 && (
                            <>
                                <div className="import-preview">
                                    <p><strong>{books.length}</strong> libros listos para importar:</p>
                                    <ul>
                                        {books.slice(0, 5).map((b, i) => (
                                            <li key={i}><strong>{b.title}</strong> — {b.author || '—'} <em>({b.status})</em></li>
                                        ))}
                                        {books.length > 5 && <li className="import-more">…y {books.length - 5} más</li>}
                                    </ul>
                                </div>
                                <button className="btn-primary import-go" onClick={doImport} disabled={importing}>
                                    {importing ? 'Importando…' : `Importar ${books.length} libros`}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ImportBooksModal;
