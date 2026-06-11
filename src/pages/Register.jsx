import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookMarked, Eye, EyeOff } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth } from '../config';
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

            // Redirect to login after successful registration
            navigate('/login');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    <img
                        src="/logo.png"
                        alt="Lumbres"
                        className="auth-logo"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}
                    />
                    <BookMarked size={48} color="var(--accent-color)" style={{ display: 'none' }} />
                    <h1>{t('authCreateAccount')}</h1>
                    <p>{t('authRegisterSub')}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>{t('authUsername')}</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('authEmail')}</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('authPassword')}</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={6}
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
                    <div className="form-group">
                        <label>{t('authConfirmPassword')}</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                            <button 
                                type="button" 
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="primary-btn auth-submit" disabled={isLoading}>
                        {isLoading ? t('authRegistering') : t('authRegisterBtn')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>{t('authHaveAccount')} <Link to="/login">{t('authLoginLink')}</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
