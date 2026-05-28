import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MapPin, Tag, User, Phone, Eye, Home, MessageSquare } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth, mediaUrl } from '../config';
import './OffersFeed.css';

const ESTADO_COLOR = {
    'Nuevo': '#2ecc71',
    'Como nuevo': '#27ae60',
    'Buen estado': '#f1c40f',
    'Aceptable': '#e67e22',
};

// Ubicación pública (solo ciudad, provincia, país — sin calle exacta)
const formatPublicLocation = (o) => {
    const parts = [o.ciudad, o.provincia, o.pais].filter(Boolean);
    if (parts.length === 0 && o.ubicacion) return o.ubicacion;  // fallback datos antiguos
    return parts.join(', ');
};

// Dirección exacta completa (cuando se revela tras pulsar el botón)
const formatExactAddress = (d) => {
    const parts = [];
    if (d.direccion) parts.push(d.direccion);
    const cpCiudad = [d.codigo_postal, d.ciudad].filter(Boolean).join(' ');
    if (cpCiudad) parts.push(cpCiudad);
    if (d.provincia) parts.push(d.provincia);
    if (d.pais) parts.push(d.pais);
    return parts.join(', ');
};

const Avatar = ({ name, image }) => (
    image
        ? <img src={mediaUrl(image)} alt={name} className="offer-avatar" />
        : <span className="offer-avatar offer-avatar-fallback">{(name || '?').substring(0, 2).toUpperCase()}</span>
);

const OffersFeed = () => {
    const { isAuthenticated, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState({});   // { [id]: dirección exacta }
    const [revealing, setRevealing] = useState(null); // id en proceso

    const revealAddress = async (id) => {
        setRevealing(id);
        try {
            const res = await fetch(`${API_URL}/api/anuncios/${id}/contacto`, withAuth());
            if (res.ok) {
                const data = await res.json();
                setRevealed(prev => ({ ...prev, [id]: data }));
            }
        } catch (err) {
            console.error('Error revealing address', err);
        } finally {
            setRevealing(null);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchOffers = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/anuncios`, withAuth());
                if (res.ok) setOffers(await res.json());
            } catch (err) {
                console.error('Error fetching offers', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, [isAuthenticated]);

    if (loading) {
        return (
            <div className="offers-loading">
                <div className="loading-spinner" />
                <p>Cargando ofertas...</p>
            </div>
        );
    }

    if (offers.length === 0) {
        return (
            <div className="offers-empty glass-panel">
                <BookOpen size={48} style={{ opacity: 0.3 }} />
                <h3>Aún no hay libros en venta</h3>
                <p>Sé el primero: pulsa "Vende tu libro con nosotros" arriba.</p>
            </div>
        );
    }

    return (
        <div className="offers-grid">
            {offers.map(o => (
                <article key={o.id} className={`offer-card glass-panel ${o.vendido ? 'sold' : ''}`}>
                    <div className="offer-image">
                        {o.imagen_url
                            ? <img src={mediaUrl(o.imagen_url)} alt={o.titulo_libro} loading="lazy" />
                            : <div className="offer-image-fallback"><BookOpen size={32} /></div>
                        }
                        {o.vendido === 1 && <span className="offer-sold-badge">VENDIDO</span>}
                        <span className="offer-price">{Number(o.precio).toFixed(2)} {o.moneda}</span>
                    </div>
                    <div className="offer-body">
                        <h3 className="offer-title" title={o.titulo_libro}>{o.titulo_libro}</h3>
                        {o.autor && <p className="offer-author">{o.autor}</p>}

                        <div className="offer-tags">
                            <span className="offer-estado" style={{ '--c': ESTADO_COLOR[o.estado_libro] || '#999' }}>
                                {o.estado_libro}
                            </span>
                            {o.genero && <span className="offer-genero">{o.genero}</span>}
                        </div>

                        {o.descripcion && <p className="offer-desc">{o.descripcion}</p>}

                        {formatPublicLocation(o) && (
                            <div className="offer-meta">
                                <span><MapPin size={12} /> {formatPublicLocation(o)}</span>
                            </div>
                        )}

                        {!o.vendido && (
                            revealed[o.id]
                                ? formatExactAddress(revealed[o.id]) && (
                                    <div className="offer-exact-address">
                                        <Home size={13} /> {formatExactAddress(revealed[o.id])}
                                    </div>
                                )
                                : (
                                    <button
                                        className="offer-reveal-btn"
                                        onClick={() => revealAddress(o.id)}
                                        disabled={revealing === o.id}
                                    >
                                        <Eye size={13} /> {revealing === o.id ? 'Cargando...' : 'Ver dirección exacta'}
                                    </button>
                                )
                        )}

                        {o.telefono && !o.vendido && (
                            <a className="offer-call" href={`tel:${o.telefono.replace(/\s+/g, '')}`}>
                                <Phone size={14} /> Llamar: {o.telefono}
                            </a>
                        )}

                        {!o.vendido && o.usuario_id !== user?.id && (
                            <button
                                className="offer-message-btn"
                                onClick={() => navigate(`/mensajes?to=${o.usuario_id}&nombre=${encodeURIComponent(o.vendedor)}`)}
                            >
                                <MessageSquare size={14} /> Enviar mensaje al vendedor
                            </button>
                        )}

                        <div className="offer-footer">
                            <div className="offer-seller">
                                <Avatar name={o.vendedor} image={o.vendedor_avatar} />
                                <span>@{o.vendedor}</span>
                            </div>
                            {o.contacto && !o.vendido && (
                                <span className="offer-contact" title={o.contacto}>
                                    <User size={12} /> {o.contacto}
                                </span>
                            )}
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
};

export default OffersFeed;
