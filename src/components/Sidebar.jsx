import { useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { BookOpen, Home, Compass, Users, MessageSquare, Sparkles, Newspaper, Headphones, Feather, BarChart3, SlidersHorizontal, Shield, Globe, LogOut, CreditCard, MoreHorizontal, PanelLeftClose, PanelLeftOpen, ChevronUp } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { SUBSCRIPTIONS_ENABLED } from '../config';
import './Sidebar.css';

// Menú lateral (diseño "Menú Lumbres" de Claude Design): cabecera con marca + botón de
// plegar, navegación principal, sección Descubrir, bloque de cuenta y tarjeta de usuario.
const Sidebar = () => {
    const { t, language, toggleLanguage } = useContext(LanguageContext);
    const { logout, user } = useContext(AuthContext);
    const { unreadTotal } = useContext(NotificationContext);
    const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : '?';
    // Móvil: la barra inferior muestra los ítems esenciales + "Más" (el resto en un panel)
    const [moreOpen, setMoreOpen] = useState(false);
    const closeMore = () => setMoreOpen(false);

    // Escritorio: el bloque de cuenta (Estadísticas, Ajustes…) vive en un menú que solo
    // se despliega al tocar la tarjeta de usuario, para no ocupar espacio siempre.
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const closeUserMenu = () => setUserMenuOpen(false);

    // Cierre del menú de cuenta: cualquier pulsación fuera del menú lo cierra, SIN robar el
    // clic (el elemento pulsado responde normal). La tarjeta de usuario queda excluida aquí
    // porque su propio onClick hace el toggle abrir/cerrar.
    useEffect(() => {
        if (!userMenuOpen) return;
        const onDocPointerDown = (e) => {
            if (e.target.closest?.('.sidebar-bottom-group') || e.target.closest?.('.sidebar-user-card')) return;
            setUserMenuOpen(false);
        };
        document.addEventListener('pointerdown', onDocPointerDown);
        return () => document.removeEventListener('pointerdown', onDocPointerDown);
    }, [userMenuOpen]);

    // Escritorio: menú plegable a solo-iconos (persistido). El margen del contenido lo
    // ajusta App.css a través de la clase en <body>.
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lumbres-sidebar-collapsed') === '1');
    useEffect(() => {
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        localStorage.setItem('lumbres-sidebar-collapsed', collapsed ? '1' : '0');
        return () => document.body.classList.remove('sidebar-collapsed');
    }, [collapsed]);

    const hours = Number(user?.reading_hours || 0).toLocaleString(language === 'es' ? 'es-ES' : 'en-US');

    return (
        <nav className={`sidebar glass-panel${collapsed ? ' collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <img
                        src="/logo.png"
                        alt="Lumbres"
                        className="logo-img"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                    />
                    <div className="logo-fallback" style={{ display: 'none' }}>
                        <BookOpen size={22} />
                    </div>
                    <span className="brand-name">Lumbres</span>
                </div>
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed((c) => !c)}
                    title={collapsed ? (language === 'es' ? 'Desplegar menú' : 'Expand menu') : (language === 'es' ? 'Plegar menú' : 'Collapse menu')}
                >
                    {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>

            <ul className="nav-links">
                <li>
                    <NavLink to="/" className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                        <Home size={20} />
                        <span>{t('dashboard')}</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/library" className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                        <BookOpen size={20} />
                        <span>{language === 'es' ? 'Biblioteca' : 'Library'}</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/catalogo" className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                        <Compass size={20} />
                        <span>{language === 'es' ? 'Explorar' : 'Explore'}</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/community" className={({ isActive }) => `nav-item nav-pink${isActive ? ' active' : ''}`}>
                        <Users size={20} />
                        <span>{t('community')}</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/mensajes" className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                        <MessageSquare size={20} />
                        <span>{t('messages')}</span>
                        {unreadTotal > 0 && <span className="nav-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
                    </NavLink>
                </li>

                <li className="nav-section"><span>{language === 'es' ? 'Descubrir' : 'Discover'}</span></li>
                <li>
                    <NavLink to="/novedades" className={({ isActive }) => `nav-item nav-green${isActive ? ' active' : ''}`}>
                        <Sparkles size={20} />
                        <span>{language === 'es' ? 'Novedades' : "What's new"}</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/blog" className={({ isActive }) => `nav-item nav-green${isActive ? ' active' : ''}`}>
                        <Newspaper size={20} />
                        <span>Blog</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/podcasts" className={({ isActive }) => `nav-item nav-green${isActive ? ' active' : ''}`}>
                        <Headphones size={20} />
                        <span>Podcasts</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/taller" className={({ isActive }) => `nav-item nav-green${isActive ? ' active' : ''}`}>
                        <Feather size={20} />
                        <span>{t('workshop')}</span>
                    </NavLink>
                </li>

                {/* Solo móvil: abre el panel con el resto del menú */}
                <li className="nav-more-li">
                    <button className={`nav-item nav-more-btn ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen((o) => !o)}>
                        <MoreHorizontal size={20} />
                        <span>Más</span>
                    </button>
                </li>
            </ul>

            {/* Panel "Más" (solo móvil) */}
            {moreOpen && (
                <>
                    <div className="mobile-more-backdrop" onClick={closeMore} />
                    <div className="mobile-more glass-panel">
                        <NavLink to="/catalogo" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Compass size={19} /><span>{language === 'es' ? 'Explorar' : 'Explore'}</span>
                        </NavLink>
                        <NavLink to="/statistics" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <BarChart3 size={19} /><span>{t('statistics')}</span>
                        </NavLink>
                        <NavLink to="/novedades" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Sparkles size={19} /><span>{language === 'es' ? 'Novedades' : "What's new"}</span>
                        </NavLink>
                        <NavLink to="/blog" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Newspaper size={19} /><span>Blog</span>
                        </NavLink>
                        <NavLink to="/podcasts" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Headphones size={19} /><span>Podcasts</span>
                        </NavLink>
                        <NavLink to="/taller" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Feather size={19} /><span>{t('workshop')}</span>
                        </NavLink>
                        {SUBSCRIPTIONS_ENABLED && (
                            <NavLink to="/subscriptions" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                                <CreditCard size={19} /><span>{t('subscriptionsNav')}</span>
                            </NavLink>
                        )}
                        <NavLink to="/settings" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <SlidersHorizontal size={19} /><span>{t('settingsNav')}</span>
                        </NavLink>
                        {!!user?.is_admin && (
                            <NavLink to="/admin" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                                <Shield size={19} /><span>Admin</span>
                            </NavLink>
                        )}
                        <div className="mobile-more-footer">
                            <NavLink to="/settings" onClick={closeMore} className="sidebar-user-avatar" title={`@${user?.username || ''}`}>
                                {user?.profile_image
                                    ? <img src={user.profile_image} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    : <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{initials}</span>}
                            </NavLink>
                            <button className="btn-secondary" onClick={() => { toggleLanguage(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
                                <Globe size={15} /> {language === 'es' ? 'EN' : 'ES'}
                            </button>
                            <button className="btn-secondary" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', color: '#e07b6a' }}>
                                <LogOut size={15} /> {language === 'es' ? 'Salir' : 'Logout'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Bloque inferior (solo escritorio): la tarjeta de usuario despliega el menú de cuenta */}
            <div className="sidebar-bottom">
                {/* Portal al <body>: si el menú viviera dentro del sidebar, su overflow y el
                    efecto glass lo recortarían (sobre todo con la barra plegada). */}
                {userMenuOpen && createPortal(
                    <>
                        <div className={`sidebar-bottom-group${collapsed ? ' from-collapsed' : ''}`}>
                            <NavLink to="/statistics" onClick={closeUserMenu} className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                                <BarChart3 size={19} />
                                <span>{t('statistics')}</span>
                            </NavLink>
                            {SUBSCRIPTIONS_ENABLED && (
                                <NavLink to="/subscriptions" onClick={closeUserMenu} className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                                    <CreditCard size={19} />
                                    <span>{t('subscriptionsNav')}</span>
                                </NavLink>
                            )}
                            <NavLink to="/settings" onClick={closeUserMenu} className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                                <SlidersHorizontal size={19} />
                                <span>{t('settingsNav')}</span>
                            </NavLink>
                            {!!user?.is_admin && (
                                <NavLink to="/admin" onClick={closeUserMenu} className={({ isActive }) => `nav-item nav-warm${isActive ? ' active' : ''}`}>
                                    <Shield size={19} />
                                    <span>Admin</span>
                                </NavLink>
                            )}
                            <button
                                className="nav-item nav-warm nav-btn"
                                onClick={toggleLanguage}
                                title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                            >
                                <Globe size={19} />
                                <span>{language === 'es' ? 'Idioma · EN' : 'Language · ES'}</span>
                            </button>
                            <button className="nav-item nav-warm nav-btn" onClick={logout}>
                                <LogOut size={19} />
                                <span>{language === 'es' ? 'Salir' : 'Logout'}</span>
                            </button>
                        </div>
                    </>,
                    document.body
                )}

                <button
                    className={`sidebar-user-card${userMenuOpen ? ' open' : ''}`}
                    onClick={() => setUserMenuOpen((o) => !o)}
                    title={`@${user?.username || ''}`}
                >
                    <div className="sidebar-user-avatar">
                        {user?.profile_image
                            ? <img src={user.profile_image} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : <span>{initials}</span>
                        }
                    </div>
                    <div className="sidebar-user-meta">
                        <strong>{user?.username || ''}</strong>
                        <span>{hours} hrs</span>
                    </div>
                    <ChevronUp size={16} className="user-card-chevron" />
                </button>
            </div>
        </nav>
    );
};

export default Sidebar;
