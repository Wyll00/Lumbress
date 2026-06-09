import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// Panel de bloqueo para funciones Premium (estadísticas, objetivos…), con CTA a /subscriptions.
const PremiumGate = ({ title = 'Función Premium', text = 'Desbloquea esta función con Códice Premium.', compact = false }) => (
    <div
        className="glass-panel"
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '12px', textAlign: 'center',
            padding: compact ? '24px 18px' : '60px 24px',
        }}
    >
        <div style={{
            width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(224, 169, 59, 0.12)', border: '1px solid rgba(224, 169, 59, 0.35)',
            color: 'var(--accent-color, #e0a93b)',
        }}>
            <Lock size={22} />
        </div>
        <h3 style={{ margin: 0, color: 'var(--text)' }}>{title}</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420, fontSize: '0.9rem' }}>{text}</p>
        <Link to="/subscriptions" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <Sparkles size={16} /> Pásate a Premium
        </Link>
    </div>
);

export default PremiumGate;
