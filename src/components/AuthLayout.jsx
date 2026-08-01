import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';

// El logo 3D arrastra three.js (~170 KB), así que se carga aparte: mientras
// llega se ve el logo PNG de siempre, y el login no se retrasa por él.
const Logo3D = lazy(() => import('./Logo3D'));

// Marco común de las pantallas de acceso (login, registro, verificar, recuperar):
// formulario centrado a pantalla completa, con el logo arriba.
const AuthLayout = ({ children, legal = true }) => {
    const hideBroken = (e) => { e.target.style.visibility = 'hidden'; };

    return (
        <div className="auth-container">
            <main className="auth-panel">
                <div className="auth-form-wrap">
                    <Suspense fallback={<img src="/logo.png" alt="Lumbres" className="auth-logo" onError={hideBroken} />}>
                        <Logo3D />
                    </Suspense>
                    {children}
                    {legal && (
                        <div className="auth-legal">
                            <Link to="/aviso-legal">Aviso Legal</Link>
                            <span>·</span>
                            <Link to="/privacidad">Privacidad</Link>
                            <span>·</span>
                            <Link to="/terminos">Términos</Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AuthLayout;
