import { useContext, useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Users, BookOpen, FileText, MessagesSquare, Store, CreditCard, Highlighter, HardDrive, RefreshCw, BadgeCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth } from '../config';

// Panel de administración — solo visible para usuarios con is_admin.
const fmtBytes = (b) => {
    if (!b) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};

// eslint-disable-next-line no-unused-vars -- `Icon` se usa como componente en JSX (patrón icono-por-prop)
const StatCard = ({ icon: Icon, label, value, hint }) => (
    <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(224, 169, 59, 0.12)', color: 'var(--accent-color, #e0a93b)',
        }}>
            <Icon size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                {value}
                {hint && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-color)', marginLeft: 8 }}>{hint}</span>}
            </p>
        </div>
    </div>
);

const Admin = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, u] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats`, withAuth()),
                fetch(`${API_URL}/api/admin/users`, withAuth()),
            ]);
            if (s.ok) setStats(await s.json());
            if (u.ok) setUsers(await u.json());
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (user && !user.is_admin) {
        return (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                <p>Esta sección es solo para administración.</p>
            </div>
        );
    }

    return (
        <div className="admin-page animate-fade-in">
            <header className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShieldCheck size={26} style={{ color: 'var(--accent-color)' }} /> Administración
                    </h1>
                    <p>El pulso de Lumbres: usuarios, contenido y suscripciones.</p>
                </div>
                <button className="btn-secondary" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}>
                    <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} /> Actualizar
                </button>
            </header>

            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, margin: '18px 0 26px' }}>
                    <StatCard icon={Users} label="Usuarios" value={stats.usuarios} hint={stats.usuariosUltimos7d > 0 ? `+${stats.usuariosUltimos7d} esta semana` : null} />
                    <StatCard icon={CreditCard} label="Suscripciones activas" value={stats.suscripcionesActivas} />
                    <StatCard icon={BookOpen} label="Libros" value={stats.libros} hint={stats.librosConArchivo > 0 ? `${stats.librosConArchivo} con EPUB/PDF` : null} />
                    <StatCard icon={Highlighter} label="Subrayados" value={stats.subrayados} />
                    <StatCard icon={FileText} label="Posts en comunidad" value={stats.posts} />
                    <StatCard icon={Store} label="Anuncios marketplace" value={stats.anuncios} />
                    <StatCard icon={MessagesSquare} label="Mensajes de chat" value={stats.mensajes} />
                    <StatCard icon={HardDrive} label="Almacenamiento usado" value={fmtBytes(stats.almacenamientoBytes)} />
                </div>
            )}

            <div className="glass-panel" style={{ padding: '20px 22px' }}>
                <h3 style={{ margin: '0 0 14px', color: 'var(--text)' }}>Usuarios registrados</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--accent-color)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.6 }}>
                                {['Usuario', 'Email', 'Plan', 'Libros', 'Almacenamiento', 'Registro'].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.1))' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td style={{ padding: '9px 10px', color: 'var(--text)', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            {u.username}
                                            {!!u.is_verified && <BadgeCheck size={14} style={{ color: 'var(--accent-color)' }} title="Verificado" />}
                                        </span>
                                    </td>
                                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))' }}>{u.email}</td>
                                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))' }}>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                                            background: u.plan === 'premium' ? 'rgba(224,169,59,0.15)' : 'rgba(255,255,255,0.06)',
                                            color: u.plan === 'premium' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                        }}>{u.plan === 'premium' ? 'Premium' : 'Free'}</span>
                                    </td>
                                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))' }}>{u.libros}</td>
                                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))' }}>{fmtBytes(Number(u.storage_bytes))}</td>
                                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))' }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && !loading && (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '18px 0 6px' }}>Sin usuarios todavía.</p>
                )}
            </div>
        </div>
    );
};

export default Admin;
