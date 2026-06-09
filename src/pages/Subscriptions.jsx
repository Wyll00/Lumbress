import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { Check, Star, Crown, BookOpen, Package, Cloud, Users, Headphones, Gift } from 'lucide-react';
import { API_URL, withAuth } from '../config';
import './Subscriptions.css';

const Subscriptions = () => {
    const { t } = useContext(LanguageContext);
    const [searchParams] = useSearchParams();
    const [currentSub, setCurrentSub] = useState(null);
    const [busy, setBusy] = useState(null);
    const notice = searchParams.get('success') ? 'success' : (searchParams.get('canceled') ? 'canceled' : null);

    const loadSub = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/me`, withAuth());
            if (res.ok) setCurrentSub(await res.json());
        } catch { /* noop */ }
    }, []);

    useEffect(() => { loadSub(); }, [loadSub]);

    // Al volver de Stripe con éxito, el webhook puede tardar un par de segundos: recarga el estado
    useEffect(() => {
        if (searchParams.get('success')) {
            // Sincroniza desde Stripe (por si el webhook aún no llegó) y recarga el estado
            fetch(`${API_URL}/api/subscriptions/sync`, withAuth({ method: 'POST' })).finally(loadSub);
        }
    }, [searchParams, loadSub]);

    const subscribe = async (planId) => {
        setBusy(planId);
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/checkout`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
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

    const isActive = (planId) => currentSub && currentSub.plan === planId && ['active', 'trialing'].includes(currentSub.status);

    const plans = [
        {
            id: 'lector',
            name: 'Plan Lector',
            price: '15,99 €',
            icon: <BookOpen size={28} />,
            description: 'Ideal para quien quiere descubrir un buen libro al mes y empezar a formar parte de la comunidad.',
            categories: [
                {
                    title: '📦 Libros y envíos',
                    items: [
                        '1 libro físico al mes (selección curada)',
                        'Envío estándar (5–7 días laborables)'
                    ]
                },
                {
                    title: '☁️ Biblioteca digital',
                    items: [
                        'Hasta 50 libros digitales en la nube',
                        'Sube tus propios EPUB/PDF/MOBI',
                        'Lector integrado con marcadores y notas',
                        'Catálogo con vista previa'
                    ]
                },
                {
                    title: '👥 Comunidad y club',
                    items: [
                        'Acceso completo a foros y retos',
                        'Club de lectura mensual asíncrono',
                        'Perfil público con estantería virtual'
                    ]
                },
                {
                    title: '🎧 Contenido',
                    items: [
                        'Podcast oficial semanal',
                        'Newsletter y recomendaciones'
                    ]
                },
                {
                    title: '🎁 Descuentos',
                    items: [
                        '5% dto. en librería',
                        '5% dto. en papelería básica'
                    ]
                }
            ],
            buttonText: 'Comenzar Plan Lector',
            featured: false
        },
        {
            id: 'bibliofilo',
            name: 'Plan Bibliófilo',
            price: '23,99 €',
            icon: <Star size={28} />,
            description: 'Para el lector constante que quiere más variedad de formatos, comunidad activa y mejores descuentos.',
            includesPrevious: 'Incluye todo lo del Plan Lector, y además:',
            categories: [
                {
                    title: '📦 Libros y envíos',
                    items: [
                        '1 libro físico + 1 ebook al mes',
                        'Envío prioritario (2–3 días)'
                    ]
                },
                {
                    title: '☁️ Biblioteca ampliada',
                    items: [
                        'Hasta 250 libros digitales',
                        'Lector avanzado con subrayados de colores y exportación',
                        'Sincronización ilimitada multidispositivo',
                        'Estadísticas de lectura completas'
                    ]
                },
                {
                    title: '👥 Comunidad activa',
                    items: [
                        'Club de lectura en directo con moderador',
                        'Canales temáticos privados',
                        'Proponer y votar lecturas del mes'
                    ]
                },
                {
                    title: '🎧 Contenido premium',
                    items: [
                        'Podcast premium (episodios extendidos y archivo)',
                        '1 evento virtual al mes con autores invitados'
                    ]
                },
                {
                    title: '🎁 Extras premium',
                    items: [
                        '10% dto. en librería y papelería premium',
                        'Material coleccionable mensual',
                        'Reseñas destacadas en tu perfil',
                        'Códigos dto. en librerías asociadas'
                    ]
                }
            ],
            buttonText: 'Hacerse Bibliófilo',
            featured: true
        },
        {
            id: 'coleccionista',
            name: 'Plan Coleccionista',
            price: '29,99 €',
            icon: <Crown size={28} />,
            description: 'La experiencia completa: ediciones exclusivas, biblioteca ilimitada y privilegios totales.',
            includesPrevious: 'Incluye todo lo anterior, y además:',
            categories: [
                {
                    title: '📦 Ediciones exclusivas',
                    items: [
                        '2 libros físicos al mes (uno en edición especial)',
                        'Edición firmada por el autor cada 3 meses',
                        'Envío express gratis (24–48 h)'
                    ]
                },
                {
                    title: '☁️ Ilimitado',
                    items: [
                        'Almacenamiento ilimitado en la nube',
                        'Audiolibros ilimitados',
                        'Lector profesional (anotaciones a mano, offline completo)',
                        'Anotaciones colaborativas'
                    ]
                },
                {
                    title: '👥 Comunidad VIP',
                    items: [
                        'Canales privados VIP',
                        'Club de lectura premium con autor invitado',
                        'Sesión 1:1 trimestral con un autor o crítico',
                        'Insignia "Coleccionista"'
                    ]
                },
                {
                    title: '🎧 Eventos VIP',
                    items: [
                        'Eventos presenciales prioritarios',
                        'Acceso anticipado a novedades',
                        'Podcast sin cortes + episodios privados'
                    ]
                },
                {
                    title: '🎁 Experiencia total',
                    items: [
                        '20% dto. en librería y papelería exclusiva',
                        'Caja sorpresa trimestral premium',
                        'Tote bag oficial de regalo',
                        'Bolígrafo o marcapáginas grabado (primer mes)'
                    ]
                }
            ],
            buttonText: 'Ser Coleccionista',
            featured: false
        }
    ];

    return (
        <div className="subscriptions-page animate-fade-in">
            <header className="subscriptions-header">
                <h1 className="gradient-text">Planes de Suscripción</h1>
                <p>Tres niveles diseñados para acompañar a cada tipo de lector: desde quien empieza a construir su biblioteca hasta el coleccionista más exigente.</p>
                <div className="header-perks">
                    <span>☁️ Nube digital</span>
                    <span className="dot">•</span>
                    <span>👥 Club de lectura</span>
                    <span className="dot">•</span>
                    <span>🎁 Descuentos</span>
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
            {currentSub && currentSub.status && (
                <div className="glass-panel" style={{ padding: '12px 18px', margin: '0 0 18px', color: 'var(--text-secondary)' }}>
                    Tu plan: <strong style={{ color: 'var(--accent-color)', textTransform: 'capitalize' }}>{currentSub.plan}</strong> · estado {currentSub.status}
                    {currentSub.current_period_end ? ` · renueva el ${new Date(currentSub.current_period_end).toLocaleDateString('es-ES')}` : ''}
                </div>
            )}

            <div className="pricing-grid">
                {plans.map((plan, index) => (
                    <div key={plan.id} className={`pricing-card glass-panel ${plan.featured ? 'featured' : ''}`} style={{ animationDelay: `${index * 0.15}s` }}>
                        {plan.featured && <div className="featured-badge">Recomendado</div>}
                        
                        <div className="card-header">
                            <div className={`plan-icon-wrapper ${plan.id}`}>
                                {plan.icon}
                            </div>
                            <h2 className="plan-name">{plan.name}</h2>
                            <p className="plan-description">{plan.description}</p>
                            <div className="plan-price">
                                {plan.price}<span>/mes</span>
                            </div>
                            {isActive(plan.id) ? (
                                <button className="btn-secondary" onClick={openPortal} disabled={busy === 'portal'}>
                                    ✓ Tu plan actual — Gestionar
                                </button>
                            ) : (
                                <button
                                    className={plan.featured ? 'btn-primary' : 'btn-secondary'}
                                    onClick={() => subscribe(plan.id)}
                                    disabled={busy === plan.id}
                                >
                                    {busy === plan.id ? 'Redirigiendo…' : plan.buttonText}
                                </button>
                            )}
                        </div>

                        <div className="card-body scrollable-content">
                            {plan.includesPrevious && (
                                <div className="includes-previous">
                                    <span className="plus-icon">+</span> {plan.includesPrevious}
                                </div>
                            )}
                            
                            <div className="plan-categories">
                                {plan.categories.map((cat, catIdx) => (
                                    <div key={catIdx} className="plan-category">
                                        <h4 className="category-title">{cat.title}</h4>
                                        <ul className="plan-features">
                                            {cat.items.map((item, itemIdx) => (
                                                <li key={itemIdx}>
                                                    <Check size={16} className="feature-icon" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="extra-ideas glass-panel">
                <h3>💡 ¿Aún no te decides?</h3>
                <div className="ideas-grid">
                    <div className="idea-item">
                        <span className="idea-emoji">⏱️</span>
                        <div>
                            <h4>Prueba gratuita de 14 días</h4>
                            <p>Acceso digital y comunidad sin compromiso.</p>
                        </div>
                    </div>
                    <div className="idea-item">
                        <span className="idea-emoji">🗓️</span>
                        <div>
                            <h4>Plan Anual</h4>
                            <p>Paga 10 meses y llévate 2 meses gratis.</p>
                        </div>
                    </div>
                    <div className="idea-item">
                        <span className="idea-emoji">🎁</span>
                        <div>
                            <h4>Plan Regalo</h4>
                            <p>Regala 1, 3, 6 o 12 meses a otro lector.</p>
                        </div>
                    </div>
                    <div className="idea-item">
                        <span className="idea-emoji">⏸️</span>
                        <div>
                            <h4>Flexibilidad Total</h4>
                            <p>Pausa tu suscripción hasta 2 meses al año.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscriptions;
