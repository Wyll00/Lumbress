import { Link } from 'react-router-dom';

// Marco común de las pantallas de acceso (login, registro, verificar, recuperar):
// formulario centrado a pantalla completa, con el logotipo arriba.
//
// El logotipo es la marca apaisada (libro + "Lumbres"), 360x70. Sustituye al
// logo 3D de three.js: quitarlo de aquí deja también fuera del paquete final
// esos ~137 KB, porque ya nadie importa ese componente.
const AuthLayout = ({ children, legal = true }) => {
    const hideBroken = (e) => { e.target.style.visibility = 'hidden'; };

    return (
        <div className="auth-container">
            <main className="auth-panel">
                <div className="auth-form-wrap">
                    <img
                        src="/lumbres/logo-transparente.webp"
                        alt="Lumbres"
                        className="auth-logo"
                        width="360"
                        height="70"
                        onError={hideBroken}
                    />
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
