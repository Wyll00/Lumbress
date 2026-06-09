import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL, mediaUrl } from '../config';
import './PublicShelf.css';

// Estantería pública (sin login) — /u/:username
const PublicShelf = () => {
    const { username } = useParams();
    const [data, setData] = useState(null);
    const [state, setState] = useState('loading'); // loading | ok | notfound

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/public/shelf/${encodeURIComponent(username)}`);
                if (!active) return;
                if (res.ok) { setData(await res.json()); setState('ok'); }
                else setState('notfound');
            } catch {
                if (active) setState('notfound');
            }
        })();
        return () => { active = false; };
    }, [username]);

    if (state === 'loading') {
        return <div className="ps-wrap ps-center"><div className="loading-spinner" /></div>;
    }
    if (state === 'notfound') {
        return (
            <div className="ps-wrap ps-center">
                <h1>📚</h1>
                <p>Esta estantería no existe o es privada.</p>
                <Link to="/" className="btn-primary">Ir a Códice</Link>
            </div>
        );
    }

    const initials = (data.username || '?').substring(0, 2).toUpperCase();

    return (
        <div className="ps-wrap">
            <header className="ps-header">
                <div className="ps-avatar">
                    {data.avatar
                        ? <img src={mediaUrl(data.avatar)} alt={data.username} />
                        : <span>{initials}</span>}
                </div>
                <h1>La estantería de <strong>@{data.username}</strong></h1>
                <div className="ps-stats">
                    <span><b>{data.stats.total}</b> libros</span>
                    <span><b>{data.stats.read}</b> leídos</span>
                    <span><b>{data.stats.genres}</b> géneros</span>
                    <span><b>{data.stats.hours}</b> h leyendo</span>
                </div>
            </header>

            {data.books.length === 0 ? (
                <p className="ps-empty">Aún no hay libros en esta estantería.</p>
            ) : (
                <div className="ps-grid">
                    {data.books.map((b, i) => (
                        <div key={i} className="ps-book">
                            <div className="ps-cover">
                                {b.coverUrl
                                    ? <img src={mediaUrl(b.coverUrl)} alt="" loading="lazy" />
                                    : <span>{(b.title || '?').substring(0, 2).toUpperCase()}</span>}
                            </div>
                            <span className="ps-title" title={b.title}>{b.title}</span>
                            <span className="ps-author">{b.author}</span>
                            {Number(b.rating) > 0 && <span className="ps-rating">{'★'.repeat(Number(b.rating))}</span>}
                        </div>
                    ))}
                </div>
            )}

            <footer className="ps-footer">
                <Link to="/">Hecho con 📒 Códice</Link>
            </footer>
        </div>
    );
};

export default PublicShelf;
