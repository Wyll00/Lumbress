import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth } from '../config';
import AuthLayout from '../components/AuthLayout';
import './AuthForm.css';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { t } = useContext(LanguageContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError(t('authPasswordMismatch'));
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                })
            }));

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || t('authRegisterError'));
            }

            // Cuenta creada: ir a verificar con el código enviado al correo
            navigate('/verify', { state: { email: formData.email } });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-header">
                <h1>{t('authCreateAccount')}</h1>
                <p>{t('authRegisterSub')}</p>
            </div>

            {error && (
                <div className="auth-error">
                    <AlertCircle size={19} style={{ flex: 'none', marginTop: 1 }} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="reg-username">{t('authUsername')}</label>
                    <input
                        id="reg-username"
                        type="text"
                        name="username"
                        autoComplete="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reg-email">{t('authEmail')}</label>
                    <input
                        id="reg-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reg-password">{t('authPassword')}</label>
                    <div className="password-input-wrapper">
                        <input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={8}
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
                <div className="form-group">
                    <label htmlFor="reg-confirm">{t('authConfirmPassword')}</label>
                    <div className="password-input-wrapper">
                        <input
                            id="reg-confirm"
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            autoComplete="new-password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? t('authHidePassword') : t('authShowPassword')}
                            tabIndex="-1"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                <button type="submit" className="auth-submit" disabled={isLoading}>
                    {isLoading ? t('authRegistering') : t('authRegisterBtn')}
                </button>
                <p className="auth-consent">
                    Al registrarte aceptas los <Link to="/terminos">Términos y Condiciones</Link> y la{' '}
                    <Link to="/privacidad">Política de Privacidad</Link>. Consulta también el{' '}
                    <Link to="/aviso-legal">Aviso Legal</Link>.
                </p>
            </form>

            <div className="auth-footer">
                <p>{t('authHaveAccount')}</p>
                <Link to="/login">{t('authLoginLink')}</Link>
            </div>
        </AuthLayout>
    );
};

export default Register;
