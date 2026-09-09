import { Link } from 'react-router-dom';

// Marco común de las pantallas de acceso (login, registro, verificar, recuperar):
// formulario centrado a pantalla completa, con el logotipo arriba.
//
// El logotipo va apilado: el libro animado arriba (WebP con 81 fotogramas, la
// pagina pasando) y el nombre debajo. Ambos recortados del logo original y con
// transparencia, para que no se vea un recuadro sobre el fondo de la pagina.
// Sustituye al logo 3D: al no importarse Logo3D, three.js sale del paquete.
const AuthLayout = ({ children, legal = true }) => {
    const hideBroken = (e) => { e.target.style.visibility = 'hidden'; };

    return (
        <div className="auth-container">
            <main className="auth-panel">
                <div className="auth-form-wrap">
                    <div className="auth-logo">
                        <img
                            className="auth-logo-libro"
                            src="/lumbres/libro-animado.webp"
                            alt=""
                            width="196"
                            height="166"
                            onError={hideBroken}
                        />
                        <img
                            className="auth-logo-nombre"
                            src="/lumbres/nombre.webp"
                            alt="Lumbres"
                            width="590"
                            height="130"
                            onError={hideBroken}
                        />
                    </div>
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
