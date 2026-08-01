import { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Check } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth, saveToken } from '../config';
import AuthLayout from '../components/AuthLayout';
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
        <AuthLayout>
            <div className="auth-header">
                <h1>{t('verifyTitle')}</h1>
                <p>{t('verifySub')}</p>
            </div>

            {error && (
                <div className="auth-error">
                    <AlertCircle size={19} style={{ flex: 'none', marginTop: 1 }} />
                    <span>{error}</span>
                </div>
            )}
            {info && (
                <div className="auth-note">
                    <Check size={19} style={{ flex: 'none', marginTop: 1 }} />
                    <span>{info}</span>
                </div>
            )}

            <form onSubmit={handleVerify} className="auth-form">
                {!location.state?.email && (
                    <div className="form-group">
                        <label htmlFor="verify-email">{t('verifyEmailLabel')}</label>
                        <input
                            id="verify-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                )}
                <div className="form-group">
                    <label htmlFor="verify-code">{t('verifyCodeLabel')}</label>
                    <input
                        id="verify-code"
                        className="auth-code-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="______"
                        required
                        autoFocus
                    />
                </div>
                <button type="submit" className="auth-submit" disabled={loading || code.length < 6}>
                    <ShieldCheck size={18} />
                    {loading ? t('verifyVerifying') : t('verifyBtn')}
                </button>
            </form>

            <div className="auth-footer">
                <button type="button" className="auth-link-btn muted" onClick={handleResend} disabled={resending}>
                    {resending ? '…' : t('verifyResend')}
                </button>
                <Link to="/login">{t('verifyBackToLogin')}</Link>
            </div>
        </AuthLayout>
    );
};

export default VerifyEmail;
