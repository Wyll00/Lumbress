import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { API_URL, withAuth } from '../config';
import { Camera, User, Mail, Phone, Lock, Eye, EyeOff, Save, CheckCircle, XCircle, Clock, Bell, Share2, Copy } from 'lucide-react';
import './Settings.css';

const API = `${API_URL}/api/users`;

const Settings = () => {
    const { user, isAuthenticated, refreshUser } = useContext(AuthContext);
    const { permission, supported: notifSupported, enableNotifications } = useContext(NotificationContext);
    const [copied, setCopied] = useState(false);
    const [sharing, setSharing] = useState(false);
    const shelfUrl = `${window.location.origin}/u/${encodeURIComponent(user?.username || '')}`;

    const copyShelfLink = () => {
        navigator.clipboard?.writeText(shelfUrl)
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
            .catch(() => {});
    };

    const toggleShelf = async (enabled) => {
        setSharing(true);
        try {
            const res = await fetch(`${API_URL}/api/users/me/public-shelf`, withAuth({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
            }));
            if (res.ok) await refreshUser();
        } catch { /* noop */ }
        finally { setSharing(false); }
    };

    // --- Profile state ---
    const [profile, setProfile] = useState({ username: '', email: '', phone: '', profile_image: '', reading_hours: 0 });
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState(null); // { type: 'success'|'error', text }

    // --- Password state ---
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [passMsg, setPassMsg] = useState(null);

    // --- Reading Hours state ---
    const [hoursToAdd, setHoursToAdd] = useState('');
    const [savingHours, setSavingHours] = useState(false);
    const [hoursMsg, setHoursMsg] = useState(null);

    const fileInputRef = useRef(null);

    // Fetch user profile on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API}/me`, withAuth());
                if (res.ok) {
                    const data = await res.json();
                    setProfile({
                        username: data.username || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        profile_image: data.profile_image || '',
                        reading_hours: data.reading_hours || 0
                    });
                }
            } catch (err) {
                console.error('Error loading profile', err);
            } finally {
                setLoadingProfile(false);
            }
        };
        fetchProfile();
    }, [isAuthenticated]);

    // Handle avatar image pick
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfile(prev => ({ ...prev, profile_image: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    // Save profile info
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            const res = await fetch(`${API}/me`, withAuth({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            }));
            const data = await res.json();
            if (res.ok) {
                await refreshUser();
                setProfileMsg({ type: 'success', text: '✅ Perfil actualizado correctamente.' });
            } else {
                setProfileMsg({ type: 'error', text: data.message || 'Error al guardar el perfil.' });
            }
        } catch {
            setProfileMsg({ type: 'error', text: 'Error de conexión.' });
        } finally {
            setSavingProfile(false);
            setTimeout(() => setProfileMsg(null), 4000);
        }
    };

    // Save password
    const handleSavePassword = async (e) => {
        e.preventDefault();
        setPassMsg(null);
        if (passwords.newPassword !== passwords.confirmPassword) {
            setPassMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
            return;
        }
        if (passwords.newPassword.length < 8) {
            setPassMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
            return;
        }
        setSavingPass(true);
        try {
            const res = await fetch(`${API}/me/password`, withAuth({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
            }));
            const data = await res.json();
            if (res.ok) {
                setPassMsg({ type: 'success', text: '✅ Contraseña cambiada correctamente.' });
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPassMsg({ type: 'error', text: data.message || 'Error al cambiar la contraseña.' });
            }
        } catch {
            setPassMsg({ type: 'error', text: 'Error de conexión.' });
        } finally {
            setSavingPass(false);
            setTimeout(() => setPassMsg(null), 5000);
        }
    };

    // Save hours
    const handleSaveHours = async (e) => {
        e.preventDefault();
        const numHours = parseInt(hoursToAdd, 10);
        if (isNaN(numHours) || numHours <= 0) {
            setHoursMsg({ type: 'error', text: 'Introduce un número válido mayor a 0.' });
            return;
        }
        if (numHours > 168) {
            setHoursMsg({ type: 'error', text: 'No puedes añadir más de 168 horas de golpe (una semana completa).' });
            return;
        }
        setSavingHours(true);
        setHoursMsg(null);
        try {
            const res = await fetch(`${API}/me/reading-hours`, withAuth({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hoursToAdd: numHours })
            }));
            const data = await res.json();
            if (res.ok) {
                setProfile(prev => ({ ...prev, reading_hours: data.user.reading_hours }));
                await refreshUser();
                setHoursMsg({ type: 'success', text: '✅ Horas añadidas correctamente.' });
                setHoursToAdd('');
            } else {
                setHoursMsg({ type: 'error', text: data.message || 'Error al añadir horas.' });
            }
        } catch {
            setHoursMsg({ type: 'error', text: 'Error de conexión.' });
        } finally {
            setSavingHours(false);
            setTimeout(() => setHoursMsg(null), 4000);
        }
    };

    const initials = profile.username ? profile.username.substring(0, 2).toUpperCase() : '??';

    return (
        <div className="settings-page animate-fade-in">
            <header className="page-header">
                <h1>⚙️ Ajustes de Cuenta</h1>
                <p>Gestiona tu información personal y seguridad</p>
            </header>

            <div className="settings-grid">
                {/* ── LEFT: Avatar + info ── */}
                <section className="settings-card glass-panel settings-profile-section">
                    <h2>Foto de perfil</h2>
                    <div className="avatar-wrapper">
                        <div className="avatar-circle">
                            {profile.profile_image
                                ? <img src={profile.profile_image} alt="Avatar" className="avatar-img" />
                                : <span className="avatar-initials">{initials}</span>
                            }
                            <div className="avatar-overlay">drop image</div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                            id="avatar-upload"
                        />
                        <button className="avatar-change-btn" onClick={() => fileInputRef.current?.click()}>
                            Cambiar foto
                        </button>

                        <div className="avatar-user-info">
                            <p className="avatar-username">@{profile.username || '...'}</p>
                            <div className="reading-hours-badge">
                                <Clock size={14} />
                                <span>{profile.reading_hours} horas leídas</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── RIGHT: Personal Info ── */}
                    {/* Profile form */}
                    <section className="settings-card glass-panel">
                        <h2>Información personal</h2>
                        {loadingProfile ? (
                            <p className="settings-loading">Cargando datos...</p>
                        ) : (
                            <form onSubmit={handleSaveProfile} className="settings-form">
                                <div className="personal-info-grid">
                                    <div className="settings-field">
                                        <label htmlFor="s-username">NOMBRE DE USUARIO</label>
                                        <input
                                            id="s-username"
                                            type="text"
                                            value={profile.username}
                                            onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                                            placeholder="Tu nombre de usuario"
                                            autoComplete="username"
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label htmlFor="s-email">CORREO ELECTRÓNICO</label>
                                        <input
                                            id="s-email"
                                            type="email"
                                            value={profile.email}
                                            onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                                            placeholder="tu@email.com"
                                            autoComplete="email"
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label htmlFor="s-phone">TELÉFONO</label>
                                        <input
                                            id="s-phone"
                                            type="tel"
                                            value={profile.phone}
                                            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                            placeholder="+34 600 000 000"
                                            autoComplete="tel"
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label htmlFor="s-lang">IDIOMA</label>
                                        <select id="s-lang" className="settings-select" defaultValue="es">
                                            <option value="es">Español (ES)</option>
                                            <option value="en">English (US)</option>
                                        </select>
                                    </div>
                                </div>

                                {profileMsg && (
                                    <div className={`settings-alert ${profileMsg.type}`}>
                                        {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                        {profileMsg.text}
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => {}}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn-primary settings-save-btn" disabled={savingProfile}>
                                        {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>

                    {/* Reading Hours form */}
                    <section className="settings-card glass-panel">
                        <h2><Clock size={18} /> Horas de Lectura</h2>
                        <div style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
                            Total de horas actuales: <strong style={{ color: 'var(--accent-color)', fontSize: '1.2rem' }}>{profile.reading_hours} hrs</strong>
                        </div>
                        <form onSubmit={handleSaveHours} className="settings-form">
                            <div className="settings-field">
                                <label htmlFor="s-hours">Añadir nuevas horas</label>
                                <input
                                    id="s-hours"
                                    type="number"
                                    min="1"
                                    value={hoursToAdd}
                                    onChange={e => setHoursToAdd(e.target.value)}
                                    placeholder="Ej. 2"
                                />
                            </div>

                            {hoursMsg && (
                                <div className={`settings-alert ${hoursMsg.type}`}>
                                    {hoursMsg.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                    {hoursMsg.text}
                                </div>
                            )}

                            <button type="submit" className="btn-primary settings-save-btn" disabled={savingHours}>
                                <Save size={16} />
                                {savingHours ? 'Añadiendo...' : 'Añadir horas'}
                            </button>
                        </form>
                    </section>

                    {/* Notifications */}
                    <section className="settings-card glass-panel">
                        <h2><Bell size={18} /> Notificaciones</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                            Recibe un aviso del navegador cuando te lleguen mensajes nuevos, aunque tengas Lumbres en segundo plano o en otra pestaña.
                        </p>
                        {!notifSupported ? (
                            <div className="settings-alert error">
                                <XCircle size={16} /> Tu navegador no admite notificaciones.
                            </div>
                        ) : permission === 'granted' ? (
                            <div className="settings-alert success">
                                <CheckCircle size={16} /> Notificaciones activadas.
                            </div>
                        ) : permission === 'denied' ? (
                            <div className="settings-alert error">
                                <XCircle size={16} /> Notificaciones bloqueadas. Habilítalas desde los ajustes del navegador (icono junto a la barra de direcciones).
                            </div>
                        ) : (
                            <button type="button" className="btn-primary settings-save-btn" onClick={enableNotifications}>
                                <Bell size={16} /> Activar notificaciones
                            </button>
                        )}
                    </section>

                    {/* Estantería pública */}
                    <section className="settings-card glass-panel">
                        <h2><Share2 size={18} /> Estantería pública</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                            Comparte tu biblioteca con un enlace público. Solo se muestran tu nombre, avatar y libros (con valoraciones) — nunca tu email, teléfono ni mensajes.
                        </p>
                        {user?.public_shelf ? (
                            <>
                                <div className="settings-alert success">
                                    <CheckCircle size={16} /> Tu estantería es pública.
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                                    <input
                                        readOnly
                                        value={shelfUrl}
                                        onFocus={(e) => e.target.select()}
                                        style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(224,169,59,0.3)', background: 'rgba(0,0,0,0.25)', color: 'var(--text-primary)' }}
                                    />
                                    <button type="button" className="btn-secondary" onClick={copyShelfLink}>
                                        <Copy size={15} /> {copied ? '¡Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                                    <a href={shelfUrl} target="_blank" rel="noreferrer" className="btn-secondary">Ver mi estantería</a>
                                    <button type="button" className="action-btn-inline delete-btn" style={{ width: 'auto', height: 'auto', padding: '8px 14px' }} onClick={() => toggleShelf(false)} disabled={sharing}>
                                        Hacerla privada
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button type="button" className="btn-primary settings-save-btn" onClick={() => toggleShelf(true)} disabled={sharing}>
                                <Share2 size={16} /> Hacer mi estantería pública
                            </button>
                        )}
                    </section>

                    {/* Password form */}
                    <section className="settings-card glass-panel">
                        <h2><Lock size={18} /> Cambiar Contraseña</h2>
                        <form onSubmit={handleSavePassword} className="settings-form">
                            <div className="settings-field">
                                <label htmlFor="s-current-pass">Contraseña actual</label>
                                <div className="password-input-wrapper">
                                    <input
                                        id="s-current-pass"
                                        type={showCurrent ? 'text' : 'password'}
                                        value={passwords.currentPassword}
                                        onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
                                        placeholder="Contraseña actual"
                                        autoComplete="current-password"
                                    />
                                    <button type="button" className="toggle-pass-btn" onClick={() => setShowCurrent(v => !v)}>
                                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="settings-field">
                                <label htmlFor="s-new-pass">Nueva contraseña</label>
                                <div className="password-input-wrapper">
                                    <input
                                        id="s-new-pass"
                                        type={showNew ? 'text' : 'password'}
                                        value={passwords.newPassword}
                                        onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                                        placeholder="Mínimo 8 caracteres"
                                        autoComplete="new-password"
                                    />
                                    <button type="button" className="toggle-pass-btn" onClick={() => setShowNew(v => !v)}>
                                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="settings-field">
                                <label htmlFor="s-confirm-pass">Confirmar nueva contraseña</label>
                                <div className="password-input-wrapper">
                                    <input
                                        id="s-confirm-pass"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={passwords.confirmPassword}
                                        onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                                        placeholder="Repite la nueva contraseña"
                                        autoComplete="new-password"
                                    />
                                    <button type="button" className="toggle-pass-btn" onClick={() => setShowConfirm(v => !v)}>
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Password strength indicator */}
                            {passwords.newPassword && (
                                <div className="password-strength">
                                    <div className={`strength-bar ${
                                        passwords.newPassword.length >= 12 ? 'strong' :
                                        passwords.newPassword.length >= 8 ? 'medium' : 'weak'
                                    }`} />
                                    <span>
                                        {passwords.newPassword.length >= 12 ? '💪 Fuerte' :
                                         passwords.newPassword.length >= 8 ? '🟡 Media' : '🔴 Débil'}
                                    </span>
                                </div>
                            )}

                            {passMsg && (
                                <div className={`settings-alert ${passMsg.type}`}>
                                    {passMsg.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                    {passMsg.text}
                                </div>
                            )}

                            <button type="submit" className="btn-primary settings-save-btn" disabled={savingPass}>
                                <Lock size={16} />
                                {savingPass ? 'Cambiando...' : 'Cambiar contraseña'}
                            </button>
                        </form>
                    </section>
            </div>
        </div>
    );
};

export default Settings;
