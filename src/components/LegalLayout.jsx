import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Bloques reutilizables para las páginas legales (todos son componentes, así
// no chocan con la regla react-refresh/only-export-components).
export const Section = ({ children }) => (
    <h2 style={{ color: 'var(--text)', fontSize: '1.12rem', margin: '26px 0 8px' }}>{children}</h2>
);
export const Text = ({ children }) => (
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 10px' }}>{children}</p>
);
export const List = ({ children }) => (
    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 10px', paddingLeft: 22 }}>{children}</ul>
);

const LegalLayout = ({ title, updated, children }) => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 18px 60px' }}>
            <button
                className="btn-secondary"
                onClick={() => navigate(-1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', marginBottom: 18 }}
            >
                <ArrowLeft size={16} /> Volver
            </button>
            <div className="glass-panel" style={{ padding: '28px 30px' }}>
                <h1 style={{ color: 'var(--text)', fontSize: '1.6rem', margin: '0 0 4px' }}>{title}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 6px' }}>Última actualización: {updated}</p>
                {children}
            </div>
        </div>
    );
};

export default LegalLayout;
