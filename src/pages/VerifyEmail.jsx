import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, MailCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth, saveToken } from '../config';
import './AuthForm.css';

// Pantalla de verificación por código (tras el registro o al intentar entrar sin verificar).
const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);

    const [email, setEmail] = useState(location.state?.email || '');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    // Si llegamos sin email (p. ej. recarga), volvemos al login
    useEffect(() => {
        if (!location.state?.email) {
            // permitimos escribir el correo a mano, pero avisamos
            setInfo('');
        }
    }, [location.state]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/verify-email`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), code: code.trim() }),
            }));
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo verificar.');
            saveToken(data.token);
            login(data.user);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email.trim()) { setError(t('verifyEmailLabel')); return; }
        setError(''); setInfo(''); setResending(true);
        try {
            await fetch(`${API_URL}/api/auth/resend-code`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            }));
            setInfo(t('verifyResent'));
        } catch {
            setError('Error de conexión.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    <MailCheck size={52} color="var(--accent-color)" />
                    <h1>{t('verifyTitle')}</h1>
                    <p>{t('verifySub')}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}
                {info && <div className="auth-error" style={{ background: 'rgba(46,204,113,0.1)', color: '#2ecc71', borderColor: 'rgba(46,204,113,0.25)' }}>{info}</div>}

                <form onSubmit={handleVerify} className="auth-form">
                    {!location.state?.email && (
                        <div className="form-group">
                            <label>{t('verifyEmailLabel')}</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                    )}
                    <div className="form-group">
                        <label>{t('verifyCodeLabel')}</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="______"
                            required
                            autoFocus
                            style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}
                        />
                    </div>
                    <button type="submit" className="primary-btn auth-submit" disabled={loading || code.length < 6}>
                        <ShieldCheck size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        {loading ? t('verifyVerifying') : t('verifyBtn')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        <button type="button" onClick={handleResend} disabled={resending}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                            {resending ? '…' : t('verifyResend')}
                        </button>
                    </p>
                    <p style={{ marginTop: 8 }}><Link to="/login">{t('verifyBackToLogin')}</Link></p>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
