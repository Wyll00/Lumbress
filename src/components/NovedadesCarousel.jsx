import { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { mediaUrl } from '../config';
import '../pages/Novedades.css';

// Carrusel de cards grandes de Novedades, con auto-avance cada 3s (pausa al pasar
// el ratón). Presentacional: recibe los `items`. Con `manageable`, muestra el
// botón de quitar (llama a `onRemove`). Si no hay items, no pinta nada.
const NovedadesCarousel = ({ items = [], manageable = false, onRemove }) => {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    // Auto-avance cada 3s; no rota si hay 0/1 libro o si el ratón está encima
    useEffect(() => {
        if (items.length < 2 || paused) return undefined;
        const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 3000);
        return () => clearInterval(t);
    }, [items.length, paused]);

    if (items.length === 0) return null;
    // Índice "seguro": si la lista encoge (p. ej. al borrar), envuelve sin tocar estado
    const count = items.length;
    const safeIndex = index % count;
    const go = (n) => setIndex((safeIndex + n + count) % count);

    return (
        <>
            <div className="nov-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                <div className="nov-track" style={{ transform: `translateX(-${safeIndex * 100}%)` }}>
                    {items.map((it) => (
                        <div className="nov-slide" key={it.id}>
                            <div className="nov-card glass-panel">
                                <div className="nov-cover">
                                    {it.portada_url ? (
                                        <img src={mediaUrl(it.portada_url)} alt={it.titulo} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                        <BookOpen size={48} style={{ color: 'var(--text-secondary)' }} />
                                    )}
                                </div>
                                <div className="nov-info">
                                    <div className="nov-info-top">
                                        {it.genero && <span className="nov-chip">{it.genero}</span>}
                                        <h2 className="nov-title">{it.titulo}</h2>
                                        <p className="nov-author">{it.autor}</p>
                                        {it.sinopsis && <p className="nov-synopsis">{it.sinopsis}</p>}
                                    </div>
                                    <div className="nov-actions">
                                        <a href={it.enlace} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', textDecoration: 'none' }}>
                                            Conseguir <ExternalLink size={15} />
                                        </a>
                                        <div className="nov-actions-meta">
                                            {it.publicado_por && <span className="nov-by">Promocionado por @{it.publicado_por}</span>}
                                            {manageable && it.isOwner && (
                                                <button className="nov-del" onClick={() => onRemove?.(it.id)} title="Quitar promoción">
                                                    <Trash2 size={14} /> Quitar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {items.length > 1 && (
                    <>
                        <button className="nov-arrow left" onClick={() => go(-1)} aria-label="Anterior"><ChevronLeft size={20} /></button>
                        <button className="nov-arrow right" onClick={() => go(1)} aria-label="Siguiente"><ChevronRight size={20} /></button>
                    </>
                )}
            </div>
            {items.length > 1 && (
                <div className="nov-dots">
                    {items.map((_, i) => (
                        <button key={i} className={i === safeIndex ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Ir al libro ${i + 1}`} />
                    ))}
                </div>
            )}
        </>
    );
};

export default NovedadesCarousel;
