import { useContext, useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Check } from 'lucide-react';
import { LibraryContext } from '../context/LibraryContext';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth } from '../config';
import './Recommendations.css';

// "Recomendado para ti" — más libros de tus autores favoritos (vía /api/recommendations).
const Recommendations = () => {
    const { addBook } = useContext(LibraryContext);
    const { t } = useContext(LanguageContext);
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [added, setAdded] = useState({});

    const load = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/recommendations`, withAuth());
            setRecs(res.ok ? await res.json() : []);
        } catch {
            setRecs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = (rec, idx) => {
        addBook({
            title: rec.title,
            author: rec.author,
            coverUrl: rec.coverUrl || '',
            totalPages: rec.totalPages || '',
            status: 'To Read',
        });
        setAdded((prev) => ({ ...prev, [`${rec.title}-${idx}`]: true }));
    };

    if (loading || recs.length === 0) return null;

    return (
        <div className="recommendations glass-panel">
            <h2><Sparkles size={20} /> {t('recTitle')}</h2>
            <p className="rec-sub">{t('recSub')}</p>
            <div className="rec-grid">
                {recs.map((rec, i) => {
                    const isAdded = added[`${rec.title}-${i}`];
                    return (
                        <div key={`${rec.title}-${i}`} className="rec-card">
                            <div className="rec-cover">
                                {rec.coverUrl
                                    ? <img src={rec.coverUrl} alt="" loading="lazy" />
                                    : <span className="rec-cover-empty">📖</span>}
                            </div>
                            <div className="rec-info">
                                <span className="rec-title" title={rec.title}>{rec.title}</span>
                                <span className="rec-author">{rec.author}{rec.year ? ` · ${rec.year}` : ''}</span>
                                <span className="rec-reason">{t('recReason', { author: rec.reason })}</span>
                                <button
                                    className={`rec-add ${isAdded ? 'added' : ''}`}
                                    onClick={() => !isAdded && add(rec, i)}
                                    disabled={isAdded}
                                >
                                    {isAdded ? <><Check size={14} /> {t('recAdded')}</> : <><Plus size={14} /> {t('recAdd')}</>}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Recommendations;
