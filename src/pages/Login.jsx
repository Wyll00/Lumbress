import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth, saveToken } from '../config';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import './AuthForm.css';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { t } = useContext(LanguageContext);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, withAuth({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            }));

            const data = await response.json();

            if (!response.ok) {
                // Cuenta sin verificar: llevar a la pantalla del código
                if (data.code === 'NEEDS_VERIFICATION') {
                    navigate('/verify', { state: { email: credentials.email } });
                    return;
                }
                throw new Error(data.message || t('authLoginError'));
            }

            saveToken(data.token); // app nativa: guarda el token de sesión
            login(data.user);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-header">
                <h1>{t('authWelcome')}</h1>
                <p>{t('authLoginSub')}</p>
            </div>

            {error && (
                <div className="auth-error">
                    <AlertCircle size={19} style={{ flex: 'none', marginTop: 1 }} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="login-email">{t('authEmail')}</label>
                    <input
                        id="login-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={credentials.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="login-password">{t('authPassword')}</label>
                    <div className="password-input-wrapper">
                        <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            autoComplete="current-password"
                            value={credentials.password}
                            onChange={handleChange}
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
                <button type="submit" className="auth-submit" disabled={isLoading}>
                    {isLoading ? t('authLoggingIn') : t('authLoginBtn')}
                </button>
            </form>

            <div className="auth-footer">
                <Link to="/recuperar" className="auth-link-btn muted">{t('authForgotLink')}</Link>
                <Link to="/register">{t('authRegisterLink')}</Link>
            </div>
        </AuthLayout>
    );
};

export default Login;
