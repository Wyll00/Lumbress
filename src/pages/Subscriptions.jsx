import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Star, BookOpen, Feather } from 'lucide-react';
import { API_URL, withAuth } from '../config';
import './Subscriptions.css';

// Modelo de lanzamiento: Gratis + Premium (doc "Estrategia de suscripción").
// El plan Autor queda como teaser hasta que haya tracción en el Taller.
const PRICE = { month: '4,99 €', year: '44,99 €' };

const Subscriptions = () => {
    const [searchParams] = useSearchParams();
    const [me, setMe] = useState(null); // { plan, plan_status, subscription }
    const [interval, setInterval_] = useState('year');
    const [busy, setBusy] = useState(null);
    const notice = searchParams.get('success') ? 'success' : (searchParams.get('canceled') ? 'canceled' : null);

    const loadMe = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/me`, withAuth());
            if (res.ok) setMe(await res.json());
        } catch { /* noop */ }
    }, []);

    useEffect(() => { loadMe(); }, [loadMe]);

    // Al volver de Stripe con éxito, el webhook puede tardar: sincroniza y recarga
    useEffect(() => {
        if (searchParams.get('success')) {
            fetch(`${API_URL}/api/subscriptions/sync`, withAuth({ method: 'POST' })).finally(loadMe);
        }
    }, [searchParams, loadMe]);

    const subscribe = async () => {
        setBusy('checkout');
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/checkout`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval }),
            }));
            const data = await res.json();
            if (res.ok && data.url) { window.location.href = data.url; return; }
            alert(data.message || 'No se pudo iniciar el pago.');
        } catch { alert('Error de conexión.'); }
        finally { setBusy(null); }
    };

    const openPortal = async () => {
        setBusy('portal');
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/portal`, withAuth({ method: 'POST' }));
            const data = await res.json();
            if (res.ok && data.url) { window.location.href = data.url; return; }
            alert(data.message || 'No se pudo abrir el portal.');
        } catch { alert('Error de conexión.'); }
        finally { setBusy(null); }
    };

    const isPremium = me?.plan === 'premium';
    const sub = me?.subscription;

    const freeFeatures = [
        'Comunidad completa: feed, reseñas, chat y perfiles',
        'Marketplace de segunda mano (comprar y vender)',
        'Biblioteca personal: hasta 5 libros',
        'Lector EPUB/PDF integrado (sube tus propios libros)',
        'Reseñas, valoraciones y notas en tus libros',
        '1 proyecto en el Taller de Novela',
        'Estantería pública para compartir',
    ];
    const premiumFeatures = [
        'Biblioteca ilimitada y privada (20 GB para tus EPUB/PDF)',
        'Estadísticas de lectura completas y logros',
        'Reto de lectura anual y seguimiento de ritmo',
        'Importación de libros en lote',
        'Insignia Premium en tu perfil',
        'Soporte prioritario',
        'Próximamente: anotaciones y sincronización en el lector',
    ];

    // Comparativa rápida (del documento de estrategia)
    const compare = [
        ['Comunidad (feed, reseñas, chat)', true, true],
        ['Marketplace 2ª mano', true, true],
        ['Biblioteca propia', '5 libros', 'Ilimitada'],
        ['Lector EPUB/PDF', '500 MB', '20 GB'],
        ['Estadísticas y logros', false, true],
        ['Reto de lectura anual', false, true],
        ['Importar libros en lote', true, true],
        ['Taller de Novela', '1 proyecto', '1 proyecto'],
        ['Insignia de perfil', false, true],
    ];

    return (
        <div className="subscriptions-page animate-fade-in">
            <header className="subscriptions-header">
                <h1 className="gradient-text">Lumbres Premium</h1>
                <p>La comunidad siempre es gratis. Premium es para el lector ávido: biblioteca sin límites, estadísticas y tu reto anual.</p>
                <div className="header-perks">
                    <span>👥 Comunidad gratis para siempre</span>
                    <span className="dot">•</span>
                    <span>☁️ Biblioteca ilimitada</span>
                    <span className="dot">•</span>
                    <span>📊 Estadísticas y retos</span>
                </div>
            </header>

            {notice === 'success' && (
                <div className="glass-panel" style={{ padding: '14px 18px', margin: '0 0 18px', borderLeft: '4px solid #2ecc71' }}>
                    ✅ ¡Suscripción activada! Gracias por unirte. Puede tardar unos segundos en reflejarse.
                </div>
            )}
            {notice === 'canceled' && (
                <div className="glass-panel" style={{ padding: '14px 18px', margin: '0 0 18px', borderLeft: '4px solid #e0a93b', color: 'var(--text-secondary)' }}>
                    Pago cancelado — no se ha cobrado nada.
                </div>
            )}
            {isPremium && (
                <div className="glass-panel" style={{ padding: '12px 18px', margin: '0 0 18px', color: 'var(--text-secondary)' }}>
                    Tu plan: <strong style={{ color: 'var(--accent-color)' }}>Premium</strong>
                    {sub?.status ? ` · estado ${sub.status}` : ''}
                    {sub?.current_period_end ? ` · renueva el ${new Date(sub.current_period_end).toLocaleDateString('es-ES')}` : ''}
                    {sub?.cancel_at_period_end ? ' · se cancelará al final del periodo' : ''}
                </div>
            )}

            {/* Toggle mensual / anual */}
            <div className="billing-toggle">
                <button className={interval === 'month' ? 'active' : ''} onClick={() => setInterval_('month')}>Mensual</button>
                <button className={interval === 'year' ? 'active' : ''} onClick={() => setInterval_('year')}>
                    Anual <span className="save-badge">2 meses gratis</span>
                </button>
            </div>

            <div className="pricing-grid two-plans">
                {/* Gratis */}
                <div className="pricing-card glass-panel">
                    <div className="card-header">
                        <div className="plan-icon-wrapper lector"><BookOpen size={28} /></div>
                        <h2 className="plan-name">Lector</h2>
                        <p className="plan-description">Para formar parte de la comunidad y llevar tus lecturas. Gratis para siempre.</p>
                        <div className="plan-price">0 €<span>/mes</span></div>
                        <button className="btn-secondary" disabled>
                            {isPremium ? 'Incluido en tu plan' : '✓ Tu plan actual'}
                        </button>
                    </div>
                    <div className="card-body">
                        <ul className="plan-features">
                            {freeFeatures.map((f, i) => (
                                <li key={i}><Check size={16} className="feature-icon" /><span>{f}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Premium */}
                <div className="pricing-card glass-panel featured">
                    <div className="featured-badge">Recomendado</div>
                    <div className="card-header">
                        <div className="plan-icon-wrapper bibliofilo"><Star size={28} /></div>
                        <h2 className="plan-name">Lector+</h2>
                        <p className="plan-description">El plan del lector ávido: sin límites y con todas las herramientas de seguimiento.</p>
                        <div className="plan-price">
                            {PRICE[interval]}<span>/{interval === 'year' ? 'año' : 'mes'}</span>
                        </div>
                        {interval === 'year' && (
                            <p style={{ margin: '-8px 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Equivale a 3,75 €/mes
                            </p>
                        )}
                        {isPremium ? (
                            <button className="btn-secondary" onClick={openPortal} disabled={busy === 'portal'}>
                                {busy === 'portal' ? 'Abriendo…' : '✓ Tu plan actual — Gestionar'}
                            </button>
                        ) : (
                            <button className="btn-primary" onClick={subscribe} disabled={busy === 'checkout'}>
                                {busy === 'checkout' ? 'Redirigiendo…' : 'Hacerme Premium'}
                            </button>
                        )}
                    </div>
                    <div className="card-body">
                        <div className="includes-previous"><span className="plus-icon">+</span> Todo lo del plan Lector, y además:</div>
                        <ul className="plan-features">
                            {premiumFeatures.map((f, i) => (
                                <li key={i}><Check size={16} className="feature-icon" /><span>{f}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Comparativa rápida */}
            <div className="glass-panel compare-table-wrap">
                <h3>Comparativa rápida</h3>
                <table className="compare-table">
                    <thead>
                        <tr><th>Función</th><th>Lector (gratis)</th><th>Lector+ (Premium)</th></tr>
                    </thead>
                    <tbody>
                        {compare.map(([feat, free, prem], i) => (
                            <tr key={i}>
                                <td>{feat}</td>
                                <td>{free === true ? <Check size={16} className="cmp-yes" /> : free === false ? <X size={16} className="cmp-no" /> : free}</td>
                                <td>{prem === true ? <Check size={16} className="cmp-yes" /> : prem === false ? <X size={16} className="cmp-no" /> : prem}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="extra-ideas glass-panel">
                <h3>💡 Bueno saberlo</h3>
                <div className="ideas-grid">
                    <div className="idea-item">
                        <span className="idea-emoji">🔒</span>
                        <div>
                            <h4>Pago seguro con Stripe</h4>
                            <p>Cancela o cambia de mensual a anual cuando quieras desde "Gestionar".</p>
                        </div>
                    </div>
                    <div className="idea-item">
                        <span className="idea-emoji">🗓️</span>
                        <div>
                            <h4>Plan anual</h4>
                            <p>{PRICE.year}/año: pagas 9 meses, lees 12.</p>
                        </div>
                    </div>
                    <div className="idea-item">
                        <span className="idea-emoji">👥</span>
                        <div>
                            <h4>La comunidad no se paga</h4>
                            <p>Feed, reseñas, chat y marketplace son gratis para todos, siempre.</p>
                        </div>
                    </div>
                    <div className="idea-item">
                        <span className="idea-emoji"><Feather size={20} /></span>
                        <div>
                            <h4>Plan Autor — próximamente</h4>
                            <p>Taller ilimitado, exportar tu manuscrito y vender tu ebook en Lumbres.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscriptions;
