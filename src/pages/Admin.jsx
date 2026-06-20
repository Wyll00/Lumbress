import { useContext, useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Users, BookOpen, FileText, MessagesSquare, Store, CreditCard, Highlighter, HardDrive, RefreshCw, BadgeCheck, MailWarning, Globe, Activity, Eye, Bug, AlertTriangle, Check } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AuthContext } from '../context/AuthContext';
import { API_URL, withAuth } from '../config';

// Panel de administración — solo visible para usuarios con is_admin.
const fmtBytes = (b) => {
    if (!b) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};

// Código ISO de país → emoji de bandera (🇪🇸). Sin código → globo.
const flag = (cc) => (cc ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65)) : '🌐');
const fmtDia = (iso) => { try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); } catch { return iso; } };

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
    const [traffic, setTraffic] = useState(null);
    const [errors, setErrors] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, u, t, e] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats`, withAuth()),
                fetch(`${API_URL}/api/admin/users`, withAuth()),
                fetch(`${API_URL}/api/admin/traffic`, withAuth()),
                fetch(`${API_URL}/api/admin/errors`, withAuth()),
            ]);
            if (s.ok) setStats(await s.json());
            if (u.ok) setUsers(await u.json());
            if (t.ok) setTraffic(await t.json());
            if (e.ok) setErrors(await e.json());
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    const resolveError = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/errors/${id}/resolve`, withAuth({ method: 'POST' }));
            if (res.ok) setErrors((prev) => prev && {
                ...prev,
                sinResolver: Math.max(0, prev.sinResolver - 1),
                errores: prev.errores.map((er) => (er.id === id ? { ...er, resuelto: 1 } : er)),
            });
        } catch { /* noop */ }
    };

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
                    <StatCard icon={Users} label="Usuarios verificados" value={stats.usuarios} hint={stats.usuariosUltimos7d > 0 ? `+${stats.usuariosUltimos7d} esta semana` : null} />
                    <StatCard icon={MailWarning} label="Sin verificar" value={stats.usuariosSinVerificar} hint={stats.usuariosSinVerificar > 0 ? 'se borran en 24h' : null} />
                    <StatCard icon={CreditCard} label="Suscripciones activas" value={stats.suscripcionesActivas} />
                    <StatCard icon={BookOpen} label="Libros" value={stats.libros} hint={stats.librosConArchivo > 0 ? `${stats.librosConArchivo} con EPUB/PDF` : null} />
                    <StatCard icon={Highlighter} label="Subrayados" value={stats.subrayados} />
                    <StatCard icon={FileText} label="Posts en comunidad" value={stats.posts} />
                    <StatCard icon={Store} label="Anuncios marketplace" value={stats.anuncios} />
                    <StatCard icon={MessagesSquare} label="Mensajes de chat" value={stats.mensajes} />
                    <StatCard icon={HardDrive} label="Almacenamiento usado" value={fmtBytes(stats.almacenamientoBytes)} />
                </div>
            )}

            {errors && (
                <div style={{ margin: '0 0 26px' }}>
                    <h3 style={{ margin: '0 0 14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Bug size={18} style={{ color: 'var(--accent-color)' }} /> Errores
                        {errors.sinResolver > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: '#e0a93b', background: 'rgba(224,169,59,0.12)', border: '1px solid rgba(224,169,59,0.3)', borderRadius: 999, padding: '2px 10px' }}>
                                <AlertTriangle size={13} /> {errors.sinResolver} sin resolver
                            </span>
                        )}
                    </h3>
                    <div className="glass-panel" style={{ padding: '18px 20px' }}>
                        {errors.errores.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Sin errores registrados. 🎉</p>
                        ) : errors.errores.map((er) => (
                            <div key={er.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))', opacity: er.resuelto ? 0.5 : 1 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.88rem', fontWeight: 600, wordBreak: 'break-word' }}>{er.mensaje}</p>
                                        <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                                            {er.metodo} {er.ruta} · estado {er.status} · {er.veces}× · última: {new Date(er.ultima_vez).toLocaleString('es-ES')}
                                        </p>
                                        {er.stack && (
                                            <details style={{ marginTop: 6 }}>
                                                <summary style={{ cursor: 'pointer', color: 'var(--accent-color)', fontSize: '0.76rem' }}>Ver detalle técnico</summary>
                                                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '6px 0 0', maxHeight: 180, overflow: 'auto' }}>{er.stack}</pre>
                                            </details>
                                        )}
                                    </div>
                                    {er.resuelto ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--success-color, #4E6147)', fontSize: '0.78rem', flexShrink: 0 }}>
                                            <Check size={14} /> Resuelto
                                        </span>
                                    ) : (
                                        <button className="btn-secondary" onClick={() => resolveError(er.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', flexShrink: 0, fontSize: '0.8rem' }}>
                                            <Check size={14} /> Resolver
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {traffic && (
                <div style={{ margin: '0 0 26px' }}>
                    <h3 style={{ margin: '0 0 14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={18} style={{ color: 'var(--accent-color)' }} /> Tráfico
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                        <StatCard icon={Activity} label="Peticiones (hoy)" value={traffic.peticiones.hoy} hint={`${traffic.peticiones.total} en total`} />
                        <StatCard icon={Eye} label="Páginas vistas (hoy)" value={traffic.visitas.hoy} hint={traffic.visitas.semana > 0 ? `${traffic.visitas.semana} esta semana` : null} />
                        <StatCard icon={Users} label="Visitantes únicos (7d)" value={traffic.unicos.semana} hint={traffic.unicos.mes > 0 ? `${traffic.unicos.mes} en 30 días` : null} />
                        <StatCard icon={Globe} label="Países (30d)" value={traffic.porPais.length} />
                    </div>

                    <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: 14 }}>
                        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Actividad (últimos 14 días)</p>
                        <div style={{ width: '100%', height: 240 }}>
                            <ResponsiveContainer>
                                <LineChart data={traffic.porDia.map((d) => ({ ...d, dia: fmtDia(d.dia) }))} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} width={36} />
                                    <Tooltip contentStyle={{ background: '#1f1a14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: '0.8rem' }} />
                                    <Line type="monotone" dataKey="peticiones" name="Peticiones" stroke="#e0a93b" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="visitas" name="Páginas vistas" stroke="#4aa3df" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                        <div className="glass-panel" style={{ padding: '18px 20px' }}>
                            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Países (30 días)</p>
                            {traffic.porPais.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos todavía.</p>
                            ) : traffic.porPais.map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                                    <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{flag(p.codigo)}</span>
                                    <span style={{ flex: 1, minWidth: 0, color: 'var(--text)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pais}</span>
                                    <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                                        <div style={{ width: `${Math.round((p.total / (traffic.porPais[0]?.total || 1)) * 100)}%`, height: '100%', background: 'var(--accent-color)' }} />
                                    </div>
                                    <span style={{ width: 52, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.total}</span>
                                </div>
                            ))}
                        </div>

                        <div className="glass-panel" style={{ padding: '18px 20px' }}>
                            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Páginas más vistas (30 días)</p>
                            {traffic.topPaginas.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Aún no hay páginas vistas registradas.</p>
                            ) : traffic.topPaginas.map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.06))' }}>
                                    <span style={{ color: 'var(--text)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ruta}</span>
                                    <span style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{p.total}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                            {!!u.is_verified && <BadgeCheck size={14} style={{ color: 'var(--accent-color)' }} title="Cuenta verificada (sello)" />}
                                            {!u.email_verified && (
                                                <span title="Email sin verificar — se borra a las 24h" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#e0a93b', background: 'rgba(224,169,59,0.12)', border: '1px solid rgba(224,169,59,0.3)', borderRadius: 999, padding: '1px 7px' }}>
                                                    sin verificar
                                                </span>
                                            )}
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
