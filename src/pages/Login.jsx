import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { API_URL, withAuth } from '../config';
import { BookMarked, Eye, EyeOff } from 'lucide-react';
import './AuthForm.css';

const Login = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { t } = useContext(LanguageContext);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const cardRef = useRef(null);

    useEffect(() => {
        if (!cardRef.current) return;
        const ctx = gsap.context(() => {
            const dropDistance = -(window.innerHeight + 200);
            const tl = gsap.timeline();

            // 1) Card cae con gravedad y rebota al aterrizar
            tl.from('.auth-card', {
                y: dropDistance,
                rotation: -6,
                duration: 1.1,
                ease: 'bounce.out',
            })
            // 2) Impacto al aterrizar — squash & stretch
            .to('.auth-card', {
                scaleX: 1.04, scaleY: 0.96,
                duration: 0.12, ease: 'power2.out',
                yoyo: true, repeat: 1,
            }, '-=0.05')
            // 3) Logo entra "rebotando" desde dentro de la card
            .from('.auth-header .auth-logo, .auth-header svg', {
                scale: 0,
                duration: 0.6, ease: 'back.out(2.2)',
            }, '-=0.2')
            // 4) Título y subtítulo aparecen
            .from('.auth-header h1, .auth-header p', {
                opacity: 0, y: 16,
                stagger: 0.08, duration: 0.4, ease: 'power3.out',
            }, '-=0.3')
            // 5) Inputs y botón aparecen en cascada
            .from('.form-group, .auth-submit, .auth-footer', {
                opacity: 0, y: 14,
                stagger: 0.07, duration: 0.35, ease: 'power3.out',
            }, '-=0.2');
        }, cardRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (error && cardRef.current) {
            gsap.fromTo('.auth-error',
                { opacity: 0, x: -8 },
                { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out',
                  onComplete: () => gsap.fromTo('.auth-card', { x: 0 }, { x: 0, keyframes: { x: [0, -8, 8, -6, 6, 0] }, duration: 0.4 })
                }
            );
        }
    }, [error]);

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
                throw new Error(data.message || t('authLoginError'));
            }

            login(data.user);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container" ref={cardRef}>
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    <img
                        src="/logo.png"
                        alt="Lumbres"
                        className="auth-logo"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}
                    />
                    <BookMarked size={48} color="var(--accent-color)" style={{ display: 'none' }} />
                    <h1>{t('authWelcome')}</h1>
                    <p>{t('authLoginSub')}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>{t('authEmail')}</label>
                        <input
                            type="email"
                            name="email"
                            value={credentials.email}
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
                                value={credentials.password}
                                onChange={handleChange}
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
                    <button type="submit" className="primary-btn auth-submit" disabled={isLoading}>
                        {isLoading ? t('authLoggingIn') : t('authLoginBtn')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>{t('authNoAccount')} <Link to="/register">{t('authRegisterLink')}</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
