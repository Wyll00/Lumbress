import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth } from '../config';
import AuthLayout from '../components/AuthLayout';
import './AuthForm.css';

// Recuperación de contraseña en dos pasos: pedir el código al correo y luego
// canjearlo por una contraseña nueva. El backend nunca dice si la cuenta existe.
const ForgotPassword = () => {
    const { t } = useContext(LanguageContext);

    const [step, setStep] = useState('request'); // 'request' | 'reset' | 'done'
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRequest = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            }));
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t('forgotError'));
            setInfo(t('forgotSent'));
            setStep('reset');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), code: code.trim(), password }),
            }));
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t('forgotError'));
            setStep('done');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-header">
                <h1>{step === 'done' ? t('forgotDoneTitle') : t('forgotTitle')}</h1>
                <p>{step === 'done' ? t('forgotDoneSub') : step === 'reset' ? t('forgotResetSub') : t('forgotSub')}</p>
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

            {step === 'request' && (
                <form onSubmit={handleRequest} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="forgot-email">{t('forgotEmailLabel')}</label>
                        <input
                            id="forgot-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? t('forgotSending') : t('forgotSendBtn')}
                    </button>
                </form>
            )}

            {step === 'reset' && (
                <form onSubmit={handleReset} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="forgot-code">{t('forgotCodeLabel')}</label>
                        <input
                            id="forgot-code"
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
                    <div className="form-group">
                        <label htmlFor="forgot-newpass">{t('forgotNewPassword')}</label>
                        <div className="password-input-wrapper">
                            <input
                                id="forgot-newpass"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? t('authHidePassword') : t('authShowPassword')}
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="auth-submit" disabled={loading || code.length < 6 || password.length < 8}>
                        {loading ? t('forgotResetting') : t('forgotResetBtn')}
                    </button>
                </form>
            )}

            <div className="auth-footer">
                {step === 'reset' && (
                    <button
                        type="button"
                        className="auth-link-btn muted"
                        onClick={() => { setStep('request'); setCode(''); setPassword(''); setError(''); setInfo(''); }}
                    >
                        {t('forgotResend')}
                    </button>
                )}
                <Link to="/login">{t('forgotBackToLogin')}</Link>
            </div>
        </AuthLayout>
    );
};

export default ForgotPassword;
