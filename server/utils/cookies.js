const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_NAME = 'token';

const cookieOptions = () => ({
    httpOnly: true,
    secure: isProduction,
    // Frontend y API comparten dominio detrás de nginx: 'lax' protege contra CSRF
    // (con dominios separados haría falta 'none' + secure).
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
});

module.exports = { COOKIE_NAME, cookieOptions };
