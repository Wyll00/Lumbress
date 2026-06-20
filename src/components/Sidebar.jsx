import { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, BarChart3, Library, Globe, LogOut, Settings, Users, Clock, CreditCard, Headphones, MessagesSquare, Feather, ShieldCheck, MoreHorizontal, Compass } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import './Sidebar.css';

const Sidebar = () => {
    const { t, language, toggleLanguage } = useContext(LanguageContext);
    const { logout, user } = useContext(AuthContext);
    const { unreadTotal } = useContext(NotificationContext);
    const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : '?';
    // Móvil: la barra inferior muestra 4 ítems esenciales + "Más" (el resto en un panel)
    const [moreOpen, setMoreOpen] = useState(false);
    const closeMore = () => setMoreOpen(false);

    return (
        <nav className="sidebar glass-panel">
            <div className="sidebar-header">
                <div className="logo-container">
                    <img
                        src="/logo.png"
                        alt="Lumbres"
                        className="logo-img"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                    />
                    <div className="logo-fallback" style={{ display: 'none' }}>
                        <BookOpen size={28} />
                        <h1>Lumbres</h1>
                    </div>
                </div>
            </div>

            <ul className="nav-links">
                <li>
                    <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <LayoutDashboard size={20} />
                        <span>{t('dashboard')}</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/library" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Library size={20} />
                        <span>{t('myLibrary')}</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/catalogo" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Compass size={20} />
                        <span>{language === 'es' ? 'Explorar' : 'Explore'}</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/statistics" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <BarChart3 size={20} />
                        <span>{t('statistics')}</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/podcasts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Headphones size={20} />
                        <span>Podcasts</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/community" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Users size={20} />
                        <span>{t('community')}</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/mensajes" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <MessagesSquare size={20} />
                        <span>{t('messages')}</span>
                        {unreadTotal > 0 && <span className="nav-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/taller" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Feather size={20} />
                        <span>{t('workshop')}</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/subscriptions" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <CreditCard size={20} />
                        <span>{t('subscriptionsNav')}</span>
                    </NavLink>
                </li>
                <li className="nav-extra">
                    <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Settings size={20} />
                        <span>{t('settingsNav')}</span>
                    </NavLink>
                </li>
                {!!user?.is_admin && (
                    <li className="nav-extra">
                        <NavLink to="/admin" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <ShieldCheck size={20} />
                            <span>Admin</span>
                        </NavLink>
                    </li>
                )}
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
                        <NavLink to="/podcasts" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Headphones size={19} /><span>Podcasts</span>
                        </NavLink>
                        <NavLink to="/taller" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Feather size={19} /><span>{t('workshop')}</span>
                        </NavLink>
                        <NavLink to="/subscriptions" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <CreditCard size={19} /><span>{t('subscriptionsNav')}</span>
                        </NavLink>
                        <NavLink to="/settings" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                            <Settings size={19} /><span>{t('settingsNav')}</span>
                        </NavLink>
                        {!!user?.is_admin && (
                            <NavLink to="/admin" onClick={closeMore} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                                <ShieldCheck size={19} /><span>Admin</span>
                            </NavLink>
                        )}
                        <div className="mobile-more-footer">
                            <NavLink to="/settings" onClick={closeMore} className="sidebar-user-avatar" title={`@${user?.username || ''}`}>
                                {user?.profile_image
                                    ? <img src={user.profile_image} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    : <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-color)' }}>{initials}</span>}
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

            <div className="sidebar-footer">
                {/* User mini-avatar */}
                <NavLink to="/settings" style={{ textDecoration: 'none' }}>
                    <div className="sidebar-user-avatar" title={`@${user?.username || ''}`}>
                        {user?.profile_image
                            ? <img src={user.profile_image} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-color)' }}>{initials}</span>
                        }
                    </div>
                </NavLink>
                {/* Reading Hours Counter */}
                <div className="sidebar-reading-hours" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }} title="Horas leídas en total">
                    <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                    <span>{user?.reading_hours || 0} hrs</span>
                </div>
                <button
                    onClick={toggleLanguage}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                    title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                >
                    <Globe size={16} />
                    {language === 'es' ? 'EN' : 'ES'}
                </button>
                <button
                    onClick={logout}
                    className="action-btn-inline delete-btn"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.8rem', width: 'auto', height: 'auto' }}
                    title={language === 'es' ? 'Cerrar Sesión' : 'Logout'}
                >
                    <LogOut size={16} />
                    {language === 'es' ? 'Salir' : 'Logout'}
                </button>
                <p>{t('appVersion')}</p>
            </div>
        </nav>
    );
};

export default Sidebar;
