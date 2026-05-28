import { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, BarChart3, Library, Globe, LogOut, Settings, Users, Clock, CreditCard, Headphones, MessagesSquare, Feather } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth } from '../config';
import './Sidebar.css';

const Sidebar = () => {
    const { t, language, toggleLanguage } = useContext(LanguageContext);
    const { logout, user, isAuthenticated } = useContext(AuthContext);
    const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : '?';
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) return;
        let active = true;
        const fetchUnread = async () => {
            try {
                const res = await fetch(`${API_URL}/api/mensajes/no-leidos`, withAuth());
                if (res.ok && active) {
                    const data = await res.json();
                    setUnread(data.total || 0);
                }
            } catch (err) { /* silencio */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 15000);
        return () => { active = false; clearInterval(interval); };
    }, [isAuthenticated]);

    return (
        <nav className="sidebar glass-panel">
            <div className="sidebar-header">
                <div className="logo-container">
                    <img
                        src="/logo.png"
                        alt="Códice"
                        className="logo-img"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                    />
                    <div className="logo-fallback" style={{ display: 'none' }}>
                        <BookOpen size={28} />
                        <h1>Códice</h1>
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
                <li>
                    <NavLink to="/statistics" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <BarChart3 size={20} />
                        <span>{t('statistics')}</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/podcasts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Headphones size={20} />
                        <span>Podcasts</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/community" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Users size={20} />
                        <span>Comunidad</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/mensajes" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <MessagesSquare size={20} />
                        <span>Mensajes</span>
                        {unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/taller" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Feather size={20} />
                        <span>Taller de novela</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/subscriptions" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <CreditCard size={20} />
                        <span>Suscripciones</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Settings size={20} />
                        <span>Ajustes</span>
                    </NavLink>
                </li>
            </ul>

            <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
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
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
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
