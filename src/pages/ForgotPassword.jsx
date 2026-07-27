import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, MailCheck, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth } from '../config';
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
        <div className="auth-container">
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    {step === 'done'
                        ? <ShieldCheck size={52} color="var(--accent-color)" />
                        : step === 'reset'
                            ? <MailCheck size={52} color="var(--accent-color)" />
                            : <KeyRound size={52} color="var(--accent-color)" />}
                    <h1>{step === 'done' ? t('forgotDoneTitle') : t('forgotTitle')}</h1>
                    <p>{step === 'done' ? t('forgotDoneSub') : step === 'reset' ? t('forgotResetSub') : t('forgotSub')}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}
                {info && (
                    <div className="auth-error" style={{ background: 'rgba(46,204,113,0.1)', color: '#2ecc71', borderColor: 'rgba(46,204,113,0.25)' }}>
                        {info}
                    </div>
                )}

                {step === 'request' && (
                    <form onSubmit={handleRequest} className="auth-form">
                        <div className="form-group">
                            <label>{t('forgotEmailLabel')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="primary-btn auth-submit" disabled={loading}>
                            {loading ? t('forgotSending') : t('forgotSendBtn')}
                        </button>
                    </form>
                )}

                {step === 'reset' && (
                    <form onSubmit={handleReset} className="auth-form">
                        <div className="form-group">
                            <label>{t('forgotCodeLabel')}</label>
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
                        <div className="form-group">
                            <label>{t('forgotNewPassword')}</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="primary-btn auth-submit" disabled={loading || code.length < 6 || password.length < 8}>
                            {loading ? t('forgotResetting') : t('forgotResetBtn')}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    {step === 'reset' && (
                        <p>
                            <button
                                type="button"
                                onClick={() => { setStep('request'); setCode(''); setPassword(''); setError(''); setInfo(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                            >
                                {t('forgotResend')}
                            </button>
                        </p>
                    )}
                    <p style={{ marginTop: 8 }}><Link to="/login">{t('forgotBackToLogin')}</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
