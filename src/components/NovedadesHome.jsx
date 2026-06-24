import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { API_URL, withAuth } from '../config';
import NovedadesCarousel from './NovedadesCarousel';

// Sección de "Novedades" para la pantalla de Inicio: trae las novedades y muestra
// el carrusel. Si no hay ninguna, no pinta nada (no deja un hueco vacío).
const NovedadesHome = () => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/novedades`, withAuth());
                if (res.ok) setItems(await res.json());
            } catch { /* sin conexión: no mostramos la sección */ }
        })();
    }, []);

    if (items.length === 0) return null;

    return (
        <section style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <Sparkles size={22} style={{ color: '#e0a93b' }} /> Novedades
                </h2>
                <Link to="/novedades" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>
                    Ver todas <ChevronRight size={16} />
                </Link>
            </div>
            <NovedadesCarousel items={items} />
        </section>
    );
};

export default NovedadesHome;
